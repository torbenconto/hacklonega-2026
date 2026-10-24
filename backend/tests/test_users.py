from datetime import datetime
import sqlite3

import pytest
from fastapi.testclient import TestClient

from backend.main import app


FISH = {"species": "largemouth bass", "weight_lbs": 2.5, "length_inches": 16}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DEMO_DB_PATH", str(tmp_path / "demo.sqlite3"))
    with TestClient(app) as client:
        yield client


def login(client, username="colin"):
    response = client.post("/auth/login", json={"username": username})
    assert response.status_code == 200
    return {"X-Username": response.json()["username"]}


def test_login_normalizes_and_reuses_user(client, tmp_path):
    assert login(client, "  CoLiN  ") == {"X-Username": "colin"}
    login(client)
    with sqlite3.connect(tmp_path / "demo.sqlite3") as db:
        assert db.execute("SELECT count(*) FROM users").fetchone()[0] == 1
    assert client.get("/auth/me", headers={"X-Username": "  COLIN  "}).json() == {"username": "colin"}


@pytest.mark.parametrize("username", ["", "  ", "a b", "é", "K", "a" * 33, "a' OR 1=1--", 42, None])
def test_invalid_usernames(client, username):
    assert client.post("/auth/login", json={"username": username}).status_code == 422


def test_login_requires_username(client):
    assert client.post("/auth/login", json={}).status_code == 422
    assert login(client, "A_1-b") == {"X-Username": "a_1-b"}
    assert login(client, "a" * 32) == {"X-Username": "a" * 32}


@pytest.mark.parametrize("headers", [{}, {"X-Username": "unknown"}])
def test_user_routes_require_known_username(client, headers):
    assert client.get("/auth/me", headers=headers).status_code == 401
    assert client.get("/catches", headers=headers).status_code == 401
    assert client.post("/catches", headers=headers, json=FISH).status_code == 401


def test_malformed_header(client):
    assert client.get("/auth/me", headers={"X-Username": "bad name"}).status_code == 422


def test_catches_are_owned_ordered_and_persisted(client):
    alice = login(client, "alice")
    bob = login(client, "bob")
    assert client.get("/catches", headers=alice).json() == []
    first_response = client.post("/catches", headers=alice, json=FISH)
    assert first_response.status_code == 201
    first = first_response.json()
    assert isinstance(first["id"], int)
    assert datetime.fromisoformat(first["created_at"].replace("Z", "+00:00")).utcoffset().total_seconds() == 0
    for key, value in FISH.items():
        assert first[key] == value
    second = client.post("/catches", headers=alice, json={**FISH, "species": "bluegill"}).json()
    assert client.get("/catches", headers=alice).json() == [second, first]
    assert client.get("/catches", headers=bob).json() == []
    client.post("/catches", headers=bob, json=FISH)
    assert len(client.get("/catches", headers=bob).json()) == 1
    # A fresh client and fresh database connections retain users and records.
    with TestClient(app) as reopened:
        assert reopened.get("/auth/me", headers=alice).json() == {"username": "alice"}
        assert reopened.get("/catches", headers=alice).json() == [second, first]


@pytest.mark.parametrize("field,value", [
    ("species", ""), ("species", "  "),
    ("weight_lbs", 0), ("weight_lbs", -1), ("weight_lbs", "Infinity"),
    ("length_inches", 0), ("length_inches", -1), ("length_inches", "NaN"),
    ("username", "bob"), ("owner", "bob"),
])
def test_invalid_catches_and_owner_override(client, field, value):
    headers = login(client)
    response = client.post("/catches", headers=headers, json={**FISH, field: value})
    assert response.status_code == 422
    assert client.get("/catches", headers=headers).json() == []


def test_missing_catch_fields(client):
    headers = login(client)
    assert client.post("/catches", headers=headers, json={}).status_code == 422
