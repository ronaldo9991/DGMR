import base64
import json
import os
import re
from dataclasses import dataclass
from io import BytesIO
from typing import List, Optional

from openai import OpenAI


def _get_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=key)


EXTRACTION_PROMPT = """You are an OCR extraction assistant for e-commerce seller invoices (Amazon/Flipkart).

This document may contain MULTIPLE invoice entries — sometimes 5 or more rows in a single table or across multiple pages.
Extract EVERY SINGLE invoice row and return a JSON array. Do not skip any row, even if values repeat.

Each element in the array must have these exact keys:
- platform: "Amazon", "Flipkart", or "Other" (detect from document header/logo/watermark; apply same platform to all rows if document is from one seller)
- qty: integer quantity (default 1 if not shown)
- party_name: customer/buyer name (string or null)
- gst_number: GST/GSTIN number of buyer (string or null)
- inv_no: invoice number as string (e.g. "1", "2", "INV-001")
- inv_date: invoice date as string exactly as shown (e.g. "1.4.2026")
- taxable_value: taxable/base amount as number (no currency symbol)
- cgst9: CGST amount (9%) as number, null if not applicable
- sgst9: SGST amount (9%) as number, null if not applicable
- igst18: IGST amount (18%) as number, null if not applicable
- party_address: buyer state/address (string or null)
- cancelled: true if the invoice is marked CANCEL/CANCELLED, otherwise false

Rules:
- If the document is a tabular list (e.g. invoice register, batch report), each DATA ROW is a separate invoice — extract them all
- If CGST+SGST are present (intra-state, same state as seller), set cgst9 and sgst9; set igst18 to null
- If IGST is present (inter-state), set igst18; set cgst9 and sgst9 to null
- Header rows, subtotal rows, and grand-total rows are NOT invoices — skip them
- If a row has no party name and no taxable value, still include it with nulls for those fields
- Return ONLY the JSON array, no explanation or markdown fences"""


@dataclass
class InvoiceRow:
    platform: Optional[str] = None
    qty: Optional[int] = 1
    party_name: Optional[str] = None
    gst_number: Optional[str] = None
    inv_no: Optional[str] = None
    inv_date: Optional[str] = None
    taxable_value: Optional[float] = None
    cgst9: Optional[float] = None
    sgst9: Optional[float] = None
    igst18: Optional[float] = None
    party_address: Optional[str] = None
    cancelled: bool = False


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _to_int(val) -> Optional[int]:
    if val is None:
        return 1
    try:
        return int(val)
    except (ValueError, TypeError):
        return 1


def _pdf_to_all_pages(pdf_bytes: bytes) -> List[bytes]:
    from pdf2image import convert_from_bytes
    images = convert_from_bytes(pdf_bytes, dpi=200)
    result = []
    for img in images:
        buf = BytesIO()
        img.save(buf, format="PNG")
        result.append(buf.getvalue())
    return result


def extract_invoices(file_bytes: bytes, filename: str) -> List[InvoiceRow]:
    ext = os.path.splitext(filename.lower())[1]

    if ext == ".pdf":
        page_bytes_list = _pdf_to_all_pages(file_bytes)
    else:
        media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
        page_bytes_list = [(file_bytes, media_type)]

    # Build image content blocks — one per page (PDFs) or one for the image
    image_blocks = []
    for item in page_bytes_list:
        if isinstance(item, tuple):
            raw, mt = item
        else:
            raw, mt = item, "image/png"
        b64 = base64.b64encode(raw).decode("utf-8")
        image_blocks.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mt};base64,{b64}", "detail": "high"},
        })

    response = _get_client().chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [{"type": "text", "text": EXTRACTION_PROMPT}] + image_blocks,
            }
        ],
        max_tokens=8000,
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    rows_data = json.loads(raw)
    if isinstance(rows_data, dict):
        rows_data = [rows_data]

    results = []
    for d in rows_data:
        results.append(
            InvoiceRow(
                platform=d.get("platform"),
                qty=_to_int(d.get("qty")),
                party_name=d.get("party_name"),
                gst_number=d.get("gst_number"),
                inv_no=str(d["inv_no"]) if d.get("inv_no") is not None else None,
                inv_date=d.get("inv_date"),
                taxable_value=_to_float(d.get("taxable_value")),
                cgst9=_to_float(d.get("cgst9")),
                sgst9=_to_float(d.get("sgst9")),
                igst18=_to_float(d.get("igst18")),
                party_address=d.get("party_address"),
                cancelled=bool(d.get("cancelled", False)),
            )
        )
    return results
