import uuid
import csv
from io import StringIO
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
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

@router.get("/template")
def download_event_template():
    content = "product_id,lot_number,location_id,event_type,event_timestamp,prev_traceability_code\nPROD-CF-01,LOT-2026-03,KHO-01,STATE_CHANGE,2026-03-09T10:00:00,TRC-ABCD-1234-EFGH\n"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=event_template.csv"}
    )

@router.post("/bulk")
async def upload_events_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_est: models.Establishment = Depends(get_current_establishment)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))
    
    batch = models.IngestionBatch(
        establishment_id=current_est.id,
        batch_reference=f"PORTAL-BULK-{uuid.uuid4()}",
        channel="PORTAL"
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    inserted = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            p_id = row.get('product_id', '').strip()
            lot = row.get('lot_number', '').strip()
            loc = row.get('location_id', '').strip()
            e_type = row.get('event_type', '').strip()
            e_time_str = row.get('event_timestamp', '').strip()
            prev_code = row.get('prev_traceability_code', '').strip()
            
            if not all([p_id, lot, loc, e_type, e_time_str]):
                errors.append(f"Row {row_num}: missing mandatory fields")
                continue
                
            e_time = datetime.fromisoformat(e_time_str)
            event_id = str(uuid.uuid4())
            t_code = assemble_traceability_code(current_est.business_code, event_id, prev_code or "NONE")
            
            db_event = models.TraceabilityEvent(
                id=event_id,
                traceability_code=t_code,
                product_id=p_id,
                lot_number=lot,
                location_id=loc,
                actor_id=current_est.business_code,
                event_type=e_type,
                event_timestamp=e_time,
                batch_id=batch.id
            )
            db.add(db_event)
            inserted += 1
        except Exception as e:
            errors.append(f"Row {row_num}: parsing error ({str(e)})")
            
    db.commit()
    return {
        "message": f"Successfully imported {inserted} events",
        "errors": errors,
        "batch_id": batch.id
    }
