import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

app.include_router(upload.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(excel.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve React SPA — must come AFTER API routes
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
INDEX_HTML = os.path.join(STATIC_DIR, "index.html")


def _serve_index():
    return FileResponse(INDEX_HTML)


if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/")
    def serve_root():
        return _serve_index()

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return _serve_index()
else:
    @app.get("/")
    def root():
        return {
            "service": "DGMR TECH OCR Dashboard API",
            "status": "ok",
            "docs": "/docs",
            "health": "/api/health",
        }
