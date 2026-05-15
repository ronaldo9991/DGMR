import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice
from services.ocr_service import extract_invoices

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _cancel_matching_sale(db: Session, inv_no: str, platform: Optional[str]) -> Optional[int]:
    """Find a non-cancelled Sale with the same inv_no (+platform) and cancel it. Returns its id."""
    if not inv_no:
        return None
    q = db.query(Invoice).filter(
        Invoice.inv_no == inv_no,
        Invoice.transaction_type == "Sale",
        Invoice.cancelled == False,
        Invoice.status == "processed",
    )
    if platform:
        q = q.filter(Invoice.platform == platform)
    sale = q.first()
    if sale:
        sale.cancelled = True
        return sale.id
    return None


@router.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    transaction_type: str = Form("Sale"),   # "Sale" or "Return"
    db: Session = Depends(get_db),
):
    results = []

    for file in files:
        ext = os.path.splitext(file.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            results.append({
                "filename": file.filename, "status": "error",
                "error": "Unsupported file type", "rows_added": 0,
            })
            continue

        try:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                results.append({
                    "filename": file.filename, "status": "error",
                    "error": "File too large (max 20MB)", "rows_added": 0,
                })
                continue

            invoice_rows = extract_invoices(content, file.filename)
            added = 0
            cancelled_ids = []

            for row in invoice_rows:
                linked_sale_id = None

                # If this is a Return, cancel the matching Sale automatically
                if transaction_type == "Return":
                    cancelled_sale_id = _cancel_matching_sale(db, row.inv_no, row.platform)
                    if cancelled_sale_id:
                        linked_sale_id = cancelled_sale_id
                        cancelled_ids.append(cancelled_sale_id)

                inv = Invoice(
                    platform=row.platform,
                    transaction_type=transaction_type,
                    qty=row.qty,
                    party_name=row.party_name,
                    gst_number=row.gst_number,
                    inv_no=row.inv_no,
                    inv_date=row.inv_date,
                    taxable_value=row.taxable_value,
                    cgst9=row.cgst9,
                    sgst9=row.sgst9,
                    igst18=row.igst18,
                    party_address=row.party_address,
                    cancelled=row.cancelled,
                    linked_sale_id=linked_sale_id,
                    document_file=file.filename,
                    status="processed",
                )
                db.add(inv)
                added += 1

            db.commit()

            results.append({
                "filename": file.filename,
                "status": "processed",
                "rows_added": added,
                "transaction_type": transaction_type,
                "platform": invoice_rows[0].platform if invoice_rows else None,
                "sales_cancelled": cancelled_ids,
            })

        except Exception as e:
            db.rollback()
            db.add(Invoice(document_file=file.filename, status="error"))
            db.commit()
            results.append({
                "filename": file.filename, "status": "error",
                "error": str(e), "rows_added": 0,
            })

    total_rows = sum(r.get("rows_added", 0) for r in results)
    total_cancelled = sum(len(r.get("sales_cancelled", [])) for r in results)
    return {
        "results": results,
        "total_files": len(results),
        "total_rows_added": total_rows,
        "total_sales_cancelled": total_cancelled,
        "processed": sum(1 for r in results if r["status"] == "processed"),
    }
