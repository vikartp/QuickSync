"""
Auth API router — handles Google OAuth login and user profile.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.models.user import GoogleAuthRequest, AuthResponse, UserResponse
from app.services.auth_service import verify_google_token, upsert_user, create_jwt
from app.core import get_current_user

router = APIRouter()


@router.post("/google", response_model=AuthResponse)
async def google_login(request: GoogleAuthRequest):
    """
    Exchange a Google id_token for a QuickSync JWT.
    Flow: Frontend gets id_token from Google SDK → sends here → we verify → issue JWT.
    """
    try:
        google_payload = await verify_google_token(request.id_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    user = await upsert_user(google_payload)
    user_id = str(user["_id"])

    access_token = create_jwt(user_id, user["email"])

    return AuthResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user["name"],
            avatar_url=user.get("avatar_url"),
            tier=user.get("tier", "free"),
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        avatar_url=user.get("avatar_url"),
        tier=user.get("tier", "free"),
    )
