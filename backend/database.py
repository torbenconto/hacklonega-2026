"""Local demo storage; connections are opened and closed per operation."""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


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
                weight_lbs REAL NOT NULL CHECK(weight_lbs > 0),
                length_inches REAL NOT NULL CHECK(length_inches > 0),
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS catches_by_user ON catches(username, id);
        """)
        with connection:
            yield connection
    finally:
        connection.close()
