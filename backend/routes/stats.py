from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice

router = APIRouter()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(Invoice.status == "processed", Invoice.cancelled == False).all()

    total_taxable = 0.0
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0
    by_platform: dict = defaultdict(lambda: {"count": 0, "taxable": 0.0, "total": 0.0})
    by_month: dict = defaultdict(lambda: {"count": 0, "taxable": 0.0, "total": 0.0, "platforms": defaultdict(float)})

    for inv in invoices:
        taxable = inv.taxable_value or 0.0
        cgst = inv.cgst9 or 0.0
        sgst = inv.sgst9 or 0.0
        igst = inv.igst18 or 0.0
        inv_total = taxable + cgst + sgst + igst

        total_taxable += taxable
        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst

        platform = inv.platform or "Other"
        by_platform[platform]["count"] += 1
        by_platform[platform]["taxable"] += taxable
        by_platform[platform]["total"] += inv_total

        # Monthly bucketing from inv_date e.g. "1.4.2026"
        month_key = "Unknown"
        if inv.inv_date:
            parts = str(inv.inv_date).replace("/", ".").split(".")
            if len(parts) == 3:
                try:
                    month_key = f"{parts[2]}-{parts[1].zfill(2)}"
                except Exception:
                    pass
            elif len(parts) == 2:
                month_key = f"{parts[1]}-{parts[0].zfill(2)}"

        by_month[month_key]["count"] += 1
        by_month[month_key]["taxable"] += taxable
        by_month[month_key]["total"] += inv_total
        by_month[month_key]["platforms"][platform] += inv_total

    # Distinct platforms
    platforms = sorted(by_platform.keys())

    recent = db.query(Invoice).order_by(Invoice.created_at.desc()).limit(5).all()

    return {
        "total_invoices": len(invoices),
        "total_taxable": round(total_taxable, 2),
        "total_cgst": round(total_cgst, 2),
        "total_sgst": round(total_sgst, 2),
        "total_igst": round(total_igst, 2),
        "grand_total": round(total_taxable + total_cgst + total_sgst + total_igst, 2),
        "platforms": [
            {
                "name": k,
                "count": v["count"],
                "taxable": round(v["taxable"], 2),
                "total": round(v["total"], 2),
            }
            for k, v in sorted(by_platform.items())
        ],
        "by_month": [
            {
                "month": k,
                "count": v["count"],
                "taxable": round(v["taxable"], 2),
                "total": round(v["total"], 2),
                "platforms": {p: round(a, 2) for p, a in v["platforms"].items()},
            }
            for k, v in sorted(by_month.items())
        ],
        "recent_uploads": [
            {
                "id": r.id,
                "filename": r.document_file,
                "platform": r.platform,
                "status": r.status,
                "party_name": r.party_name,
                "inv_no": r.inv_no,
                "taxable_value": r.taxable_value,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent
        ],
    }
