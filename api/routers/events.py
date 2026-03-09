import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from .auth import get_current_establishment

router = APIRouter(prefix="/api/events", tags=["events"])

def assemble_traceability_code(supplier_code: str, event_id: str, customer_code: str = "") -> str:
    """Mock implementation of the MoIT 'One-Before/One-After' traceability code linker"""
    return f"TRC-{supplier_code[:4]}-{str(event_id)[:8]}-{customer_code[:4]}".upper()

@router.post("/", response_model=schemas.TraceabilityEventResponse)
def submit_single_event(
    event: schemas.TraceabilityEventCreate, 
    db: Session = Depends(get_db),
    current_est: models.Establishment = Depends(get_current_establishment)
):
    # Setup dummy ingestion batch for the web portal submission
    batch = models.IngestionBatch(
        establishment_id=current_est.id,
        batch_reference=f"PORTAL-{uuid.uuid4()}",
        channel="PORTAL"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Note: Full Validation Engine checks would go here. Enforcing mandatory specs locally.
    
    event_id = str(uuid.uuid4())
    
    # Assembly logic mock depending on if there is a previous link
    t_code = assemble_traceability_code(
        current_est.business_code, 
        event_id, 
        event.prev_traceability_code or "NONE"
    )

    db_event = models.TraceabilityEvent(
        id=event_id,
        traceability_code=t_code,
        product_id=event.product_id,
        lot_number=event.lot_number,
        location_id=event.location_id,
        actor_id=current_est.business_code, # Verified via OAuth2
        event_type=event.event_type.value,
        event_timestamp=event.event_timestamp,
        batch_id=batch.id
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/", response_model=List[schemas.TraceabilityEventResponse])
def get_recent_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_est: models.Establishment = Depends(get_current_establishment)
):
    """Get the recent traceability events submitted by the SME for the dashboard"""
    return db.query(models.TraceabilityEvent)\
             .filter(models.TraceabilityEvent.actor_id == current_est.business_code)\
             .order_by(models.TraceabilityEvent.event_timestamp.desc())\
             .limit(limit)\
             .all()
