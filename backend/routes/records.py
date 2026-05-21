from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Invoice

router = APIRouter()


def _parse_date(inv_date):
    """Parse DD.MM.YYYY or DD/MM/YYYY → (year_str, month_str_padded) or (None, None)."""
    if not inv_date:
        return None, None
    parts = str(inv_date).replace("/", ".").split(".")
    if len(parts) == 3:
        try:
            return str(parts[2]).strip(), str(parts[1]).strip().zfill(2)
        except Exception:
            pass
    return None, None


def _serialize(inv) -> dict:
    return {
        "id": inv.id,
        "platform": inv.platform,
        "warehouse": inv.warehouse,
        "transaction_type": inv.transaction_type,
        "qty": inv.qty,
        "party_name": inv.party_name,
        "gst_number": inv.gst_number,
        "inv_no": inv.inv_no,
        "inv_date": inv.inv_date,
        "taxable_value": inv.taxable_value,
        "cgst9": inv.cgst9,
        "sgst9": inv.sgst9,
        "igst18": inv.igst18,
        "party_address": inv.party_address,
        "cancelled": inv.cancelled,
        "linked_sale_id": inv.linked_sale_id,
        "document_file": inv.document_file,
        "status": inv.status,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@router.get("/records/dates")
def available_dates(db: Session = Depends(get_db)):
    """Returns all unique years and year-month pairs present in the data."""
    rows = (
        db.query(Invoice.inv_date)
        .filter(Invoice.status == "processed", Invoice.cancelled == False)
        .all()
    )
    year_months: dict = {}   # year → set of month strings
    for (inv_date,) in rows:
        y, m = _parse_date(inv_date)
        if y:
            year_months.setdefault(y, set())
            if m:
                year_months[y].add(m)

    result = []
    for y in sorted(year_months.keys(), reverse=True):
        result.append({
            "year": y,
            "months": sorted(year_months[y]),
        })
    return {"dates": result}


@router.get("/records")
def list_records(
    skip: int = 0,
    limit: int = 1000,
    platform: Optional[str] = None,
    warehouse: Optional[str] = None,
    transaction_type: Optional[str] = None,
    cancelled: Optional[bool] = None,
    search: Optional[str] = None,
    year: Optional[str] = None,    # e.g. "2026"
    month: Optional[str] = None,   # e.g. "04"
    db: Session = Depends(get_db),
):
    q = db.query(Invoice).filter(Invoice.status == "processed")
    if platform:
        q = q.filter(Invoice.platform == platform)
    if warehouse:
        q = q.filter(Invoice.warehouse == warehouse)
    if transaction_type:
        q = q.filter(Invoice.transaction_type == transaction_type)
    if cancelled is not None:
        q = q.filter(Invoice.cancelled == cancelled)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Invoice.inv_no.ilike(like)
            | Invoice.party_name.ilike(like)
            | Invoice.gst_number.ilike(like)
            | Invoice.party_address.ilike(like)
        )

    if year or month:
        # Fetch all matching rows and filter by parsed date in Python
        # (inv_date is a free-text string from OCR so SQL LIKE isn't reliable)
        all_rows = q.order_by(Invoice.inv_no.asc(), Invoice.id).all()
        filtered = []
        for r in all_rows:
            y_val, m_val = _parse_date(r.inv_date)
            if year and y_val != year:
                continue
            if month and m_val != month:
                continue
            filtered.append(r)
        total = len(filtered)
        rows = filtered[skip: skip + limit]
    else:
        total = q.count()
        rows = q.order_by(Invoice.inv_no.asc(), Invoice.id).offset(skip).limit(limit).all()

    return {"total": total, "records": [_serialize(r) for r in rows]}


@router.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == record_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(inv)
    db.commit()
    return {"deleted": True, "id": record_id}
