import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app, get_classifier
from backend.regulations.service import catalog_ids, check_regulations, load_rules


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_catalog_has_explicit_profiles_and_sourced_reviewed_rules():
    rules = load_rules()
    assert set(rules["species_profiles"]) == catalog_ids()
    for profile_id in rules["species_profiles"].values():
        profile = rules["profiles"][profile_id]
        if profile["length_rule"] != "not_evaluated":
            assert profile["source_ids"]
        if profile["length_rule"] == "minimum":
            assert profile["minimum_length_inches"] > 0
        else:
            assert profile["minimum_length_inches"] is None
        for source_id in profile["source_ids"]:
            assert rules["sources"][source_id]["url"].startswith("https://")
            assert rules["sources"][source_id]["reference"]
        group_id = profile["daily_limit_group"]
        if group_id is not None:
            group = rules["groups"][group_id]
            assert group["source_ids"]
            for source_id in group["source_ids"]:
                assert source_id in rules["sources"]


def test_all_catalog_species_return_scoped_results(client):
    for species_id in sorted(catalog_ids()):
        response = client.post("/regulations/check", json={"species_id": species_id, "length_inches": 13})
        assert response.status_code == 200, species_id
        result = response.json()
        assert result["legal_status"] == "undetermined"
        assert result["scope"] == "statewide_baseline"
        assert result["jurisdiction"] == "Georgia"
        assert result["daily_limit"]["evaluated"] is False
        assert result["exception_notes"]
        assert result["warnings"]
        assert result["ruleset_version"]
        assert result["reviewed_on"]


def test_each_encoded_minimum_boundary():
    rules = load_rules()
    for species_id, profile_id in rules["species_profiles"].items():
        profile = rules["profiles"][profile_id]
        if profile["length_rule"] != "minimum":
            continue
        minimum = profile["minimum_length_inches"]
        assert check_regulations(species_id, minimum - 0.01)["length_result"] == "below_baseline"
        assert check_regulations(species_id, minimum)["length_result"] == "meets_baseline"
        assert check_regulations(species_id, minimum + 0.01)["length_result"] == "meets_baseline"


def test_largemouth_baseline_is_12_inches_and_warns_of_overrides(client):
    result = client.post("/regulations/check", json={
        "species_id": "micropterus_salmoides", "length_inches": 11.99,
    }).json()
    assert result["minimum_length_inches"] == 12
    assert result["length_result"] == "below_baseline"
    assert "slot" in " ".join(result["exception_notes"])
    assert result["daily_limit"]["limit"] == 10
    assert result["sources"]


def test_no_baseline_limit_is_distinct_from_unreviewed():
    spotted = check_regulations("micropterus_punctulatus", 5)
    unknown_rule = check_regulations("ictalurus_furcatus", 5)
    assert spotted["length_result"] == "no_baseline_length_limit"
    assert "Lanier" in " ".join(spotted["exception_notes"])
    assert unknown_rule["length_result"] == "not_evaluated"
    assert unknown_rule["daily_limit"]["status"] == "not_evaluated"
    assert unknown_rule["daily_limit"]["limit"] is None
    assert unknown_rule["sources"] == []


def test_unreviewed_protected_species_do_not_get_unrestricted_guidance():
    result = check_regulations("acipenser_brevirostrum", 20)
    assert result["length_result"] == "not_evaluated"
    assert "protected" in " ".join(result["exception_notes"])


@pytest.mark.parametrize("species_ids,group,limit", [
    (["micropterus_salmoides", "micropterus_dolomieu", "micropterus_punctulatus"], "black_bass", 10),
    (["morone_saxatilis", "morone_chrysops"], "temperate_bass", 15),
    (["pomoxis_nigromaculatus", "pomoxis_annularis"], "crappie", 30),
    (["lepomis_macrochirus", "lepomis_microlophus", "lepomis_auritus"], "bream", 50),
    (["oncorhynchus_mykiss", "salmo_trutta", "salvelinus_fontinalis"], "trout", 8),
])
def test_combined_limits_are_shared_not_evaluated(species_ids, group, limit):
    for species_id in species_ids:
        result = check_regulations(species_id, 24)
        assert result["daily_limit"]["group"] == group
        assert result["daily_limit"]["limit"] == limit
        assert result["daily_limit"]["evaluated"] is False
        assert result["legal_status"] == "undetermined"


