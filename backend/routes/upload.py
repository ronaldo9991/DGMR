import os
import tempfile
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice
from services.ocr_service import extract_invoice

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []

    for file in files:
        ext = os.path.splitext(file.filename.lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            results.append({"filename": file.filename, "status": "error", "error": "Unsupported file type"})
            continue

        try:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                results.append({"filename": file.filename, "status": "error", "error": "File too large (max 20MB)"})
                continue

            invoice_data = extract_invoice(content, file.filename)

            row = Invoice(
                invoice_no=invoice_data.invoice_no,
                date=invoice_data.date,
                customer_name=invoice_data.customer_name,
                from_station=invoice_data.from_station,
                to_station=invoice_data.to_station,
                consignment_no=invoice_data.consignment_no,
                goods_description=invoice_data.goods_description,
                weight_kg=invoice_data.weight_kg,
                rate_per_kg=invoice_data.rate_per_kg,
                freight_amount=invoice_data.freight_amount,
                gst_percent=invoice_data.gst_percent,
                gst_amount=invoice_data.gst_amount,
                total_amount=invoice_data.total_amount,
                type=invoice_data.type,
                payment_status=invoice_data.payment_status,
                document_file=file.filename,
                status="processed",
            )
            db.add(row)
            db.commit()
            db.refresh(row)

            results.append({
                "filename": file.filename,
                "status": "processed",
                "id": row.id,
                "invoice_no": row.invoice_no,
                "customer_name": row.customer_name,
                "total_amount": row.total_amount,
                "type": row.type,
            })

        except Exception as e:
            db.rollback()
            row = Invoice(document_file=file.filename, status="error")
            db.add(row)
            db.commit()
            results.append({"filename": file.filename, "status": "error", "error": str(e)})

    return {"results": results, "total": len(results), "processed": sum(1 for r in results if r["status"] == "processed")}
