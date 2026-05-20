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


@app.get("/api/debug/db")
def debug_db():
    """Shows exactly which database file is in use and how many records exist."""
    from sqlalchemy import text
    from database import engine, db_path
    db_file = db_path
    exists = os.path.exists(db_file)
    size_kb = round(os.path.getsize(db_file) / 1024, 1) if exists else 0
    with engine.connect() as conn:
        row_count = conn.execute(text("SELECT COUNT(*) FROM invoices")).scalar()
    return {
        "db_path": db_file,
        "file_exists": exists,
        "file_size_kb": size_kb,
        "row_count": row_count,
        "database_url_env": os.getenv("DATABASE_URL", "(not set)"),
        "db_path_env": os.getenv("DB_PATH", "(not set — using default /data/dgmr.db)"),
    }


@app.get("/api/debug/migrate-from-postgres")
def migrate_from_postgres():
    """
    ONE-TIME migration: reads all rows from a Postgres DATABASE_URL and
    writes them into the local SQLite database. Set POSTGRES_MIGRATE_URL
    in Railway Variables to the old Postgres connection string, then hit
    this endpoint once. Remove the env var after migration.
    """
    import sqlalchemy as sa
    from database import engine as sqlite_engine, db_path
    from models import Invoice

    pg_url = os.getenv("POSTGRES_MIGRATE_URL")
    if not pg_url:
        return {"error": "Set POSTGRES_MIGRATE_URL env var in Railway Variables to your old Postgres connection string first."}

    if pg_url.startswith("postgres://"):
        pg_url = pg_url.replace("postgres://", "postgresql://", 1)

    try:
        pg_engine = sa.create_engine(pg_url)
        with pg_engine.connect() as pg_conn:
            rows = pg_conn.execute(sa.text("SELECT * FROM invoices")).mappings().all()
    except Exception as e:
        return {"error": f"Could not connect to Postgres: {e}"}

    if not rows:
        return {"migrated": 0, "message": "Postgres invoices table is empty — data may be gone."}

    from database import SessionLocal
    db = SessionLocal()
    count = 0
    try:
        for r in rows:
            d = dict(r)
            d.pop("id", None)  # let SQLite assign new IDs
            db.add(Invoice(**d))
            count += 1
        db.commit()
    except Exception as e:
        db.rollback()
        return {"error": f"Insert failed: {e}"}
    finally:
        db.close()

    return {
        "migrated": count,
        "sqlite_path": db_path,
        "message": f"Successfully migrated {count} records from Postgres → SQLite. Remove POSTGRES_MIGRATE_URL now.",
    }


# Serve React SPA — must come AFTER API routes
STATIC_DIR = str(Path(__file__).resolve().parent.parent / "frontend" / "dist")
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
