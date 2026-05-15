import base64
import json
import os
import re
import tempfile
from dataclasses import dataclass, field
from typing import Optional

from openai import OpenAI


def _get_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=key)

EXTRACTION_PROMPT = """You are an OCR extraction assistant for railway freight invoices.
Extract invoice data from this image and return ONLY valid JSON with these exact keys:
- invoice_no
- date (as string, any format found)
- customer_name
- from_station
- to_station
- consignment_no
- goods_description
- weight_kg (numeric only, no units)
- rate_per_kg (numeric only)
- freight_amount (numeric only)
- gst_percent (numeric only, e.g. 18 for 18%)
- gst_amount (numeric only)
- total_amount (numeric only)
- type ("Sale" or "Return" — default to "Sale" if not specified)
- payment_status ("Paid", "Pending", or "Partial" — default to "Pending" if not clear)

If a field is not visible or not applicable, use null. Return ONLY the JSON object, no explanation."""


@dataclass
class InvoiceData:
    invoice_no: Optional[str] = None
    date: Optional[str] = None
    customer_name: Optional[str] = None
    from_station: Optional[str] = None
    to_station: Optional[str] = None
    consignment_no: Optional[str] = None
    goods_description: Optional[str] = None
    weight_kg: Optional[float] = None
    rate_per_kg: Optional[float] = None
    freight_amount: Optional[float] = None
    gst_percent: Optional[float] = None
    gst_amount: Optional[float] = None
    total_amount: Optional[float] = None
    type: Optional[str] = "Sale"
    payment_status: Optional[str] = "Pending"


def _to_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def _pdf_to_image_bytes(pdf_bytes: bytes) -> bytes:
    from pdf2image import convert_from_bytes
    from io import BytesIO

    images = convert_from_bytes(pdf_bytes, first_page=1, last_page=1, dpi=200)
    buf = BytesIO()
    images[0].save(buf, format="PNG")
    return buf.getvalue()


def extract_invoice(file_bytes: bytes, filename: str) -> InvoiceData:
    ext = os.path.splitext(filename.lower())[1]

    if ext == ".pdf":
        image_bytes = _pdf_to_image_bytes(file_bytes)
        media_type = "image/png"
    else:
        image_bytes = file_bytes
        media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

    b64 = _image_to_base64(image_bytes)

    response = _get_client().chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": EXTRACTION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64}", "detail": "high"},
                    },
                ],
            }
        ],
        max_tokens=1000,
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)

    return InvoiceData(
        invoice_no=data.get("invoice_no"),
        date=data.get("date"),
        customer_name=data.get("customer_name"),
        from_station=data.get("from_station"),
        to_station=data.get("to_station"),
        consignment_no=data.get("consignment_no"),
        goods_description=data.get("goods_description"),
        weight_kg=_to_float(data.get("weight_kg")),
        rate_per_kg=_to_float(data.get("rate_per_kg")),
        freight_amount=_to_float(data.get("freight_amount")),
        gst_percent=_to_float(data.get("gst_percent")),
        gst_amount=_to_float(data.get("gst_amount")),
        total_amount=_to_float(data.get("total_amount")),
        type=data.get("type") or "Sale",
        payment_status=data.get("payment_status") or "Pending",
    )
