import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routes import upload, records, excel, stats

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DGMR TECH OCR Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes (must be registered BEFORE the static mount) ──────────────
app.include_router(upload.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(excel.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── React SPA — registered last so API routes always win ─────────────────
# StaticFiles with html=True serves index.html for ANY path that doesn't
# match a real file — this is the correct SPA reload fix.
STATIC_DIR = str(Path(__file__).resolve().parent.parent / "frontend" / "dist")

if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"service": "DGMR TECH OCR Dashboard API", "status": "ok"}
