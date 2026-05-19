"""
Authentication service — handles Google token verification and JWT issuance.
"""

import httpx
import jwt
from datetime import datetime, timedelta
from app.config import settings
from app.database import get_db


async def verify_google_token(id_token: str) -> dict:
    """
    Verify a Google OAuth id_token by calling Google's tokeninfo endpoint.
    Returns the decoded token payload with user info (email, name, picture, sub).
    Raises ValueError if the token is invalid.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        )

    if resp.status_code != 200:
        raise ValueError("Invalid Google token")

    payload = resp.json()

    # Verify the token was issued for our app
    if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise ValueError("Token was not issued for this application")

    return payload


async def upsert_user(google_payload: dict) -> dict:
    """
    Create a new user or update an existing user's last_login.
    Returns the full user document from MongoDB.
    """
    db = get_db()
    email = google_payload["email"]
    google_id = google_payload["sub"]

    existing = await db.users.find_one({"email": email})

    if existing:
        # Update last_login timestamp
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        existing["last_login"] = datetime.utcnow()
        return existing
    else:
        # Create new user
        user_doc = {
            "google_id": google_id,
            "email": email,
            "name": google_payload.get("name", email.split("@")[0]),
            "avatar_url": google_payload.get("picture"),
            "tier": "free",
            "created_at": datetime.utcnow(),
            "last_login": datetime.utcnow(),
        }
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return user_doc


def create_jwt(user_id: str, email: str) -> str:
    """
    Create a short-lived JWT access token (24h) containing the user's ID and email.
    """
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    """
    Decode and validate a JWT token. Returns the payload dict.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
