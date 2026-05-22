"""
Auth API router — handles Google OAuth login and user profile.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from app.models.user import GoogleAuthRequest, AuthResponse, UserResponse
from app.services.auth_service import verify_google_token, upsert_user, create_jwt
from app.core import get_current_user
from app.database import get_db

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


@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=1, max_length=100),
    user: dict = Depends(get_current_user),
):
    """
    Search for users by name or email (case-insensitive, partial match).
    Excludes the requesting user from results. Requires authentication.
    """
    import re
    db = get_db()
    escaped = re.escape(q.strip())
    cursor = db.users.find({
        "$or": [
            {"name": {"$regex": escaped, "$options": "i"}},
            {"email": {"$regex": escaped, "$options": "i"}},
        ],
        "_id": {"$ne": user["_id"]},
    }).limit(10)
    users = await cursor.to_list(length=10)
    return [
        UserResponse(
            id=str(u["_id"]),
            email="",  # Hide email in search results to protect privacy
            name=u["name"],
            avatar_url=u.get("avatar_url"),
            tier=u.get("tier", "free"),
        )
        for u in users
    ]
