"""Human-in-the-loop matching of Returns to their original Sale.

A Return is matched to the Sale it reverses (by invoice number on upload, or
manually here). Reports then count the return in the SALE's month, so an April
sale that is returned in May still nets out under April.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice
from services.excel_service import _month_key, _month_label

router = APIRouter()


def _brief(inv: Optional[Invoice]) -> Optional[dict]:
    if inv is None:
        return None
    mk = _month_key(inv.inv_date)
    return {
        "id": inv.id,
        "platform": inv.platform,
        "warehouse": inv.warehouse,
        "inv_no": inv.inv_no,
        "inv_date": inv.inv_date,
        "party_name": inv.party_name,
        "taxable_value": inv.taxable_value,
        "month": mk,
        "month_label": _month_label(mk),
    }


@router.get("/returns")
def list_returns(
    status: Optional[str] = None,   # "linked" | "unmatched" | None (all)
    db: Session = Depends(get_db),
):
    """Every return with its linked sale (if any) and the month it lands in."""
    returns = (
        db.query(Invoice)
        .filter(Invoice.transaction_type == "Return", Invoice.status == "processed")
        .order_by(Invoice.inv_no.asc(), Invoice.id)
        .all()
    )
    sale_ids = {r.linked_sale_id for r in returns if r.linked_sale_id}
    sales = {}
    if sale_ids:
        for s in db.query(Invoice).filter(Invoice.id.in_(sale_ids)).all():
            sales[s.id] = s

    out = []
    linked_n = unmatched_n = 0
    for r in returns:
        sale = sales.get(r.linked_sale_id) if r.linked_sale_id else None
        is_linked = sale is not None
        if is_linked:
            linked_n += 1
        else:
            unmatched_n += 1
        if status == "linked" and not is_linked:
            continue
        if status == "unmatched" and is_linked:
            continue
        ret = _brief(r)
        ret["status"] = "linked" if is_linked else "unmatched"
        ret["linked_sale"] = _brief(sale)
        # Effective month the return is counted in
        eff = _month_key(sale.inv_date) if sale else _month_key(r.inv_date)
        ret["effective_month"] = eff
        ret["effective_month_label"] = _month_label(eff)
        out.append(ret)

    return {
        "returns": out,
        "counts": {"linked": linked_n, "unmatched": unmatched_n, "total": len(returns)},
    }


@router.get("/returns/{return_id}/candidates")
def candidate_sales(
    return_id: int,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Sales that could be the original for this return (same platform),
    searchable by invoice number or party name."""
    ret = db.query(Invoice).filter(Invoice.id == return_id).first()
    if not ret or ret.transaction_type != "Return":
        raise HTTPException(status_code=404, detail="Return not found")

    query = db.query(Invoice).filter(
        Invoice.transaction_type == "Sale",
        Invoice.status == "processed",
    )
    if ret.platform:
        query = query.filter(Invoice.platform == ret.platform)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Invoice.inv_no.ilike(like) | Invoice.party_name.ilike(like))
    else:
        # No query: surface the most likely match — same invoice number text
        if ret.inv_no:
            like = f"%{ret.inv_no.strip()}%"
            query = query.filter(Invoice.inv_no.ilike(like))

    sales = query.order_by(Invoice.inv_no.asc(), Invoice.id).limit(25).all()
    return {"candidates": [_brief(s) for s in sales]}


class LinkBody(BaseModel):
    sale_id: int


@router.post("/returns/{return_id}/link")
def link_return(return_id: int, body: LinkBody, db: Session = Depends(get_db)):
    ret = db.query(Invoice).filter(Invoice.id == return_id).first()
    if not ret or ret.transaction_type != "Return":
        raise HTTPException(status_code=404, detail="Return not found")
    sale = db.query(Invoice).filter(Invoice.id == body.sale_id).first()
    if not sale or sale.transaction_type != "Sale":
        raise HTTPException(status_code=400, detail="Target is not a Sale")

    ret.linked_sale_id = sale.id
    # Netting model: keep the sale active so April shows sale + return
    if sale.cancelled:
        sale.cancelled = False
    db.commit()
    db.refresh(ret)
    eff = _month_key(sale.inv_date)
    return {
        "linked": True,
        "return": _brief(ret),
        "linked_sale": _brief(sale),
        "effective_month": eff,
        "effective_month_label": _month_label(eff),
    }


@router.post("/returns/{return_id}/unlink")
def unlink_return(return_id: int, db: Session = Depends(get_db)):
    ret = db.query(Invoice).filter(Invoice.id == return_id).first()
    if not ret or ret.transaction_type != "Return":
        raise HTTPException(status_code=404, detail="Return not found")
    ret.linked_sale_id = None
    db.commit()
    return {"unlinked": True, "return_id": return_id}


@router.post("/returns/migrate-uncancel")
def migrate_uncancel(db: Session = Depends(get_db)):
    """One-time historical fix: un-cancel any Sale that has a Return linked to
    it. Older uploads cancelled the sale when a return matched; the netting
    model keeps both rows instead. Idempotent — safe to run repeatedly."""
    rows = (
        db.query(Invoice.linked_sale_id)
        .filter(Invoice.transaction_type == "Return", Invoice.linked_sale_id.isnot(None))
        .all()
    )
    linked_ids = {row.linked_sale_id for row in rows if row.linked_sale_id}
    uncancelled = 0
    if linked_ids:
        for sale in db.query(Invoice).filter(Invoice.id.in_(linked_ids)).all():
            if sale.cancelled:
                sale.cancelled = False
                uncancelled += 1
        db.commit()
    return {"uncancelled": uncancelled, "linked_sales": len(linked_ids)}
