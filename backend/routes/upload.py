import os
from typing import List

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice
from services.ocr_service import extract_invoices

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []

    for file in files:
        ext = os.path.splitext(file.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            results.append({"filename": file.filename, "status": "error", "error": "Unsupported file type", "rows_added": 0})
            continue

        try:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                results.append({"filename": file.filename, "status": "error", "error": "File too large (max 20MB)", "rows_added": 0})
                continue

            invoice_rows = extract_invoices(content, file.filename)
            added = 0

            for row in invoice_rows:
                inv = Invoice(
                    platform=row.platform,
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
                "platform": invoice_rows[0].platform if invoice_rows else None,
            })

        except Exception as e:
            db.rollback()
            db.add(Invoice(document_file=file.filename, status="error"))
            db.commit()
            results.append({"filename": file.filename, "status": "error", "error": str(e), "rows_added": 0})

    total_rows = sum(r.get("rows_added", 0) for r in results)
    return {
        "results": results,
        "total_files": len(results),
        "total_rows_added": total_rows,
        "processed": sum(1 for r in results if r["status"] == "processed"),
    }
