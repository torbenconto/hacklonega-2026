from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

if __package__.startswith("backend."):
    from ..regulations.service import catalog_ids, check_regulations, load_rules
else:
    from regulations.service import catalog_ids, check_regulations, load_rules

router = APIRouter(prefix="/regulations", tags=["regulations"])


class RegulationCheckInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: str = Field(description="Catalog ID selected after user confirmation of the species.")
    length_inches: float | None = Field(default=None, gt=0, allow_inf_nan=False, description="Optional measured total length in inches.")
    weight_lbs: float | None = Field(default=None, gt=0, allow_inf_nan=False, description="Optional weight in pounds; informational only.")

    @field_validator("species_id")
    @classmethod
    def known_species(cls, value):
        if value not in catalog_ids():
            raise ValueError("Choose a species_id from GET /species.")
        return value


class Source(BaseModel):
    url: str
    reference: str


class DailyLimit(BaseModel):
    group: str | None
    status: Literal["specified", "no_statewide_limit", "not_evaluated"]
    limit: int | None
    guidance: str
    evaluated: Literal[False]


class RegulationCheckResult(BaseModel):
    species_id: str
    length_inches: float | None
    weight_lbs: float | None
    jurisdiction: Literal["Georgia"]
    water_type: Literal["freshwater"]
    scope: Literal["statewide_baseline"]
    length_result: Literal["below_baseline", "meets_baseline", "no_baseline_length_limit", "not_evaluated"]
    minimum_length_inches: float | None
    length_guidance: str
    daily_limit: DailyLimit
    exception_notes: list[str]
    warnings: list[str]
    sources: list[Source]
    ruleset_version: str
    reviewed_on: date
    legal_status: Literal["undetermined"]


@router.post("/check", response_model=RegulationCheckResult)
def check(fish: RegulationCheckInput):
    """Check a confirmed species before optionally saving a catch.

    Informational statewide baseline only; does not determine permission to keep
    a fish. No authentication, prediction, or catch-storage side effects.
    """
    return check_regulations(fish.species_id, fish.length_inches, fish.weight_lbs)


@router.get("/summary")
def summary(species_id: str = Query(...)):
    """Descriptive rules for a dex entry; no measured catch or harvest verdict."""
    if species_id not in catalog_ids():
        raise HTTPException(status_code=422, detail="Choose a species_id from GET /species.")
    rules = load_rules()
    profile = rules["profiles"][rules["species_profiles"].get(species_id, "unreviewed")]
    parameters = rules["species_parameters"][species_id]
    group = rules["groups"].get(profile["daily_limit_group"])
    source_ids = list(dict.fromkeys(parameters["source_ids"] + profile["source_ids"] + (group["source_ids"] if group else [])))
    return {
        "species_id": species_id,
        "scope": "statewide_baseline",
        "season": parameters["season"],
        "size": parameters["size"],
        "daily_limit": {"status": group["status"], "limit": group["limit"], "guidance": group["guidance"]} if group else {
            "status": "not_evaluated", "limit": None, "guidance": "Daily limit guidance has not been reviewed for this species."
        },
        "exception_notes": profile["exception_notes"],
        "warnings": rules["warnings"],
        "sources": [rules["sources"][key] for key in source_ids],
        "reviewed_on": rules["reviewed_on"],
        "legal_status": "undetermined",
    }
