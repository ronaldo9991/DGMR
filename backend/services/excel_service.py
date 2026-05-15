import io
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HEADERS = [
    "QTY", "TYPE", "PARTY NAME", "GST NUMBER", "INV NO", "INV DATE",
    "TAXABLE VALUE", "CGST9", "SGST9", "IGST18", "TOTAL AMOUNT", "PARTY ADDRESS",
]
FIELDS = [
    "qty", "transaction_type", "party_name", "gst_number", "inv_no", "inv_date",
    "taxable_value", "cgst9", "sgst9", "igst18", "_total_amount", "party_address",
]
NUM_COLS = {7, 8, 9, 10, 11}   # 1-indexed: TAXABLE VALUE, CGST9, SGST9, IGST18, TOTAL AMOUNT

TITLE_FONT   = Font(bold=True, size=13)
HEADER_FONT  = Font(bold=True, size=11)
HEADER_FILL  = PatternFill("solid", fgColor="D9E1F2")
SALE_FILL    = PatternFill("solid", fgColor="EBF5EB")
RETURN_FILL  = PatternFill("solid", fgColor="FFF0F0")
CANCEL_FONT  = Font(color="FF0000", italic=True)
TOTAL_FONT   = Font(bold=True, size=11)
TOTAL_FILL   = PatternFill("solid", fgColor="FFF2CC")
THIN         = Side(style="thin", color="BFBFBF")
BORDER       = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
COL_WIDTHS   = [6, 10, 28, 18, 28, 12, 16, 12, 12, 12, 16, 22]

AMAZON_WAREHOUSES   = ["IN", "MAA4", "CJB1"]
WAREHOUSE_LABELS    = {"IN": "IN (India)", "MAA4": "MAA4 (Chennai)", "CJB1": "CJB1 (Coimbatore)"}


def _sort_key(inv):
    v = (inv.inv_no or "").strip()
    return v.upper()


def _write_sheet(ws, invoices, title: str):
    ws["A1"] = title
    ws["A1"].font = TITLE_FONT
    ws.row_dimensions[1].height = 22
    ws.row_dimensions[2].height = 6

    for col_idx, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=3, column=col_idx, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[3].height = 28
    ws.row_dimensions[4].height = 6

    data_start = 5
    sorted_invs = sorted(invoices, key=_sort_key)
    for row_idx, inv in enumerate(sorted_invs, start=data_start):
        is_return = getattr(inv, "transaction_type", "Sale") == "Return"
        is_cancel = getattr(inv, "cancelled", False)
        row_fill  = RETURN_FILL if is_return else SALE_FILL

        for col_idx, field in enumerate(FIELDS, start=1):
            if field == "_total_amount":
                tv = getattr(inv, "taxable_value", None) or 0
                cg = getattr(inv, "cgst9", None) or 0
                sg = getattr(inv, "sgst9", None) or 0
                ig = getattr(inv, "igst18", None) or 0
                val = tv + cg + sg + ig if (tv or cg or sg or ig) else None
            else:
                val = getattr(inv, field, None)
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            if not is_cancel:
                cell.fill = row_fill
            cell.border = BORDER
            cell.alignment = Alignment(vertical="center",
                                       horizontal="right" if col_idx in NUM_COLS else "left")
            if is_cancel:
                cell.font = CANCEL_FONT
            elif is_return and col_idx == 2:
                cell.font = Font(bold=True, color="CC0000")
            if col_idx in NUM_COLS:
                cell.number_format = "#,##0.00"

        if is_cancel:
            ws.cell(row=row_idx, column=len(HEADERS) + 1, value="CANCEL").font = CANCEL_FONT

    data_end = data_start + len(sorted_invs) - 1

    if sorted_invs:
        tr = data_end + 2
        ws.cell(row=tr, column=1, value="TOTAL").font = TOTAL_FONT
        ws.cell(row=tr, column=1).fill = TOTAL_FILL
        ws.cell(row=tr, column=1).alignment = Alignment(horizontal="center")
        for col_idx in NUM_COLS:
            col_letter = get_column_letter(col_idx)
            cell = ws.cell(row=tr, column=col_idx,
                           value=f"=SUM({col_letter}{data_start}:{col_letter}{data_end})")
            cell.font = TOTAL_FONT
            cell.fill = TOTAL_FILL
            cell.number_format = "#,##0.00"
            cell.alignment = Alignment(horizontal="right", vertical="center")
            cell.border = BORDER

    for col_idx, width in enumerate(COL_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width
    ws.freeze_panes = f"A{data_start}"


def build_excel(invoices) -> bytes:
    wb = Workbook()
    first = True

    def _add_sheet(title, rows, header):
        nonlocal first
        if not rows:
            return
        ws = wb.active if first else wb.create_sheet(title)
        if first:
            ws.title = title
            first = False
        _write_sheet(ws, rows, header)

    # ── Group data ───────────────────────────────────────────────────────
    by_platform: dict = defaultdict(list)
    by_platform_type: dict = defaultdict(lambda: defaultdict(list))
    # Amazon: further split by warehouse
    amazon_by_wh: dict = defaultdict(list)
    amazon_by_wh_type: dict = defaultdict(lambda: defaultdict(list))

    for inv in invoices:
        platform = (inv.platform or "Other").strip()
        t = getattr(inv, "transaction_type", "Sale") or "Sale"
        by_platform[platform].append(inv)
        by_platform_type[platform][t].append(inv)
        if platform == "Amazon":
            wh = (inv.warehouse or "IN").upper()
            amazon_by_wh[wh].append(inv)
            amazon_by_wh_type[wh][t].append(inv)

    # ── Flipkart sheets ──────────────────────────────────────────────────
    if "Flipkart" in by_platform:
        _add_sheet("Flipkart Sales",   by_platform_type["Flipkart"]["Sale"],   "FLIPKART — SALES")
        _add_sheet("Flipkart Returns", by_platform_type["Flipkart"]["Return"], "FLIPKART — RETURNS")
        _add_sheet("Flipkart",         by_platform["Flipkart"],                "FLIPKART — ALL INVOICES")

    # ── Amazon per-warehouse sheets ──────────────────────────────────────
    if "Amazon" in by_platform:
        for wh in AMAZON_WAREHOUSES:
            if wh not in amazon_by_wh:
                continue
            label = WAREHOUSE_LABELS.get(wh, wh)
            _add_sheet(f"Amazon {wh} Sales",   amazon_by_wh_type[wh]["Sale"],   f"AMAZON {label} — SALES")
            _add_sheet(f"Amazon {wh} Returns", amazon_by_wh_type[wh]["Return"], f"AMAZON {label} — RETURNS")
            _add_sheet(f"Amazon {wh}",         amazon_by_wh[wh],                f"AMAZON {label} — ALL INVOICES")
        # Combined Amazon sheet
        _add_sheet("Amazon",  by_platform["Amazon"],  "AMAZON — ALL INVOICES")

    # ── Other platforms ──────────────────────────────────────────────────
    for p in by_platform:
        if p in ("Flipkart", "Amazon"):
            continue
        _add_sheet(f"{p} Sales",   by_platform_type[p]["Sale"],   f"{p.upper()} — SALES")
        _add_sheet(f"{p} Returns", by_platform_type[p]["Return"], f"{p.upper()} — RETURNS")
        _add_sheet(p,              by_platform[p],                f"{p.upper()} — ALL INVOICES")

    # ── ALL combined ─────────────────────────────────────────────────────
    _add_sheet("ALL", list(invoices), "ALL INVOICES")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
