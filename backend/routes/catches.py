from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .auth import User, current_user

if __package__.startswith("backend."):
    from ..database import connect
else:
    from database import connect

router = APIRouter(prefix="/catches", tags=["catches"])


class CatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species: str = Field(min_length=1)
    weight_lbs: float = Field(gt=0, allow_inf_nan=False)
    length_inches: float = Field(gt=0, allow_inf_nan=False)

    @field_validator("species")
    @classmethod
    def clean_species(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Species must not be empty.")
        return value


class Catch(CatchInput):
    id: int
    created_at: datetime


@router.post("", response_model=Catch, status_code=201)
def create_catch(fish: CatchInput, user: Annotated[User, Depends(current_user)]):
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO catches(username, species, weight_lbs, length_inches, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (user.username, fish.species, fish.weight_lbs, fish.length_inches, created_at),
        )
        return {**fish.model_dump(), "id": cursor.lastrowid, "created_at": created_at}


@router.get("", response_model=list[Catch])
def list_catches(user: Annotated[User, Depends(current_user)]):
    with connect() as db:
        rows = db.execute(
            "SELECT id, species, weight_lbs, length_inches, created_at "
            "FROM catches WHERE username = ? ORDER BY id DESC", (user.username,),
        ).fetchall()
    return [dict(row) for row in rows]
