import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

HEADERS = [
    "Invoice No", "Date", "Customer Name", "From Station", "To Station",
    "Consignment No", "Goods Description", "Weight (kg)", "Rate (₹/kg)",
    "Freight Amount (₹)", "GST %", "GST Amount (₹)", "Total Amount (₹)",
    "Type", "Payment Status", "Document File",
]

FIELD_MAP = [
    "invoice_no", "date", "customer_name", "from_station", "to_station",
    "consignment_no", "goods_description", "weight_kg", "rate_per_kg",
    "freight_amount", "gst_percent", "gst_amount", "total_amount",
    "type", "payment_status", "document_file",
]

HEADER_FILL = PatternFill("solid", fgColor="1A56DB")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
SALE_FILL = PatternFill("solid", fgColor="E8F5E9")
RETURN_FILL = PatternFill("solid", fgColor="FFF3E0")
THIN = Side(style="thin", color="D1D5DB")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def build_excel(invoices) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoices"

    # Header row
    for col_idx, header in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER

    ws.row_dimensions[1].height = 30

    # Data rows
    for row_idx, inv in enumerate(invoices, start=2):
        row_fill = RETURN_FILL if getattr(inv, "type", "") == "Return" else SALE_FILL
        for col_idx, field in enumerate(FIELD_MAP, start=1):
            val = getattr(inv, field, None)
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.fill = row_fill
            cell.border = BORDER
            cell.alignment = Alignment(vertical="center")

    # Auto-fit column widths
    for col_idx, header in enumerate(HEADERS, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = len(header)
        for row_idx in range(2, ws.max_row + 1):
            val = ws.cell(row=row_idx, column=col_idx).value
            if val:
                max_len = max(max_len, len(str(val)))
        ws.column_dimensions[col_letter].width = min(max_len + 4, 40)

    # Freeze header row
    ws.freeze_panes = "A2"

    # Summary sheet
    ws_summary = wb.create_sheet("Summary")
    ws_summary["A1"] = "DGMR TECH — Invoice Summary"
    ws_summary["A1"].font = Font(bold=True, size=14, color="1A56DB")

    total_sales = sum(
        (inv.total_amount or 0) for inv in invoices if getattr(inv, "type", "") != "Return"
    )
    total_returns = sum(
        (inv.total_amount or 0) for inv in invoices if getattr(inv, "type", "") == "Return"
    )
    sales_count = sum(1 for inv in invoices if getattr(inv, "type", "") != "Return")
    returns_count = sum(1 for inv in invoices if getattr(inv, "type", "") == "Return")
    paid_count = sum(1 for inv in invoices if getattr(inv, "payment_status", "") == "Paid")
    pending_count = sum(1 for inv in invoices if getattr(inv, "payment_status", "") == "Pending")

    rows = [
        ("Total Invoices", len(invoices)),
        ("Sales Count", sales_count),
        ("Returns Count", returns_count),
        ("Total Sales Amount (₹)", total_sales),
        ("Total Returns Amount (₹)", total_returns),
        ("Net Revenue (₹)", total_sales - total_returns),
        ("Paid Invoices", paid_count),
        ("Pending Invoices", pending_count),
    ]

    for i, (label, value) in enumerate(rows, start=3):
        ws_summary.cell(row=i, column=1, value=label).font = Font(bold=True)
        ws_summary.cell(row=i, column=2, value=value)

    ws_summary.column_dimensions["A"].width = 30
    ws_summary.column_dimensions["B"].width = 20

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
