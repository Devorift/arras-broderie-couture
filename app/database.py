import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/atelier.db")

if DATABASE_URL.startswith("sqlite:///"):
    path = DATABASE_URL.replace("sqlite:///", "", 1)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
