"""
Pydantic schemas for MoIT Traceability Event validation.
These define the mandatory fields and accepted event types per Article 5 & 12.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class EventType(str, Enum):
    STATE_CHANGE     = "STATE_CHANGE"
    PROPERTY_CHANGE  = "PROPERTY_CHANGE"
    OWNERSHIP_CHANGE = "OWNERSHIP_CHANGE"


class IngestionChannel(str, Enum):
    SFTP   = "SFTP"
    API    = "API"
    PORTAL = "PORTAL"


# ---------------------------------------------------------------------------
# Core traceability event schema (mandatory fields per MoIT spec)
# ---------------------------------------------------------------------------

class TraceabilityEventIn(BaseModel):
    """
    Input schema for a single traceability event.
    All four mandatory fields must be present and non-empty.
    """

    # --- Mandatory fields (MoIT Article 5) ---
    product_id:  str = Field(..., min_length=1, max_length=50,  description="Mã sản phẩm")
    location_id: str = Field(..., min_length=1, max_length=50,  description="Mã địa điểm")
    timestamp:   datetime = Field(...,                          description="Thời điểm sự kiện (ISO 8601)")
    lot_number:  str = Field(..., min_length=1, max_length=50,  description="Số lô hàng")

    # --- Event classification ---
    event_type:  EventType = Field(...,                         description="Loại sự kiện truy xuất")
    actor_id:    str = Field(..., min_length=1, max_length=50,  description="Mã cơ sở (xác thực OAuth2)")

    # --- One-before / one-after links (optional at ingest, resolved by Linker) ---
    supplier_ref: Optional[str] = Field(None, max_length=64,   description="Mã tham chiếu nhà cung cấp")
    customer_ref: Optional[str] = Field(None, max_length=64,   description="Mã tham chiếu khách hàng")

    # --- Flexible payload for event-specific attributes ---
    payload: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Dữ liệu bổ sung theo loại sự kiện",
    )

    @field_validator("timestamp")
    @classmethod
    def timestamp_not_future(cls, v: datetime) -> datetime:
        """Events cannot be timestamped in the future."""
        if v > datetime.utcnow():
            raise ValueError("Timestamp không được ở tương lai")
        return v

    @field_validator("product_id", "location_id", "lot_number", "actor_id")
    @classmethod
    def no_whitespace_only(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Giá trị không được chỉ chứa khoảng trắng")
        return v.strip()

    model_config = {"str_strip_whitespace": True, "use_enum_values": True}


# ---------------------------------------------------------------------------
# Batch submission envelope
# ---------------------------------------------------------------------------

class BatchSubmissionIn(BaseModel):
    """
    Envelope for a Bulk API batch submission (≤ 500 events per request).
    """

    batch_reference: str = Field(..., description="ID duy nhất do cơ sở tạo (idempotency key)")
    submission_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD")
    channel:         IngestionChannel = Field(..., description="Kênh nộp dữ liệu")
    events:          list[TraceabilityEventIn] = Field(..., min_length=1, max_length=500)

    @model_validator(mode="after")
    def check_all_events_same_actor(self) -> "BatchSubmissionIn":
        """All events in a batch must come from the same establishment."""
        actor_ids = {e.actor_id for e in self.events}
        if len(actor_ids) > 1:
            raise ValueError(
                f"Batch phải chứa sự kiện từ một cơ sở duy nhất. Tìm thấy: {actor_ids}"
            )
        return self


# ---------------------------------------------------------------------------
# Validated event (output from Validation Engine, input to Linker)
# ---------------------------------------------------------------------------

class TraceabilityEventValidated(TraceabilityEventIn):
    batch_id:        UUID
    validation_hash: str = Field(..., description="SHA-256 hash of the raw record for dedup")
    ingested_at:     datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Quarantined record (failed validation)
# ---------------------------------------------------------------------------

class QuarantinedRecord(BaseModel):
    batch_id:        UUID
    raw_data:        Dict[str, Any]
    error_messages:  list[str]
    quarantined_at:  datetime = Field(default_factory=datetime.utcnow)
