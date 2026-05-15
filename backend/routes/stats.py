from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Invoice

router = APIRouter()


def _month_key(inv_date: str) -> str:
    if not inv_date:
        return "Unknown"
    parts = str(inv_date).replace("/", ".").split(".")
    if len(parts) == 3:
        try:
            return f"{parts[2]}-{parts[1].zfill(2)}"
        except Exception:
            pass
    return "Unknown"


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(
        Invoice.status == "processed",
        Invoice.cancelled == False,
    ).all()

    # ── Totals ───────────────────────────────────────────────────────────────
    total_taxable = total_cgst = total_sgst = total_igst = 0.0
    sales_taxable = sales_total = 0.0
    returns_taxable = returns_total = 0.0
    sales_count = returns_count = 0

    by_platform: dict = defaultdict(lambda: {
        "count": 0, "sales_count": 0, "returns_count": 0,
        "taxable": 0.0, "total": 0.0,
        "sales_total": 0.0, "returns_total": 0.0,
    })

    # month → {sales_total, returns_total, sales_count, returns_count}
    by_month: dict = defaultdict(lambda: {
        "sales_total": 0.0, "returns_total": 0.0,
        "sales_count": 0, "returns_count": 0,
        "platforms": defaultdict(float),
    })

    # state → {count, sales_total, returns_total}
    by_state: dict = defaultdict(lambda: {
        "count": 0, "sales_total": 0.0, "returns_total": 0.0,
    })

    for inv in invoices:
        taxable  = inv.taxable_value or 0.0
        cgst     = inv.cgst9 or 0.0
        sgst     = inv.sgst9 or 0.0
        igst     = inv.igst18 or 0.0
        inv_total = taxable + cgst + sgst + igst
        is_return = (inv.transaction_type or "Sale") == "Return"
        platform  = inv.platform or "Other"
        state     = (inv.party_address or "Unknown").strip().title()
        month     = _month_key(inv.inv_date)

        total_taxable += taxable
        total_cgst    += cgst
        total_sgst    += sgst
        total_igst    += igst

        # Platform
        by_platform[platform]["count"] += 1
        by_platform[platform]["taxable"] += taxable
        by_platform[platform]["total"] += inv_total

        # Month
        by_month[month]["platforms"][platform] += inv_total

        # State
        by_state[state]["count"] += 1

        if is_return:
            returns_count += 1
            returns_taxable += taxable
            returns_total += inv_total
            by_platform[platform]["returns_count"] += 1
            by_platform[platform]["returns_total"] += inv_total
            by_month[month]["returns_total"] += inv_total
            by_month[month]["returns_count"] += 1
            by_state[state]["returns_total"] += inv_total
        else:
            sales_count += 1
            sales_taxable += taxable
            sales_total += inv_total
            by_platform[platform]["sales_count"] += 1
            by_platform[platform]["sales_total"] += inv_total
            by_month[month]["sales_total"] += inv_total
            by_month[month]["sales_count"] += 1
            by_state[state]["sales_total"] += inv_total

    recent = db.query(Invoice).order_by(Invoice.created_at.desc()).limit(5).all()

    # Top states by count (max 15)
    top_states = sorted(by_state.items(), key=lambda x: x[1]["count"], reverse=True)[:15]

    return {
        # Totals
        "total_invoices":   len(invoices),
        "sales_count":      sales_count,
        "returns_count":    returns_count,
        "total_taxable":    round(total_taxable, 2),
        "total_cgst":       round(total_cgst, 2),
        "total_sgst":       round(total_sgst, 2),
        "total_igst":       round(total_igst, 2),
        "grand_total":      round(total_taxable + total_cgst + total_sgst + total_igst, 2),
        "sales_total":      round(sales_total, 2),
        "returns_total":    round(returns_total, 2),
        "net_revenue":      round(sales_total - returns_total, 2),

        # Per-platform
        "platforms": [
            {
                "name": k,
                "count": v["count"],
                "sales_count": v["sales_count"],
                "returns_count": v["returns_count"],
                "taxable": round(v["taxable"], 2),
                "total": round(v["total"], 2),
                "sales_total": round(v["sales_total"], 2),
                "returns_total": round(v["returns_total"], 2),
            }
            for k, v in sorted(by_platform.items())
        ],

        # Monthly sales vs returns
        "by_month": [
            {
                "month": k,
                "sales_total":   round(v["sales_total"], 2),
                "returns_total": round(v["returns_total"], 2),
                "sales_count":   v["sales_count"],
                "returns_count": v["returns_count"],
                "platforms":     {p: round(a, 2) for p, a in v["platforms"].items()},
            }
            for k, v in sorted(by_month.items())
        ],

        # State breakdown
        "by_state": [
            {
                "state": state,
                "count": d["count"],
                "sales_total":   round(d["sales_total"], 2),
                "returns_total": round(d["returns_total"], 2),
            }
            for state, d in top_states
        ],

        "recent_uploads": [
            {
                "id": r.id,
                "filename": r.document_file,
                "platform": r.platform,
                "transaction_type": r.transaction_type,
                "status": r.status,
                "party_name": r.party_name,
                "inv_no": r.inv_no,
                "taxable_value": r.taxable_value,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent
        ],
    }
