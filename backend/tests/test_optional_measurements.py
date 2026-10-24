import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.database import connect, migrate_measurements
from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DEMO_DB_PATH", str(tmp_path / "test.sqlite3"))
    with TestClient(app) as client:
        client.post("/auth/login", json={"username": "demo"})
        yield client


@pytest.mark.parametrize("measurements", [{}, {"weight_lbs": None, "length_inches": None},
    {"weight_lbs": 2}, {"length_inches": 16}, {"weight_lbs": 2, "length_inches": 16}])
def test_save_and_fetch_optional_measurements(client, measurements):
    headers = {"X-Username": "demo"}
    response = client.post("/catches", headers=headers, json={"species": "Bluegill", **measurements})
    assert response.status_code == 201
    saved = response.json()
    assert saved["weight_lbs"] == measurements.get("weight_lbs")
    assert saved["length_inches"] == measurements.get("length_inches")
    assert client.get("/catches", headers=headers).json() == [saved]


@pytest.mark.parametrize("field", ["weight_lbs", "length_inches"])
@pytest.mark.parametrize("value", [0, -1, "N/A", "", "Infinity", "NaN", "not a number"])
def test_invalid_supplied_measurements(client, field, value):
    assert client.post("/catches", headers={"X-Username": "demo"}, json={"species": "Bass", field: value}).status_code == 422
    assert client.post("/regulations/check", json={"species_id": "micropterus_salmoides", field: value}).status_code == 422


@pytest.mark.parametrize("measurements", [{}, {"length_inches": None}, {"weight_lbs": 2}, {"weight_lbs": None, "length_inches": None}])
def test_rules_without_length_return_guidance_not_comparison(client, measurements):
    response = client.post("/regulations/check", json={"species_id": "micropterus_salmoides", **measurements})
    assert response.status_code == 200
    result = response.json()
    assert result["length_inches"] is None
    assert result["weight_lbs"] == measurements.get("weight_lbs")
    assert result["length_result"] == "not_evaluated"
    assert "not provided" in result["length_guidance"]
    assert result["minimum_length_inches"] == 12
    assert result["sources"]
    assert result["daily_limit"]["limit"] == 10
    assert result["legal_status"] == "undetermined"


def test_supplied_length_compares_even_without_weight(client):
    result = client.post("/regulations/check", json={"species_id": "micropterus_salmoides", "length_inches": 11}).json()
    assert result["length_result"] == "below_baseline"
    assert result["weight_lbs"] is None


@pytest.mark.parametrize("keep_record", [True, False])
def test_legacy_migration_preserves_data_indexes_sequence_and_is_repeatable(tmp_path, monkeypatch, keep_record):
    path = tmp_path / "legacy.sqlite3"
    monkeypatch.setenv("DEMO_DB_PATH", str(path))
    with sqlite3.connect(path) as old:
        old.executescript("""
            CREATE TABLE users(username TEXT PRIMARY KEY);
            INSERT INTO users VALUES ('demo');
            CREATE TABLE catches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL REFERENCES users(username), species TEXT NOT NULL,
                weight_lbs REAL NOT NULL CHECK(weight_lbs > 0),
                length_inches REAL NOT NULL CHECK(length_inches > 0), created_at TEXT NOT NULL
            );
            CREATE INDEX custom_catch_species ON catches(species);
            INSERT INTO catches VALUES (3, 'demo', 'Bluegill', 2.5, 12, '2026-10-24T12:00:00Z');
            INSERT INTO catches VALUES (100, 'demo', 'Bass', 3, 16, '2026-10-24T13:00:00Z');
            DELETE FROM catches WHERE id = 100;
        """)
        if not keep_record:
            old.execute("DELETE FROM catches")
    with connect() as db:
        rows = db.execute("SELECT * FROM catches").fetchall()
        assert len(rows) == int(keep_record)
        if keep_record:
            assert dict(rows[0]) == dict(id=3, username="demo", species="Bluegill", weight_lbs=2.5, length_inches=12, created_at="2026-10-24T12:00:00Z")
        indexes = {row["name"] for row in db.execute("PRAGMA index_list(catches)")}
        assert {"custom_catch_species", "catches_by_user"} <= indexes
        cursor = db.execute("INSERT INTO catches(username, species, created_at) VALUES ('demo','Trout','2026-10-24')")
        assert cursor.lastrowid == 101
    with connect() as db:
        assert db.execute("SELECT weight_lbs, length_inches FROM catches WHERE id=101").fetchone()[:] == (None, None)
        with pytest.raises(sqlite3.IntegrityError):
            db.execute("INSERT INTO catches(username,species,weight_lbs,created_at) VALUES ('demo','Bass',0,'today')")
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []


def test_migration_failure_rolls_back_original_table_and_rows(tmp_path):
    with sqlite3.connect(tmp_path / "rollback.sqlite3") as db:
        db.row_factory = sqlite3.Row
        db.executescript("""
            CREATE TABLE users(username TEXT PRIMARY KEY);
            INSERT INTO users VALUES ('demo');
            CREATE TABLE catches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL REFERENCES users(username), species TEXT NOT NULL,
                weight_lbs REAL NOT NULL CHECK(weight_lbs > 0),
                length_inches REAL NOT NULL CHECK(length_inches > 0), created_at TEXT NOT NULL
            );
            INSERT INTO catches VALUES (5, 'demo', 'Bluegill', 2, 12, 'today');
        """)
        db.set_authorizer(lambda operation, *args: sqlite3.SQLITE_DENY if operation == sqlite3.SQLITE_ALTER_TABLE else sqlite3.SQLITE_OK)
        with pytest.raises(sqlite3.DatabaseError):
            migrate_measurements(db)
        db.set_authorizer(None)
        assert db.execute("SELECT species FROM catches WHERE id=5").fetchone()[0] == "Bluegill"
        assert all(row["notnull"] for row in db.execute("PRAGMA table_info(catches)") if row["name"] in {"weight_lbs", "length_inches"})
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='catches_nullable'").fetchall()
