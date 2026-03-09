from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth, products, events

# Initialize SQLite Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MoIT SME Web Portal API",
    description="Backend API for SME establishments to register products and submit traceability events.",
    version="1.0.0"
)

# Allow React frontend to connect
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(events.router)

@app.get("/")
def read_root():
    return {"message": "MoIT Traceability API MVP is running. Head to /docs for Swagger UI."}
