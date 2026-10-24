"""Community standings derived from saved catches, using generated public names."""

from hashlib import sha256
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .auth import User, current_user

if __package__.startswith("backend."):
    from ..database import connect
else:
    from database import connect

router = APIRouter(prefix="/leaderboards", tags=["leaderboards"])


def angler_name(username):
    digest = sha256(username.encode()).hexdigest()
    adjectives = ("Lucky", "Quiet", "Wild", "Sunny", "Misty", "Golden", "Swift", "Clever")
    nouns = ("Otter", "Heron", "Trout", "Kingfisher", "Bass", "Turtle", "Osprey", "Beaver")
    return f"{adjectives[int(digest[:2], 16) % len(adjectives)]} {nouns[int(digest[2:4], 16) % len(nouns)]}"


class Standing(BaseModel):
    rank: int
    display_name: str
    is_you: bool
    score: float
    catch_count: int | None = None


class Board(BaseModel):
    entries: list[Standing]
    personal: Standing | None
    total: int


class Leaderboards(BaseModel):
    display_name: str
    xp: Board


def standings(entries, username):
    # Break score ties consistently so every angler has a consecutive place.
    entries.sort(key=lambda item: (-item["score"], item["username"], item.get("id", 0)))
    ranked = []
    for index, entry in enumerate(entries, 1):
        ranked.append(Standing(
            rank=index, display_name=angler_name(entry["username"]),
            is_you=entry["username"] == username, score=entry["score"],
            catch_count=entry.get("catch_count"),
        ))
    return Board(entries=ranked[:10], personal=next((row for row in ranked if row.is_you), None), total=len(ranked))


@router.get("", response_model=Leaderboards)
def leaderboards(user: Annotated[User, Depends(current_user)]):
    normalize = lambda name: " ".join(name.lower().split())
    with connect() as db:
        users = db.execute("SELECT username FROM users ORDER BY username").fetchall()
        catches = db.execute("SELECT username, species FROM catches").fetchall()
    progress = {row["username"]: {"count": 0, "species": set()} for row in users}
    for row in catches:
        key = normalize(row["species"])
        journal = progress[row["username"]]
        journal["count"] += 1
        journal["species"].add(key)
    xp = [{"username": name, "score": journal["count"] * 20 + len(journal["species"]) * 80,
           "catch_count": journal["count"]} for name, journal in progress.items()]
    return Leaderboards(display_name=angler_name(user.username), xp=standings(xp, user.username))
