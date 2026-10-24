"""Local demo storage; connections are opened and closed per operation."""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def migrate_measurements(connection):
    """Remove legacy NOT NULL constraints atomically, retaining IDs and indexes."""
    def needs_migration():
        return any(row["notnull"] for row in connection.execute("PRAGMA table_info(catches)")
                   if row["name"] in {"weight_lbs", "length_inches"})

    if not needs_migration():
        return
    with connection:
        connection.execute("BEGIN IMMEDIATE")
        if not needs_migration():
            return
        indexes = [row["sql"] for row in connection.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'catches' AND sql IS NOT NULL"
        )]
        sequence = connection.execute("SELECT seq FROM sqlite_sequence WHERE name = 'catches'").fetchone()
        connection.execute("""
            CREATE TABLE catches_nullable (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL REFERENCES users(username),
                species TEXT NOT NULL,
                weight_lbs REAL CHECK(weight_lbs > 0),
                length_inches REAL CHECK(length_inches > 0),
                created_at TEXT NOT NULL,
                photo_data TEXT,
                disposition TEXT NOT NULL DEFAULT 'unknown'
            )
        """)
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(catches)")}
        photo = "photo_data" if "photo_data" in columns else "NULL"
        disposition = "disposition" if "disposition" in columns else "'unknown'"
        connection.execute(f"""
            INSERT INTO catches_nullable(id, username, species, weight_lbs, length_inches, created_at, photo_data, disposition)
            SELECT id, username, species, weight_lbs, length_inches, created_at, {photo}, {disposition} FROM catches
        """)
        connection.execute("DROP TABLE catches")
        connection.execute("ALTER TABLE catches_nullable RENAME TO catches")
        for statement in indexes:
            connection.execute(statement)
        if sequence is not None:
            connection.execute("UPDATE sqlite_sequence SET seq = ? WHERE name = 'catches'", (sequence["seq"],))


@contextmanager
def connect():
    path = Path(os.environ.get("DEMO_DB_PATH", Path(__file__).parent / "data" / "demo.sqlite3"))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS catches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL REFERENCES users(username),
                species TEXT NOT NULL,
                weight_lbs REAL CHECK(weight_lbs > 0),
                length_inches REAL CHECK(length_inches > 0),
                created_at TEXT NOT NULL,
                photo_data TEXT,
                disposition TEXT NOT NULL DEFAULT 'unknown'
            );
            CREATE INDEX IF NOT EXISTS catches_by_user ON catches(username, id);
        """)
        # Upgrade existing demo journals without losing their entries.
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(catches)")}
        if "photo_data" not in columns:
            connection.execute("ALTER TABLE catches ADD COLUMN photo_data TEXT")
        if "disposition" not in columns:
            connection.execute("ALTER TABLE catches ADD COLUMN disposition TEXT NOT NULL DEFAULT 'unknown'")
        migrate_measurements(connection)
        with connection:
            yield connection
    finally:
        connection.close()
