import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use SQLite for MVP simplicity to guarantee Plug-and-Play without external DB setup
# Can be easily swapped to postgresql://user:pass@localhost/moit
DATABASE_URL = "sqlite:///./traceability_mvp.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
