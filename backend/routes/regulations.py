from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/regulations", tags=["regulations"])


class RegulationCheckRequest(BaseModel):
    species: str = Field(min_length=1, pattern=r"\S")
    weight_lbs: float = Field(gt=0, allow_inf_nan=False)
    length_inches: float = Field(gt=0, allow_inf_nan=False)


@router.post("/check")
def check_regulations(fish: RegulationCheckRequest):
    """Accept Georgia freshwater fish measurements without evaluating rules."""
    return {
        **fish.model_dump(),
        "jurisdiction": "Georgia",
        "water_type": "freshwater",
        "status": "not_evaluated",
        "message": "Regulation checks are not implemented. No legal determination was made.",
    }
