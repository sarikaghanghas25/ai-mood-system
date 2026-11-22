from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
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