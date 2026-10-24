from datetime import datetime, timezone
import base64
import binascii
import json
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .auth import User, current_user

if __package__.startswith("backend."):
    from ..database import connect
    from ..ml.images import decode_image
    from ..regulations.service import load_rules
else:
    from database import connect
    from ml.images import decode_image
    from regulations.service import load_rules

router = APIRouter(prefix="/catches", tags=["catches"])


class CatchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species: str = Field(min_length=1)
    weight_lbs: float = Field(gt=0, allow_inf_nan=False)
    length_inches: float = Field(gt=0, allow_inf_nan=False)
    photo_data: str | None = Field(default=None, max_length=3_000_000)
    disposition: Literal["kept", "released", "unknown"] = "unknown"

    @field_validator("photo_data")
    @classmethod
    def clean_photo(cls, value):
        if value is None:
            return None
        header, separator, encoded = value.partition(",")
        if not separator or header not in {"data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"}:
            raise ValueError("Photo must be a JPEG, PNG, or WebP data URL.")
        try:
            data = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Photo contains invalid base64 data.") from exc
        image = decode_image(data)
        try:
            image.thumbnail((640, 640))
            output = BytesIO()
            image.save(output, format="JPEG", quality=80)
            return "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")
        finally:
            image.close()

    @field_validator("species")
    @classmethod
    def clean_species(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Species must not be empty.")
        return value


class Catch(BaseModel):
    id: int
    species: str
    weight_lbs: float
    length_inches: float
    photo_data: str | None
    created_at: datetime
    daily_limit: dict
    disposition: Literal["kept", "released", "unknown"]


@lru_cache(maxsize=1)
def species_names():
    catalog = Path(__file__).resolve().parents[1] / "ml" / "species.json"
    return {" ".join(item["common_name"].lower().split()): item["species_id"] for item in json.loads(catalog.read_text())}


def catch_details(row):
    result = dict(row)
    rules = load_rules()
    species_id = species_names().get(" ".join(result["species"].lower().split()))
    profile = rules["profiles"][rules["species_profiles"].get(species_id, "unreviewed")]
    group_id = profile["daily_limit_group"]
    group = rules["groups"].get(group_id)
    result["daily_limit"] = {"group": group_id, **({key: group[key] for key in ("status", "limit", "guidance")} if group else {
        "status": "not_evaluated", "limit": None, "guidance": "Daily limit not reviewed for this species."
    })}
    return result


@router.post("", response_model=Catch, status_code=201)
def create_catch(fish: CatchInput, user: Annotated[User, Depends(current_user)]):
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        cursor = db.execute(
            "INSERT INTO catches(username, species, weight_lbs, length_inches, created_at, photo_data, disposition) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user.username, fish.species, fish.weight_lbs, fish.length_inches, created_at, fish.photo_data, fish.disposition),
        )
        return catch_details({**fish.model_dump(), "id": cursor.lastrowid, "created_at": created_at})


@router.get("", response_model=list[Catch])
def list_catches(user: Annotated[User, Depends(current_user)]):
    with connect() as db:
        rows = db.execute(
            "SELECT id, species, weight_lbs, length_inches, created_at, photo_data, disposition "
            "FROM catches WHERE username = ? ORDER BY id DESC", (user.username,),
        ).fetchall()
    return [catch_details(row) for row in rows]


class CatchUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    species: str = Field(default=None, min_length=1)
    weight_lbs: float = Field(default=None, gt=0, allow_inf_nan=False)
    length_inches: float = Field(default=None, gt=0, allow_inf_nan=False)
    disposition: Literal["kept", "released"] = None

    @field_validator("species")
    @classmethod
    def clean_species(cls, value):
        return CatchInput.clean_species(value)


@router.patch("/{catch_id}", response_model=Catch)
def update_catch(catch_id: int, fish: CatchUpdate, user: Annotated[User, Depends(current_user)]):
    changes = fish.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one catch field to update.")
    with connect() as db:
        cursor = db.execute(
            f"UPDATE catches SET {', '.join(f'{field} = ?' for field in changes)} WHERE id = ? AND username = ?",
            (*changes.values(), catch_id, user.username),
        )
        if not cursor.rowcount:
            raise HTTPException(status_code=404, detail="Catch not found.")
        row = db.execute(
            "SELECT id, species, weight_lbs, length_inches, created_at, photo_data, disposition FROM catches WHERE id = ?",
            (catch_id,),
        ).fetchone()
    return catch_details(row)
