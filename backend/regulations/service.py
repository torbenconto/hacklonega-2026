import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def load_rules():
    return json.loads(Path(__file__).with_name("rules.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def catalog_ids():
    catalog = Path(__file__).resolve().parents[1] / "ml" / "species.json"
    return frozenset(item["species_id"] for item in json.loads(catalog.read_text(encoding="utf-8")))


def check_regulations(species_id: str, length_inches: float):
    """Compare only the supplied length with a reviewed statewide baseline."""
    rules = load_rules()
    profile_id = rules["species_profiles"].get(species_id, "unreviewed")
    profile = rules["profiles"][profile_id]
    minimum = profile["minimum_length_inches"]
    if profile["length_rule"] == "minimum":
        result = "below_baseline" if length_inches < minimum else "meets_baseline"
    elif profile["length_rule"] == "none":
        result = "no_baseline_length_limit"
    else:
        result = "not_evaluated"

    group_id = profile["daily_limit_group"]
    group = rules["groups"].get(group_id)
    daily_limit = {
        "group": group_id,
        "status": group["status"] if group else "not_evaluated",
        "limit": group["limit"] if group else None,
        "guidance": group["guidance"] if group else "Daily limit guidance is not reviewed.",
        "evaluated": False,
    }
    source_ids = list(dict.fromkeys(profile["source_ids"] + (group["source_ids"] if group else [])))
    return {
        "species_id": species_id,
        "length_inches": length_inches,
        "jurisdiction": "Georgia",
        "water_type": "freshwater",
        "scope": "statewide_baseline",
        "length_result": result,
        "minimum_length_inches": minimum,
        "length_guidance": {
            "minimum": "Compare total length with this baseline minimum; local overrides can change the result.",
            "none": "No statewide baseline length restriction identified; local restrictions may apply.",
            "not_evaluated": "Length guidance has not been reviewed for this species.",
        }[profile["length_rule"]],
        "daily_limit": daily_limit,
        "exception_notes": profile["exception_notes"],
        "warnings": rules["warnings"],
        "sources": [rules["sources"][key] for key in source_ids],
        "ruleset_version": rules["version"],
        "reviewed_on": rules["reviewed_on"],
        "legal_status": "undetermined",
    }
