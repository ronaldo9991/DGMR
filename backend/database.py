import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Railway Postgres — fix the legacy postgres:// scheme
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print(f"[DB] Using PostgreSQL", flush=True)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,       # auto-reconnect on dropped connections
        pool_size=5,
        max_overflow=10,
    )
else:
    # Local development only — SQLite
    from pathlib import Path
    db_path = str(Path(os.getenv("DB_PATH", "dgmr.db")).resolve())
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    print(f"[DB] Using SQLite at: {db_path}", flush=True)
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
