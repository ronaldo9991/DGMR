import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Always use SQLite on the Railway persistent volume.
# DB_PATH env var can override; defaults to /data/dgmr.db (Railway volume).
# We deliberately ignore DATABASE_URL — that would point to an empty Postgres
# instance and bypass the SQLite volume where all uploaded data lives.
db_path = str(Path(os.getenv("DB_PATH", "/data/dgmr.db")).resolve())
os.makedirs(os.path.dirname(db_path), exist_ok=True)

print(f"[DB] SQLite path: {db_path}", flush=True)

engine = create_engine(
    f"sqlite:///{db_path}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
