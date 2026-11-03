from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = None
SessionLocal = None


def initialize_database() -> None:
    global engine, SessionLocal
    engine = create_engine(get_settings().sqlalchemy_url, pool_pre_ping=True, pool_recycle=1800)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("Database is not initialized. Configure MySQL and start the application.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
