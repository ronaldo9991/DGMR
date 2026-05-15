import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice
from services.ocr_service import extract_invoices

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

# Thread pool for parallel OCR — each call is an outbound HTTP request to OpenAI
_ocr_pool = ThreadPoolExecutor(max_workers=10)


def _normalize_inv(inv_no: str) -> str:
    return inv_no.strip().upper().replace(" ", "").replace("-", "")


def _cancel_matching_sale(db: Session, inv_no: str, platform: Optional[str]) -> Optional[int]:
    if not inv_no:
        return None

    # Exact match first (fastest)
    q = db.query(Invoice).filter(
        Invoice.inv_no == inv_no,
        Invoice.transaction_type == "Sale",
        Invoice.cancelled == False,
        Invoice.status == "processed",
    )
    if platform:
        q = q.filter(Invoice.platform == platform)
    sale = q.first()

    # Fallback: normalized match (handles OCR whitespace/case/hyphen differences)
    if not sale:
        normalized = _normalize_inv(inv_no)
        candidates = db.query(Invoice).filter(
            Invoice.transaction_type == "Sale",
            Invoice.cancelled == False,
            Invoice.status == "processed",
        )
        if platform:
            candidates = candidates.filter(Invoice.platform == platform)
        for candidate in candidates.all():
            if candidate.inv_no and _normalize_inv(candidate.inv_no) == normalized:
                sale = candidate
                break

    if sale:
        sale.cancelled = True
        return sale.id
    return None


async def _ocr_one(filename: str, content: bytes) -> dict:
    """Run OCR for a single file in the thread pool. Returns a result dict."""
    ext = os.path.splitext(filename.lower())[1]
    if ext not in ALLOWED_EXTENSIONS:
        return {"filename": filename, "ok": False, "error": "Unsupported file type", "rows": []}
    if len(content) > MAX_FILE_SIZE:
        return {"filename": filename, "ok": False, "error": "File too large (max 20 MB)", "rows": []}

    loop = asyncio.get_event_loop()
    try:
        rows = await loop.run_in_executor(_ocr_pool, extract_invoices, content, filename)
        return {"filename": filename, "ok": True, "rows": rows}
    except Exception as exc:
        return {"filename": filename, "ok": False, "error": str(exc), "rows": []}


@router.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    transaction_type: str = Form("Sale"),
    db: Session = Depends(get_db),
):
    # ── Step 1: read all file bytes (fast, async I/O) ────────────────────
    file_payloads = []
    for f in files:
        content = await f.read()
        file_payloads.append((f.filename, content))

    # ── Step 2: run ALL OCR calls in parallel ────────────────────────────
    ocr_tasks = [_ocr_one(name, data) for name, data in file_payloads]
    ocr_results = await asyncio.gather(*ocr_tasks)

    # ── Step 3: write to DB sequentially (safe for SQLite & Postgres) ────
    results = []
    for ocr in ocr_results:
        if not ocr["ok"]:
            db.add(Invoice(document_file=ocr["filename"], status="error"))
            db.commit()
            results.append({
                "filename": ocr["filename"],
                "status": "error",
                "error": ocr["error"],
                "rows_added": 0,
                "sales_cancelled": [],
            })
            continue

        added = 0
        cancelled_ids = []

        for row in ocr["rows"]:
            linked_sale_id = None
            if transaction_type == "Return":
                cid = _cancel_matching_sale(db, row.inv_no, row.platform)
                if cid:
                    linked_sale_id = cid
                    cancelled_ids.append(cid)

            db.add(Invoice(
                platform=row.platform,
                warehouse=row.warehouse,
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
                document_file=ocr["filename"],
                status="processed",
            ))
            added += 1

        db.commit()

        results.append({
            "filename": ocr["filename"],
            "status": "processed",
            "rows_added": added,
            "transaction_type": transaction_type,
            "platform": ocr["rows"][0].platform if ocr["rows"] else None,
            "sales_cancelled": cancelled_ids,
            "invoices": [
                {
                    "inv_no": row.inv_no,
                    "inv_date": row.inv_date,
                    "party_name": row.party_name,
                    "taxable_value": row.taxable_value,
                    "cancelled": row.cancelled,
                }
                for row in ocr["rows"]
            ],
        })

    return {
        "results": results,
        "total_files": len(results),
        "total_rows_added": sum(r.get("rows_added", 0) for r in results),
        "total_sales_cancelled": sum(len(r.get("sales_cancelled", [])) for r in results),
        "processed": sum(1 for r in results if r["status"] == "processed"),
    }
