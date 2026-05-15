from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice
from services.excel_service import build_excel

router = APIRouter()


@router.get("/excel")
def download_excel(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(Invoice.status == "processed").order_by(Invoice.created_at).all()
    xlsx_bytes = build_excel(invoices)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=dgmr_invoices.xlsx"},
    )
