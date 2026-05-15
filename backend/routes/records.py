from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Invoice

router = APIRouter()


@router.get("/records")
def list_records(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Invoice)
    if type:
        q = q.filter(Invoice.type == type)
    if payment_status:
        q = q.filter(Invoice.payment_status == payment_status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Invoice.invoice_no.ilike(like)
            | Invoice.customer_name.ilike(like)
            | Invoice.consignment_no.ilike(like)
        )
    total = q.count()
    rows = q.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()

    def serialize(inv):
        return {
            "id": inv.id,
            "invoice_no": inv.invoice_no,
            "date": inv.date,
            "customer_name": inv.customer_name,
            "from_station": inv.from_station,
            "to_station": inv.to_station,
            "consignment_no": inv.consignment_no,
            "goods_description": inv.goods_description,
            "weight_kg": inv.weight_kg,
            "rate_per_kg": inv.rate_per_kg,
            "freight_amount": inv.freight_amount,
            "gst_percent": inv.gst_percent,
            "gst_amount": inv.gst_amount,
            "total_amount": inv.total_amount,
            "type": inv.type,
            "payment_status": inv.payment_status,
            "document_file": inv.document_file,
            "status": inv.status,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }

    return {"total": total, "records": [serialize(r) for r in rows]}


@router.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == record_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(inv)
    db.commit()
    return {"deleted": True, "id": record_id}
