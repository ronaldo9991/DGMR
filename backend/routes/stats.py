from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice

router = APIRouter()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(Invoice.status == "processed").all()

    total_sales_amount = 0.0
    total_returns_amount = 0.0
    sales_count = 0
    returns_count = 0
    payment_breakdown = {"Paid": 0, "Pending": 0, "Partial": 0}
    by_month: dict = defaultdict(lambda: {"sales": 0.0, "returns": 0.0, "sales_count": 0, "returns_count": 0})

    for inv in invoices:
        amount = inv.total_amount or 0.0
        is_return = (inv.type or "").lower() == "return"

        if is_return:
            total_returns_amount += amount
            returns_count += 1
        else:
            total_sales_amount += amount
            sales_count += 1

        ps = inv.payment_status or "Pending"
        if ps in payment_breakdown:
            payment_breakdown[ps] += 1
        else:
            payment_breakdown["Pending"] += 1

        # Monthly bucketing
        month_key = "Unknown"
        if inv.date:
            parts = str(inv.date).replace("/", "-").replace(".", "-").split("-")
            if len(parts) >= 2:
                # Try to extract YYYY-MM
                for p in parts:
                    if len(p) == 4 and p.isdigit():
                        year = p
                        idx = parts.index(p)
                        other = [x for i, x in enumerate(parts) if i != idx and x.isdigit()]
                        if other:
                            month = other[0].zfill(2)
                            month_key = f"{year}-{month}"
                            break
        if is_return:
            by_month[month_key]["returns"] += amount
            by_month[month_key]["returns_count"] += 1
        else:
            by_month[month_key]["sales"] += amount
            by_month[month_key]["sales_count"] += 1

    recent = (
        db.query(Invoice)
        .order_by(Invoice.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_invoices": len(invoices),
        "sales_count": sales_count,
        "returns_count": returns_count,
        "total_sales_amount": round(total_sales_amount, 2),
        "total_returns_amount": round(total_returns_amount, 2),
        "net_revenue": round(total_sales_amount - total_returns_amount, 2),
        "payment_breakdown": payment_breakdown,
        "by_month": [
            {
                "month": k,
                "sales": round(v["sales"], 2),
                "returns": round(v["returns"], 2),
                "sales_count": v["sales_count"],
                "returns_count": v["returns_count"],
            }
            for k, v in sorted(by_month.items())
        ],
        "recent_uploads": [
            {
                "id": r.id,
                "filename": r.document_file,
                "status": r.status,
                "type": r.type,
                "total_amount": r.total_amount,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent
        ],
    }
