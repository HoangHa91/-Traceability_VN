from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import csv
from io import StringIO
from typing import List

from ..database import get_db
from .. import models, schemas
from .auth import get_current_establishment

router = APIRouter(prefix="/api/products", tags=["products"])

@router.post("/", response_model=schemas.ProductResponse)
def create_product(
    product: schemas.ProductCreate, 
    db: Session = Depends(get_db),
    current_est: models.Establishment = Depends(get_current_establishment)
):
    # Check if this owner already registered this product_code
    db_product = db.query(models.Product).filter(
        models.Product.owner_id == current_est.id,
        models.Product.product_code == product.product_code
    ).first()
    
    if db_product:
        raise HTTPException(status_code=400, detail="Product code already exists for your establishment")
        
    db_item = models.Product(
        product_code=product.product_code,
        name=product.name,
        category=product.category,
        owner_id=current_est.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[schemas.ProductResponse])
def read_products(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db),
    current_est: models.Establishment = Depends(get_current_establishment)
):
    products = db.query(models.Product).filter(models.Product.owner_id == current_est.id).offset(skip).limit(limit).all()
    return products

@router.get("/template")
def download_product_template():
    content = "product_code,name,category\nPROD-001,Example Product,Ví dụ danh mục\n"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=product_template.csv"}
    )

@router.post("/bulk")
async def upload_products_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_est: models.Establishment = Depends(get_current_establishment)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))
    
    inserted = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        code = row.get('product_code', '').strip()
        name = row.get('name', '').strip()
        category = row.get('category', '').strip()
        
        if not code or not name:
            errors.append(f"Row {row_num}: product_code and name are required")
            continue
            
        exists = db.query(models.Product).filter(
            models.Product.owner_id == current_est.id,
            models.Product.product_code == code
        ).first()
        
        if exists:
            errors.append(f"Row {row_num}: product_code {code} already exists")
            continue
            
        db_item = models.Product(
            product_code=code,
            name=name,
            category=category,
            owner_id=current_est.id
        )
        db.add(db_item)
        inserted += 1
        
    db.commit()
    return {"message": f"Successfully imported {inserted} products", "errors": errors}