def test_walleye_limit_is_eight_not_statutory_ceiling():
    assert check_regulations("sander_vitreus", 20)["daily_limit"]["limit"] == 8


def test_catfish_no_count_limit_does_not_imply_length_reviewed():
    result = check_regulations("ictalurus_punctatus", 20)
    assert result["daily_limit"]["status"] == "no_statewide_limit"
    assert result["daily_limit"]["limit"] is None
    assert result["length_result"] == "not_evaluated"


@pytest.mark.parametrize("payload", [
    {}, {"species_id": "unknown", "length_inches": 12},
    {"species_id": "Largemouth bass", "length_inches": 12},
    {"species_id": "micropterus_salmoides"},
    *[{"species_id": "micropterus_salmoides", "length_inches": value}
      for value in [0, -1, "NaN", "Infinity", "-Infinity", None]],
    {"species_id": "micropterus_salmoides", "length_inches": 12, "retained_count": 5},
])
def test_invalid_inputs(client, payload):
    assert client.post("/regulations/check", json=payload).status_code == 422


def test_route_has_no_ml_or_database_dependency(client, monkeypatch, tmp_path):
    from backend import database

    def forbidden(*args, **kwargs):
        raise AssertionError("Regulation check must not call ML or storage")

    monkeypatch.setattr(database, "connect", forbidden)
    db_path = tmp_path / "must-not-exist.sqlite3"
    monkeypatch.setenv("DEMO_DB_PATH", str(db_path))
    app.dependency_overrides[get_classifier] = forbidden
    try:
        response = client.post("/regulations/check", json={
            "species_id": "micropterus_salmoides", "length_inches": 12,
        })
        assert response.status_code == 200
        assert not db_path.exists()
    finally:
        app.dependency_overrides.pop(get_classifier, None)


def test_unknown_future_catalog_mapping_falls_back_safely(monkeypatch):
    from backend.regulations import service

    rules = json.loads(Path(service.__file__).with_name("rules.json").read_text(encoding="utf-8"))
    rules["species_profiles"].pop("micropterus_salmoides")
    monkeypatch.setattr(service, "load_rules", lambda: rules)
    assert service.check_regulations("micropterus_salmoides", 12)["length_result"] == "not_evaluated"


def test_openapi_documents_route_without_header_auth(client):
    operation = client.get("/openapi.json").json()["paths"]["/regulations/check"]["post"]
    assert not operation.get("security")
    assert not operation.get("parameters")
    assert operation["responses"]["200"]["content"]["application/json"]["schema"]


def test_dex_summary_exposes_rules_without_a_measured_catch(client):
    result = client.get('/regulations/summary', params={'species_id': 'micropterus_salmoides'})
    assert result.status_code == 200
    rules = result.json()
    assert rules['size']['length']['minimum_inches'] == 12
    assert rules['season']['status'] == 'year_round'
    assert rules['daily_limit']['limit'] == 10
    assert 'Combined' in rules['daily_limit']['guidance']
    assert rules['scope'] == 'statewide_baseline'
    assert rules['legal_status'] == 'undetermined'
    assert rules['exception_notes'] and rules['sources']
    assert 'length_result' not in rules


def test_dex_summary_preserves_closed_and_unreviewed_species(client):
    closed = client.get('/regulations/summary', params={'species_id': 'acipenser_brevirostrum'}).json()
    assert closed['season']['status'] == 'closed_year_round'
    unreviewed = client.get('/regulations/summary', params={'species_id': 'ictalurus_furcatus'}).json()
    assert unreviewed['size']['length']['status'] == 'not_reviewed'
    assert unreviewed['daily_limit']['status'] == 'not_evaluated'
    assert client.get('/regulations/summary', params={'species_id': 'unknown'}).status_code == 422
    assert client.get('/regulations/summary').status_code == 422
