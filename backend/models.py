from sqlalchemy import Boolean, Column, Float, Integer, String, DateTime, func
from database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # Exact columns from Amazon/Flipkart template
    platform = Column(String, nullable=True)           # Amazon | Flipkart | Other
    transaction_type = Column(String, default="Sale")  # Sale | Return
    qty = Column(Integer, nullable=True, default=1)
    party_name = Column(String, nullable=True)
    gst_number = Column(String, nullable=True)
    inv_no = Column(String, nullable=True)
    inv_date = Column(String, nullable=True)
    taxable_value = Column(Float, nullable=True)
    cgst9 = Column(Float, nullable=True)
    sgst9 = Column(Float, nullable=True)
    igst18 = Column(Float, nullable=True)
    party_address = Column(String, nullable=True)      # State
    cancelled = Column(Boolean, default=False)

    # Return linkage: if this is a Return, stores the ID of the Sale it cancels
    linked_sale_id = Column(Integer, nullable=True)

    # Meta
    document_file = Column(String, nullable=True)
    status = Column(String, default="processed")       # processed | error
    created_at = Column(DateTime, server_default=func.now())
