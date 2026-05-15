import io
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Exact column headers matching the provided templates
HEADERS = ["QTY", "PARTY NAME", "GST NUMBER", "INV NO", "INV DATE",
           "TAXABLE VALUE", "CGST9", "SGST9", "IGST18", "PARTY ADDRESS"]

FIELDS = ["qty", "party_name", "gst_number", "inv_no", "inv_date",
          "taxable_value", "cgst9", "sgst9", "igst18", "party_address"]

# Styling
TITLE_FONT = Font(bold=True, size=13)
HEADER_FONT = Font(bold=True, size=11)
HEADER_FILL = PatternFill("solid", fgColor="D9E1F2")   # light blue-grey like original
CANCEL_FONT = Font(color="FF0000", bold=True)
TOTAL_FONT = Font(bold=True, size=11)
TOTAL_FILL = PatternFill("solid", fgColor="FFF2CC")    # light yellow for totals
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

# Column widths to match original look
COL_WIDTHS = [6, 28, 18, 8, 12, 16, 12, 12, 12, 20]


def _write_platform_sheet(ws, invoices, title: str):
    """Write invoices to a worksheet in the exact template format."""

    # Row 1: Title
    ws["A1"] = title
    ws["A1"].font = TITLE_FONT
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 22

    # Row 2: Empty
    ws.row_dimensions[2].height = 6

    # Row 3: Column headers
    for col_idx, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=3, column=col_idx, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[3].height = 28

    # Row 4: Empty
    ws.row_dimensions[4].height = 6

    # Data rows start at row 5
    data_start = 5
    for row_idx, inv in enumerate(invoices, start=data_start):
        for col_idx, field in enumerate(FIELDS, start=1):
            val = getattr(inv, field, None)
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.border = BORDER
            cell.alignment = Alignment(vertical="center")
            # Right-align numbers
            if field in ("qty", "taxable_value", "cgst9", "sgst9", "igst18"):
                cell.alignment = Alignment(horizontal="right", vertical="center")
            # Mark cancelled rows in red
            if getattr(inv, "cancelled", False):
                cell.font = CANCEL_FONT

        # CANCEL label in col 11 if cancelled
        if getattr(inv, "cancelled", False):
            cancel_cell = ws.cell(row=row_idx, column=11, value="CANCEL")
            cancel_cell.font = CANCEL_FONT

    # Totals row
    data_end = data_start + len(invoices) - 1
    if len(invoices) > 0:
        totals_row = data_end + 2
        ws.cell(row=totals_row, column=1, value="TOTAL").font = TOTAL_FONT
        ws.cell(row=totals_row, column=1).fill = TOTAL_FILL
        ws.cell(row=totals_row, column=1).alignment = Alignment(horizontal="center")

        for col_idx, field in enumerate(FIELDS, start=1):
            if field in ("taxable_value", "cgst9", "sgst9", "igst18"):
                col_letter = get_column_letter(col_idx)
                cell = ws.cell(
                    row=totals_row,
                    column=col_idx,
                    value=f"=SUM({col_letter}{data_start}:{col_letter}{data_end})",
                )
                cell.font = TOTAL_FONT
                cell.fill = TOTAL_FILL
                cell.number_format = "#,##0.00"
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.border = BORDER

    # Number formats for numeric cols
    for row_idx in range(data_start, data_end + 1):
        for col_idx, field in enumerate(FIELDS, start=1):
            if field in ("taxable_value", "cgst9", "sgst9", "igst18"):
                ws.cell(row=row_idx, column=col_idx).number_format = "#,##0.00"

    # Column widths
    for col_idx, width in enumerate(COL_WIDTHS, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    # Freeze header
    ws.freeze_panes = f"A{data_start}"


def build_excel(invoices) -> bytes:
    wb = Workbook()

    # Group by platform
    by_platform = defaultdict(list)
    for inv in invoices:
        platform = (inv.platform or "Other").strip()
        by_platform[platform].append(inv)

    # Create one sheet per platform in order: Flipkart, Amazon, then others
    platform_order = []
    for p in ["Flipkart", "Amazon"]:
        if p in by_platform:
            platform_order.append(p)
    for p in by_platform:
        if p not in platform_order:
            platform_order.append(p)

    first = True
    for platform in platform_order:
        rows = by_platform[platform]
        if first:
            ws = wb.active
            ws.title = platform
            first = False
        else:
            ws = wb.create_sheet(platform)

        # Build title like the originals: "FLIPKART ALL INVOICES" / "AMAZON CJB1 ALL INVOICES"
        title = f"{platform.upper()} ALL INVOICES"
        _write_platform_sheet(ws, rows, title)

    # All combined sheet
    ws_all = wb.create_sheet("ALL INVOICES")
    _write_platform_sheet(ws_all, list(invoices), "ALL INVOICES")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
