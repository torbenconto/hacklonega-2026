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


def test_catch_photo_persists_and_is_private(client):
    import base64
    from io import BytesIO
    from PIL import Image

    image = Image.new('RGB', (900, 600), 'green')
    output = BytesIO()
    image.save(output, format='PNG')
    photo = 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()
    alice, bob = login(client, 'alice'), login(client, 'bob')
    saved = client.post('/catches', headers=alice, json={**FISH, 'photo_data': photo})
    assert saved.status_code == 201
    entry = saved.json()
    assert entry['photo_data'].startswith('data:image/jpeg;base64,')
    with Image.open(BytesIO(base64.b64decode(entry['photo_data'].split(',')[1]))) as stored:
        assert stored.size == (640, 427)
    assert client.get('/catches', headers=alice).json() == [entry]
    assert client.get('/catches', headers=bob).json() == []


@pytest.mark.parametrize('photo', ['file:///tmp/fish.jpg', 'data:image/jpeg;base64,???', 'data:image/png;base64,bm90IGFuIGltYWdl'])
def test_invalid_catch_photos(client, photo):
    headers = login(client)
    assert client.post('/catches', headers=headers, json={**FISH, 'photo_data': photo}).status_code == 422
    assert client.get('/catches', headers=headers).json() == []


def test_shared_limit_metadata_and_unknown_species(client):
    headers = login(client)
    bass = client.post('/catches', headers=headers, json=FISH).json()
    other_bass = client.post('/catches', headers=headers, json={**FISH, 'species': 'Smallmouth bass'}).json()
    assert bass['daily_limit']['group'] == other_bass['daily_limit']['group'] == 'black_bass'
    assert bass['daily_limit']['limit'] == 10
    unknown = client.post('/catches', headers=headers, json={**FISH, 'species': 'unknown'}).json()
    assert unknown['daily_limit']['status'] == 'not_evaluated'
    assert unknown['daily_limit']['limit'] is None


def test_existing_journal_is_upgraded(client, tmp_path):
    path = tmp_path / 'demo.sqlite3'
    with sqlite3.connect(path) as db:
        db.executescript('''
            CREATE TABLE users (username TEXT PRIMARY KEY);
            INSERT INTO users VALUES ('alice');
            CREATE TABLE catches (
                id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL,
                species TEXT NOT NULL, weight_lbs REAL NOT NULL,
                length_inches REAL NOT NULL, created_at TEXT NOT NULL
            );
            INSERT INTO catches VALUES (1, 'alice', 'Largemouth bass', 2, 12, '2026-10-24T12:00:00+00:00');
        ''')
    response = client.get('/catches', headers={'X-Username': 'alice'})
    assert response.status_code == 200
    assert response.json()[0]['photo_data'] is None
    assert response.json()[0]['daily_limit']['group'] == 'black_bass'
    assert response.json()[0]['disposition'] == 'unknown'


@pytest.mark.parametrize('disposition', ['kept', 'released'])
def test_catch_disposition_persists_and_can_be_updated(client, disposition):
    alice, bob = login(client, 'alice'), login(client, 'bob')
    saved = client.post('/catches', headers=alice, json={**FISH, 'disposition': disposition})
    assert saved.status_code == 201
    entry = saved.json()
    assert entry['disposition'] == disposition
    assert client.get('/catches', headers=alice).json()[0]['disposition'] == disposition
    path = f"/catches/{entry['id']}"
    assert client.patch(path, headers=bob, json={'disposition': 'released'}).status_code == 404
    assert client.patch(path, json={'disposition': 'released'}).status_code == 401
    updated = client.patch(path, headers=alice, json={'disposition': 'released'})
    assert updated.status_code == 200
    assert updated.json()['disposition'] == 'released'
    assert client.get('/catches', headers=alice).json()[0]['disposition'] == 'released'


def test_invalid_disposition_is_rejected(client):
    headers = login(client)
    assert client.post('/catches', headers=headers, json={**FISH, 'disposition': 'lost'}).status_code == 422
    entry = client.post('/catches', headers=headers, json=FISH).json()
    assert entry['disposition'] == 'unknown'
    assert client.patch(f"/catches/{entry['id']}", headers=headers, json={'disposition': 'lost'}).status_code == 422


def test_edit_catch_preserves_metadata_and_ownership(client):
    alice, bob = login(client, 'alice'), login(client, 'bob')
    entry = client.post('/catches', headers=alice, json={**FISH, 'disposition': 'kept'}).json()
    path = f"/catches/{entry['id']}"
    changes = {'species': '  Bluegill  ', 'weight_lbs': 1.25, 'length_inches': 9}
    assert client.patch(path, headers=bob, json=changes).status_code == 404
    assert client.patch(path, json=changes).status_code == 401
    updated = client.patch(path, headers=alice, json=changes)
    assert updated.status_code == 200
    fish = updated.json()
    assert fish['species'] == 'Bluegill'
    assert fish['weight_lbs'] == 1.25
    assert fish['length_inches'] == 9
    assert fish['daily_limit']['group'] != entry['daily_limit']['group']
    for field in ['id', 'created_at', 'photo_data', 'disposition']:
        assert fish[field] == entry[field]
    assert client.get('/catches', headers=alice).json() == [fish]
    partial = client.patch(path, headers=alice, json={'weight_lbs': 2}).json()
    assert partial == {**fish, 'weight_lbs': 2}
    assert client.patch('/catches/999999', headers=alice, json={'weight_lbs': 2}).status_code == 404


@pytest.mark.parametrize('changes', [
    {}, {'species': '  '}, {'species': None},
    {'weight_lbs': 0}, {'weight_lbs': -1}, {'weight_lbs': 'Infinity'},
    {'length_inches': 0}, {'length_inches': 'NaN'},
    {'disposition': None}, {'username': 'bob'}, {'photo_data': None},
])
def test_invalid_catch_edits_do_not_change_record(client, changes):
    headers = login(client)
    entry = client.post('/catches', headers=headers, json=FISH).json()
    assert client.patch(f"/catches/{entry['id']}", headers=headers, json=changes).status_code == 422
    assert client.get('/catches', headers=headers).json() == [entry]
