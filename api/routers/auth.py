from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

# Auth Configuration
SECRET_KEY = "moit-traceability-secret-key-for-mvp-only"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

router = APIRouter(prefix="/api/auth", tags=["auth"])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_establishment(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        business_code: str = payload.get("sub")
        if business_code is None:
            raise credentials_exception
        token_data = schemas.TokenData(business_code=business_code)
    except JWTError:
        raise credentials_exception
        
    est = db.query(models.Establishment).filter(models.Establishment.business_code == token_data.business_code).first()
    if est is None:
        raise credentials_exception
    return est

@router.post("/register", response_model=schemas.EstablishmentResponse)
def register_establishment(est: schemas.EstablishmentCreate, db: Session = Depends(get_db)):
    db_est = db.query(models.Establishment).filter(models.Establishment.business_code == est.business_code).first()
    if db_est:
        raise HTTPException(status_code=400, detail="Business code already registered")
    
    hashed_password = get_password_hash(est.password)
    new_est = models.Establishment(
        business_code=est.business_code,
        name=est.name,
        province_code=est.province_code,
        hashed_password=hashed_password,
        tier="PORTAL" # Default for SME MVP
    )
    db.add(new_est)
    db.commit()
    db.refresh(new_est)
    return new_est

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    est = db.query(models.Establishment).filter(models.Establishment.business_code == form_data.username).first()
    if not est or not verify_password(form_data.password, est.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect business code or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": est.business_code}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.EstablishmentResponse)
def read_users_me(current_est: Annotated[models.Establishment, Depends(get_current_establishment)]):
    return current_est

@router.put("/me", response_model=schemas.EstablishmentResponse)
def update_users_me(
    update_data: schemas.EstablishmentUpdate,
    current_est: Annotated[models.Establishment, Depends(get_current_establishment)],
    db: Session = Depends(get_db)
):
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(current_est, key, value)
    
    db.commit()
    db.refresh(current_est)
    return current_est
