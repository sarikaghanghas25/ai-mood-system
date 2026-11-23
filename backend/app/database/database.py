from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


def database_url() -> str:
    """Hosts like Neon and Heroku hand out "postgres://", SQLAlchemy wants "postgresql://"."""
    url = settings.DATABASE_URL

    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    return url


DATABASE_URL = database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    # SQLite only: let FastAPI's worker threads share the connection
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    # Hosted Postgres closes idle connections; reconnect instead of failing
    pool_pre_ping=not IS_SQLITE,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def add_missing_columns():
    """
    Small migration for columns added after the tables were created.
    Only adds nullable columns, so existing rows are kept as they are.
    """
    table_columns = {
        "mood_history": {"moods": "VARCHAR(100)"},
    }

    inspector = inspect(engine)

    with engine.begin() as connection:
        for table, columns in table_columns.items():
            if not inspector.has_table(table):
                continue

            existing = {column["name"] for column in inspector.get_columns(table)}

            for name, column_type in columns.items():
                if name not in existing:
                    connection.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN {name} {column_type}")
                    )


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()