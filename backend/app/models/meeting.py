"""
Pydantic models for Meeting documents and API request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MeetingParticipant(BaseModel):
    """Tracks a participant's join time within a meeting."""
    name: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class MeetingInDB(BaseModel):
    """Represents a meeting document stored in MongoDB."""
    meeting_id: str                                   # UUID4 string
    title: Optional[str] = None
    created_by: Optional[str] = None                  # User ObjectId as string, null for guests
    guest_creator_name: Optional[str] = None          # Name if created by a guest
    is_guest_meeting: bool = False
    participants_limit: int = 2                       # Future: configurable for paid tiers
    max_duration_minutes: Optional[int] = None        # Future: 30 for paid tier
    status: str = "active"                            # "active" | "ended"
    participants: List[MeetingParticipant] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None


class CreateMeetingRequest(BaseModel):
    """Request body for creating a new meeting."""
    title: Optional[str] = None
    guest_name: Optional[str] = None                  # Only used for guest meetings


class MeetingResponse(BaseModel):
    """Response after creating or fetching a meeting."""
    meeting_id: str
    title: Optional[str] = None
    created_by: Optional[str] = None
    is_guest_meeting: bool
    participants_limit: int
    status: str
    join_url: str                                     # e.g. /meeting/{meeting_id}
    created_at: datetime


class MeetingListResponse(BaseModel):
    """Response for listing a user's meetings."""
    meetings: List[MeetingResponse]
