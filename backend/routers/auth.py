from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from auth import create_access_token, get_current_user
import os

router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    admin_username = os.getenv("ADMIN_USERNAME", "sylvain")
    admin_password = os.getenv("ADMIN_PASSWORD", "")

    if form_data.username != admin_username or form_data.password != admin_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
        )

    token = create_access_token({"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
async def get_me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}
