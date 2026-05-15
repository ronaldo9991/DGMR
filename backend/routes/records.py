from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Invoice

router = APIRouter()


def _serialize(inv) -> dict:
    return {
        "id": inv.id,
        "platform": inv.platform,
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
        "document_file": inv.document_file,
        "status": inv.status,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
    }


@router.get("/records")
def list_records(
    skip: int = 0,
    limit: int = 200,
    platform: Optional[str] = None,
    cancelled: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Invoice).filter(Invoice.status == "processed")
    if platform:
        q = q.filter(Invoice.platform == platform)
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
    total = q.count()
    rows = q.order_by(Invoice.created_at.desc(), Invoice.id).offset(skip).limit(limit).all()
    return {"total": total, "records": [_serialize(r) for r in rows]}


@router.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == record_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(inv)
    db.commit()
    return {"deleted": True, "id": record_id}
