import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv('DEMO_DB_PATH', str(tmp_path / 'leaderboards.sqlite3'))
    with TestClient(app) as client:
        for name in ('alice', 'bob', 'newcomer'):
            client.post('/auth/login', json={'username': name})
        yield client


def save(client, user, species, **measurements):
    response = client.post('/catches', headers={'X-Username': user}, json={'species': species, **measurements})
    assert response.status_code == 201
    return response.json()


def board(client, user='alice'):
    response = client.get('/leaderboards', headers={'X-Username': user})
    assert response.status_code == 200
    return response.json()


def test_requires_registered_user(client):
    assert client.get('/leaderboards').status_code == 401
    assert client.get('/leaderboards', headers={'X-Username': 'unknown'}).status_code == 401


def test_xp_matches_journal_and_names_are_stable_and_public(client):
    save(client, 'alice', 'Rainbow   trout')
    save(client, 'alice', 'rainbow trout')
    save(client, 'alice', 'Bluegill')
    save(client, 'bob', 'Bass')
    data = board(client)
    assert [row['score'] for row in data['xp']['entries']] == [220, 100, 0]
    assert data['xp']['personal']['score'] == 220
    assert data['xp']['personal']['catch_count'] == 3
    assert data['display_name'] == data['xp']['personal']['display_name']
    assert data == board(client)
    assert 'username' not in str(data)
    assert 'alice' not in str(data)
    assert 'photo_data' not in str(data)
    bob = board(client, 'bob')
    assert bob['xp']['entries'][0]['display_name'] == data['display_name']
    assert not bob['xp']['entries'][0]['is_you']
    assert bob['xp']['personal']['rank'] == 2


def test_xp_ties_and_added_catches_refresh(client):
    save(client, 'alice', 'Bass', weight_lbs=5)
    save(client, 'bob', 'Trout', length_inches=20)
    data = board(client)
    assert [row['rank'] for row in data['xp']['entries']] == [1, 2, 3]
    assert board(client, 'bob')['xp']['personal']['rank'] == 2
    save(client, 'alice', 'Bass')
    updated = board(client)
    assert updated['xp']['personal']['score'] == 120
    assert updated['xp']['personal']['rank'] == 1


def test_only_xp_board_is_returned(client):
    data = board(client, 'newcomer')
    assert set(data) == {'display_name', 'xp'}
    assert data['xp']['personal']['score'] == 0


def test_top_10_keeps_personal_rank_outside_results(client):
    from backend.routes.leaderboards import standings
    entries = [{'username': f'angler_{index}', 'score': index + 1} for index in range(105)]
    entries.append({'username': 'alice', 'score': 0})
    data = standings(entries, 'alice')
    assert len(data.entries) == 10
    assert [row.rank for row in data.entries] == list(range(1, 11))
    assert data.total == 106
    assert data.personal.rank == 106
    assert data.personal.score == 0


def test_species_parameter_does_not_filter_xp(client):
    save(client, 'alice', 'Rainbow trout', weight_lbs=4, length_inches=20)
    save(client, 'alice', 'rainbow   trout', weight_lbs=3)
    save(client, 'bob', 'Bluegill', weight_lbs=8, length_inches=25)
    response = client.get('/leaderboards', params={'species': ' RAINBOW   TROUT '}, headers={'X-Username': 'alice'})
    assert response.status_code == 200
    data = response.json()
    assert data == board(client)
    assert data['xp']['total'] == 3
    assert data['xp']['personal']['score'] == 120
    unknown = client.get('/leaderboards?species=missing', headers={'X-Username': 'alice'}).json()
    assert unknown == data
