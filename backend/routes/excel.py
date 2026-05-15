from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Invoice
from services.excel_service import build_excel

router = APIRouter()


@router.get("/excel")
def download_excel(
    platform: Optional[str] = None,
    warehouse: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Invoice).filter(Invoice.status == "processed")
    if platform:
        q = q.filter(Invoice.platform == platform)
    if warehouse:
        q = q.filter(Invoice.warehouse == warehouse)
    invoices = q.order_by(Invoice.inv_no.asc(), Invoice.id).all()

    name_parts = ["dgmr"]
    if platform:
        name_parts.append(platform.lower())
    if warehouse:
        name_parts.append(warehouse.lower())
    filename = "_".join(name_parts) + "_invoices.xlsx"

    xlsx_bytes = build_excel(invoices)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
