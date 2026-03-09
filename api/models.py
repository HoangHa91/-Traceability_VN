import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Establishment(Base):
    __tablename__ = "establishments"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_code = Column(String, unique=True, index=True, nullable=False) # MST
    name = Column(String, nullable=False)
    province_code = Column(String(2))
    hashed_password = Column(String, nullable=False) # Added for SME web login MVP
    tier = Column(String, default="PORTAL") # PORTAL | API | SFTP
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    products = relationship("Product", back_populates="owner")
    batches = relationship("IngestionBatch", back_populates="establishment")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    product_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    owner_id = Column(String, ForeignKey("establishments.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("Establishment", back_populates="products")


class IngestionBatch(Base):
    __tablename__ = "ingestion_batches"

    id = Column(String, primary_key=True, default=generate_uuid)
    establishment_id = Column(String, ForeignKey("establishments.id"))
    batch_reference = Column(String, nullable=False)
    channel = Column(String, default="PORTAL")
    status = Column(String, default="VALID")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    establishment = relationship("Establishment", back_populates="batches")
    events = relationship("TraceabilityEvent", back_populates="batch")


class TraceabilityEvent(Base):
    """Hot Storage MVP mapping"""
    __tablename__ = "traceability_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    traceability_code = Column(String, unique=True, index=True) # Generated
    
    product_id = Column(String, nullable=False) # relates to product_code
    lot_number = Column(String, nullable=False)
    location_id = Column(String, nullable=False)
    actor_id = Column(String, nullable=False) # establishment business_code
    
    event_type = Column(String, nullable=False) # STATE_CHANGE, PROPERTY_CHANGE, OWNERSHIP_CHANGE
    event_timestamp = Column(DateTime, nullable=False)
    
    prev_event_id = Column(String, ForeignKey("traceability_events.id"), nullable=True)
    next_event_id = Column(String, ForeignKey("traceability_events.id"), nullable=True)
    
    batch_id = Column(String, ForeignKey("ingestion_batches.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    batch = relationship("IngestionBatch", back_populates="events")
