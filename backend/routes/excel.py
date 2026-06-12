from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Invoice
from services.excel_service import build_excel
from routes.records import _parse_date

router = APIRouter()


@router.get("/excel")
def download_excel(
    platform: Optional[str] = None,
    warehouse: Optional[str] = None,
    year: Optional[str] = None,
    month: Optional[str] = None,
    transaction_type: Optional[str] = None,   # "Sale" or "Return"
    db: Session = Depends(get_db),
):
    q = db.query(Invoice).filter(Invoice.status == "processed")
    if platform:
        q = q.filter(Invoice.platform == platform)
    if warehouse:
        q = q.filter(Invoice.warehouse == warehouse)
    if transaction_type:
        # Sales/Returns-only download: drop cancelled too so the sheet is clean
        q = q.filter(
            Invoice.transaction_type == transaction_type,
            Invoice.cancelled == False,
        )
    invoices = q.order_by(Invoice.inv_no.asc(), Invoice.id).all()

    # Filter by year/month if requested
    if year or month:
        filtered = []
        for r in invoices:
            y_val, m_val = _parse_date(r.inv_date)
            if year and y_val != year:
                continue
            if month and m_val != month:
                continue
            filtered.append(r)
        invoices = filtered

    name_parts = ["dgmr"]
    if platform:
        name_parts.append(platform.lower())
    if warehouse:
        name_parts.append(warehouse.lower())
    if year:
        name_parts.append(year)
    if month:
        name_parts.append(month)
    if transaction_type:
        name_parts.append("sales" if transaction_type == "Sale" else "returns")
    suffix = "_invoices.xlsx" if not transaction_type else ".xlsx"
    filename = "_".join(name_parts) + suffix

    xlsx_bytes = build_excel(invoices)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
