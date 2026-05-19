"""
Pydantic models for User documents and API request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserInDB(BaseModel):
    """Represents a user document stored in MongoDB."""
    google_id: Optional[str] = None
    email: str
    name: str
    avatar_url: Optional[str] = None
    tier: str = "free"                    # "free" | "pro" (future)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(BaseModel):
    """Public user profile returned from API."""
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    tier: str = "free"


class GoogleAuthRequest(BaseModel):
    """Request body for Google OAuth login."""
    id_token: str


class AuthResponse(BaseModel):
    """Response after successful authentication."""
    access_token: str
    user: UserResponse
