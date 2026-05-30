from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Invoice

router = APIRouter()


def _parse_date(inv_date):
    """Parse any OCR date format → (year_str, month_str_padded) or (None, None).

    Handles: DD.MM.YYYY, DD.MM.YY, DD/MM/YYYY, DD/MM/YY,
             DD-MM-YYYY, DD-MM-YYYY HH:MM …, DD-Mon-YY
    """
    if not inv_date:
        return None, None
    import re as _re
    from datetime import datetime as _dt

    s = str(inv_date).strip()
    # Strip time: "27-04-2026, 08:38 AM" → "27-04-2026"
    s = _re.split(r",\s*\d", s)[0].strip()

    # Named-month formats, e.g. "01-Apr-26"
    for fmt in ("%d-%b-%y", "%d-%b-%Y", "%d %b %y", "%d %b %Y"):
        try:
            dt = _dt.strptime(s, fmt)
            return str(dt.year), str(dt.month).zfill(2)
        except ValueError:
            pass

    # Numeric-only
    for sep in (".", "/", "-"):
        if sep not in s:
            continue
        parts = [p.strip() for p in s.split(sep)]
        if len(parts) != 3:
            continue
        d, m, y = parts[0], parts[1], parts[2]
        if len(y) == 2 and y.isdigit():
            y = "20" + y
        if len(y) == 4 and y.isdigit() and m.isdigit() and 1 <= int(m) <= 12:
            return y, m.zfill(2)
        break

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


@router.post("/records/fix-warehouses")
def fix_warehouses(db: Session = Depends(get_db)):
    """One-time fix: re-detect warehouse from inv_no for Amazon records.
    CJB1/MAA4 invoices that were mis-tagged as IN get corrected."""
    rows = db.query(Invoice).filter(Invoice.platform == "Amazon").all()
    fixed = 0
    for inv in rows:
        if not inv.inv_no:
            continue
        # Normalize: remove spaces so "CJ B1-15" matches "CJB1"
        upper_nospace = inv.inv_no.upper().replace(" ", "")
        correct = None
        for code in ("MAA4", "CJB1"):
            if code in upper_nospace:
                correct = code
                break
        if correct is None:
            upper = inv.inv_no.upper()
            if upper.startswith("IN-") or upper.startswith("IN ") or upper == "IN":
                correct = "IN"
            else:
                correct = "IN"  # default
        if inv.warehouse != correct:
            inv.warehouse = correct
            fixed += 1
    db.commit()
    return {"fixed": fixed, "total_amazon": len(rows)}
