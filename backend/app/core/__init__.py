"""
FastAPI dependencies for authentication and authorization.
"""

from fastapi import Depends, HTTPException, Header
from typing import Optional
from app.services.auth_service import decode_jwt
from app.database import get_db
from bson import ObjectId
import jwt


async def get_current_user(authorization: str = Header(...)) -> dict:
    """
    Dependency that extracts and validates the JWT from the Authorization header.
    Returns the full user document from MongoDB.
    Raises 401 if the token is missing, expired, or invalid.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization.replace("Bearer ", "")

    try:
        payload = decode_jwt(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    Optional auth dependency — returns the user if a valid JWT is provided,
    or None if no auth header is present. Used for endpoints that work for
    both logged-in users and guests (e.g., creating a meeting).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        payload = decode_jwt(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    return user
