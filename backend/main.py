import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from routes import upload, records, excel, stats, returns

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DGMR TECH OCR Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes (registered BEFORE anything else) ─────────────────────────
app.include_router(upload.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(excel.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(returns.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}

# ── Static assets (JS / CSS bundles under /assets/) ──────────────────────
STATIC_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
ASSETS_DIR = STATIC_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

# ── SPA catch-all: serve index.html for every non-API path ───────────────
# This is the correct way to handle React Router / BrowserRouter in FastAPI.
# The /{full_path:path} route matches /, /records, /upload, etc.
INDEX_HTML = STATIC_DIR / "index.html"

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))
    return {"service": "DGMR TECH OCR Dashboard API", "status": "ok"}
