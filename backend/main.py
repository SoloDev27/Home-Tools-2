import os
from dotenv import load_dotenv

# Load .env before importing anything that reads configuration at import time.
# jwt.py refuses to start without SECRET_KEY, and the routes import it, so this
# must run first - relying on another module's side-effect load is fragile.
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.db import init_db
from app.routes import router as api_router

PROJECT_ENV = os.environ.get("PROJECT_ENV", "development")

app = FastAPI(title="API")

frontend_port = os.environ.get("FRONTEND", "3000")
backend_port = os.environ.get("BACKEND", "8000")
origins = [
    "http://localhost",
    f"http://localhost:{frontend_port}",
    f"http://127.0.0.1:{frontend_port}",
    f"http://localhost:{backend_port}",
    f"http://127.0.0.1:{backend_port}",
    "http://localhost:10000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
    
init_db()

print("PROJECT ENV - MAIN", PROJECT_ENV)


app.include_router(api_router)