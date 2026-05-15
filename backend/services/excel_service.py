import io
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Template columns — Type inserted after QTY, matching user template + new requirement
HEADERS = [
    "QTY", "TYPE", "PARTY NAME", "GST NUMBER", "INV NO", "INV DATE",
    "TAXABLE VALUE", "CGST9", "SGST9", "IGST18", "PARTY ADDRESS",
]
FIELDS = [
    "qty", "transaction_type", "party_name", "gst_number", "inv_no", "inv_date",
    "taxable_value", "cgst9", "sgst9", "igst18", "party_address",
]
NUM_COLS = {6, 7, 8, 9}   # 1-indexed columns for numeric formatting (TAXABLE, CGST, SGST, IGST)

# Styling
TITLE_FONT   = Font(bold=True, size=13)
HEADER_FONT  = Font(bold=True, size=11)
HEADER_FILL  = PatternFill("solid", fgColor="D9E1F2")
SALE_FILL    = PatternFill("solid", fgColor="EBF5EB")   # light green
RETURN_FILL  = PatternFill("solid", fgColor="FFF0F0")   # light red
CANCEL_FONT  = Font(color="FF0000", italic=True)
TOTAL_FONT   = Font(bold=True, size=11)
TOTAL_FILL   = PatternFill("solid", fgColor="FFF2CC")
THIN         = Side(style="thin", color="BFBFBF")
BORDER       = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
COL_WIDTHS   = [6, 10, 28, 18, 8, 12, 16, 12, 12, 12, 22]


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
    for row_idx, inv in enumerate(invoices, start=data_start):
        is_return  = getattr(inv, "transaction_type", "Sale") == "Return"
        is_cancel  = getattr(inv, "cancelled", False)
        row_fill   = RETURN_FILL if is_return else SALE_FILL

        for col_idx, field in enumerate(FIELDS, start=1):
            val  = getattr(inv, field, None)
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            if not is_cancel:
                cell.fill = row_fill
            cell.border = BORDER
            cell.alignment = Alignment(vertical="center",
                                       horizontal="right" if col_idx in NUM_COLS else "left")
            if is_cancel:
                cell.font = CANCEL_FONT
            elif is_return and col_idx == 2:   # TYPE cell bold for returns
                cell.font = Font(bold=True, color="CC0000")
            if col_idx in NUM_COLS:
                cell.number_format = "#,##0.00"

        if is_cancel:
            ws.cell(row=row_idx, column=len(HEADERS) + 1, value="CANCEL").font = CANCEL_FONT

    data_end = data_start + len(invoices) - 1

    if invoices:
        # Totals
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

    # Group: platform → type
    by_platform: dict = defaultdict(list)
    by_platform_type: dict = defaultdict(lambda: defaultdict(list))
    for inv in invoices:
        platform = (inv.platform or "Other").strip()
        t = getattr(inv, "transaction_type", "Sale") or "Sale"
        by_platform[platform].append(inv)
        by_platform_type[platform][t].append(inv)

    platform_order = []
    for p in ["Flipkart", "Amazon"]:
        if p in by_platform:
            platform_order.append(p)
    for p in by_platform:
        if p not in platform_order:
            platform_order.append(p)

    for platform in platform_order:
        # Sales sheet
        sales_rows = by_platform_type[platform]["Sale"]
        if sales_rows:
            ws = wb.active if first else wb.create_sheet(f"{platform} Sales")
            if first:
                ws.title = f"{platform} Sales"
                first = False
            _write_sheet(ws, sales_rows, f"{platform.upper()} — SALES")

        # Returns sheet
        return_rows = by_platform_type[platform]["Return"]
        if return_rows:
            ws = wb.active if first else wb.create_sheet(f"{platform} Returns")
            if first:
                ws.title = f"{platform} Returns"
                first = False
            _write_sheet(ws, return_rows, f"{platform.upper()} — RETURNS")

        # Combined per platform
        ws = wb.active if first else wb.create_sheet(platform)
        if first:
            ws.title = platform
            first = False
        _write_sheet(ws, by_platform[platform], f"{platform.upper()} — ALL INVOICES")

    # All combined
    all_ws = wb.active if first else wb.create_sheet("ALL")
    if first:
        all_ws.title = "ALL"
    _write_sheet(all_ws, list(invoices), "ALL INVOICES")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
