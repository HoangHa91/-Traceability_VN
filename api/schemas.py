from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    STATE_CHANGE = "STATE_CHANGE"
    PROPERTY_CHANGE = "PROPERTY_CHANGE"
    OWNERSHIP_CHANGE = "OWNERSHIP_CHANGE"

# --- Token & Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    business_code: str | None = None

class EstablishmentCreate(BaseModel):
    business_code: str
    name: str
    password: str
    province_code: Optional[str] = None

class EstablishmentResponse(BaseModel):
    business_code: str
    name: str
    tier: str
    model_config = {"from_attributes": True}

# --- Products ---
class ProductCreate(BaseModel):
    product_code: str
    name: str
    category: Optional[str] = None

class ProductResponse(ProductCreate):
    id: str
    created_at: datetime
    model_config = {"from_attributes": True}

# --- Events ---
class TraceabilityEventCreate(BaseModel):
    product_id: str
    lot_number: str
    location_id: str
    event_type: EventType
    event_timestamp: datetime
    
    # Optional linking (if known at ingest time)
    prev_traceability_code: Optional[str] = None

class TraceabilityEventResponse(TraceabilityEventCreate):
    id: str
    traceability_code: str
    actor_id: str
    created_at: datetime
    model_config = {"from_attributes": True}

class BatchSubmission(BaseModel):
    events: List[TraceabilityEventCreate]
