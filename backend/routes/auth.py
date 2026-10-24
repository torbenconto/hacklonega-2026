import re
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, BeforeValidator

if __package__.startswith("backend."):
    from ..database import connect
else:
    from database import connect

router = APIRouter(prefix="/auth", tags=["demo authentication"])


def normalize_username(value):
    if not isinstance(value, str):
        raise ValueError("Username must be a string.")
    value = value.strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", value):
        raise ValueError("Use 1–32 ASCII letters, numbers, underscores, or hyphens.")
    return value.lower()


Username = Annotated[str, BeforeValidator(normalize_username)]


class User(BaseModel):
    username: Username


def current_user(x_username: Annotated[Username | None, Header()] = None) -> User:
    if x_username is None:
        raise HTTPException(401, "Log in and provide the X-Username header.")
    with connect() as db:
        row = db.execute("SELECT username FROM users WHERE username = ?", (x_username,)).fetchone()
    if row is None:
        raise HTTPException(401, "Unknown username. Log in first.")
    return User(username=row["username"])


@router.post("/login", response_model=User)
def login(user: User):
    """Create or reuse a demo username. No identity verification is performed."""
    with connect() as db:
        db.execute("INSERT OR IGNORE INTO users(username) VALUES (?)", (user.username,))
    return user


@router.get("/me", response_model=User)
def me(user: Annotated[User, Depends(current_user)]):
    return user
