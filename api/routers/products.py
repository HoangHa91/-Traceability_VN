from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
