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
    database_url = get_settings().sqlalchemy_url
    engine_options: dict[str, object] = {"pool_pre_ping": True}
    if database_url.startswith("sqlite:"):
        engine_options["connect_args"] = {"check_same_thread": False}
    else:
        engine_options["pool_recycle"] = 1800
    engine = create_engine(database_url, **engine_options)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("Database is not initialized. Configure a database and start the application.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
