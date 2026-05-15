from sqlalchemy import Column, Integer, String, Float, DateTime, func
from database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String, nullable=True)
    date = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    from_station = Column(String, nullable=True)
    to_station = Column(String, nullable=True)
    consignment_no = Column(String, nullable=True)
    goods_description = Column(String, nullable=True)
    weight_kg = Column(Float, nullable=True)
    rate_per_kg = Column(Float, nullable=True)
    freight_amount = Column(Float, nullable=True)
    gst_percent = Column(Float, nullable=True)
    gst_amount = Column(Float, nullable=True)
    total_amount = Column(Float, nullable=True)
    type = Column(String, nullable=True)           # Sale | Return
    payment_status = Column(String, nullable=True)  # Paid | Pending | Partial
    document_file = Column(String, nullable=True)
    status = Column(String, default="processed")   # processed | error
    created_at = Column(DateTime, server_default=func.now())
