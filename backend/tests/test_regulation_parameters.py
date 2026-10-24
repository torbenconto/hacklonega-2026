"""Integrity checks for descriptive regulation data, without adding an evaluator."""

import json
from datetime import date, datetime
from pathlib import Path

import pytest

from backend.regulations.service import catalog_ids, check_regulations


@pytest.fixture
def rules():
    path = Path(__file__).resolve().parents[1] / "regulations" / "rules.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_parameter_coverage_and_metadata(rules):
    assert set(rules["species_parameters"]) == catalog_ids()
    assert rules["parameter_scope"]["scope"] == "statewide_baseline"
    assert rules["parameter_scope"]["notes"]
    date.fromisoformat(rules["reviewed_on"])
    for entry in rules["species_parameters"].values():
        assert set(entry["size"]) == {"length", "weight"}
        parts = [entry["season"], *entry["size"].values()]
        source_ids = set()
        for part in parts:
            if part["status"] != "not_reviewed":
                assert part["source_ids"]
            else:
                assert not part.get("source_ids")
            for source_id in part.get("source_ids", []):
                source = rules["sources"][source_id]
                assert source["url"].startswith("https://")
                assert source["reference"]
                source_ids.add(source_id)
        assert set(entry["source_ids"]) == source_ids
        if source_ids:
            date.fromisoformat(entry["reviewed_on"])
        else:
            assert "reviewed_on" not in entry


def test_season_statuses_and_applicable_dates(rules):
    for entry in rules["species_parameters"].values():
        season = entry["season"]
        assert season["status"] in {"year_round", "restricted", "closed_year_round", "not_reviewed"}
        if season["status"] == "restricted":
            for key in ("opens_on", "closes_on"):
                datetime.strptime("2000-" + season[key], "%Y-%m-%d")
                assert len(season[key]) == 5
        else:
            assert "opens_on" not in season
            assert "closes_on" not in season


def test_size_boundaries_only_exist_when_applicable(rules):
    for entry in rules["species_parameters"].values():
        for kind, units in (("length", "inches"), ("weight", "lbs")):
            parameter = entry["size"][kind]
            status = parameter["status"]
            assert status in {"minimum", "maximum", "range", "no_verified_restriction", "not_reviewed"}
            expected = set()
            if status in {"minimum", "range"}:
                expected.add("minimum_" + units)
            if status in {"maximum", "range"}:
                expected.add("maximum_" + units)
            actual = {key for key in parameter if key.startswith(("minimum_", "maximum_"))}
            assert actual == expected
            for key in expected:
                assert isinstance(parameter[key], (int, float))
                assert parameter[key] > 0
            if status == "range":
                assert parameter["minimum_" + units] <= parameter["maximum_" + units]
            if kind == "length" and expected:
                assert parameter["measurement"] == "total_length"


@pytest.mark.parametrize("species_id,minimum", [
    ("micropterus_salmoides", 12), ("micropterus_cataractae", 15),
])
def test_verified_statewide_length_minima(rules, species_id, minimum):
    entry = rules["species_parameters"][species_id]
    assert entry["season"]["status"] == "year_round"
    assert entry["size"]["length"]["minimum_inches"] == minimum
    assert entry["size"]["weight"]["status"] == "no_verified_restriction"


def test_unrestricted_reviewed_parameters_are_explicit(rules):
    entry = rules["species_parameters"]["micropterus_punctulatus"]
    assert entry["season"]["status"] == "year_round"
    assert entry["size"]["length"]["status"] == "no_verified_restriction"
    assert "minimum_inches" not in entry["size"]["length"]


def test_sturgeon_closures_and_unreviewed_species_are_not_year_round(rules):
    for species_id in ("acipenser_oxyrinchus_oxyrinchus", "acipenser_fulvescens", "acipenser_brevirostrum"):
        entry = rules["species_parameters"][species_id]
        assert entry["season"]["status"] == "closed_year_round"
        assert entry["season"]["source_ids"] == ["sturgeon_guide"]
        assert entry["size"]["length"]["status"] == "not_reviewed"
    unresolved = rules["species_parameters"]["holiday_darter_complex"]
    assert unresolved["season"]["status"] == "not_reviewed"
    assert unresolved["size"]["length"]["status"] == "not_reviewed"
    assert unresolved["size"]["weight"]["status"] == "not_reviewed"


def test_new_parameters_do_not_change_existing_checker(rules):
    assert rules["species_parameters"]["micropterus_cataractae"]["size"]["length"]["minimum_inches"] == 15
    result = check_regulations("micropterus_cataractae", 10)
    assert result["length_result"] == "not_evaluated"
    assert "season" not in result
    assert "size" not in result
