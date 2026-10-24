from fastapi import APIRouter
from pydantic import BaseModel, Field, SecretStr

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, pattern=r"\S")
    password: SecretStr = Field(min_length=1)


@router.post("/login")
def login(credentials: LoginRequest):
    """Placeholder only: credentials are not verified or stored."""
    return {
        "status": "demo_placeholder",
        "authenticated": False,
        "message": "Login is not implemented. No credentials were verified.",
    }
