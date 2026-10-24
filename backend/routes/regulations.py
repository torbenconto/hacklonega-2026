from datetime import date
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field, field_validator

if __package__.startswith("backend."):
    from ..regulations.service import catalog_ids, check_regulations
else:
    from regulations.service import catalog_ids, check_regulations

router = APIRouter(prefix="/regulations", tags=["regulations"])


class RegulationCheckInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species_id: str = Field(description="Catalog ID selected after user confirmation of the species.")
    length_inches: float = Field(gt=0, allow_inf_nan=False, description="Measured total length in inches.")

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
    length_inches: float
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
    return check_regulations(fish.species_id, fish.length_inches)
