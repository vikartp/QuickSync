"""
Pydantic models for Meeting documents and API request/response schemas.
"""

from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List
from datetime import datetime, timezone


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
    is_permanent: bool = False                        # Permanent channels never expire
    member_ids: List[str] = []                        # User IDs with access to permanent channels
    member_status: dict = Field(default_factory=dict) # User ID -> "pending" | "accepted" | "rejected"
    participants_limit: int = 10                      # Future: configurable for paid tiers
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
    duration_minutes: Optional[int] = None            # Set when meeting ends

    @field_serializer('created_at')
    def serialize_created_at(self, v: datetime, _info) -> str:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class MeetingListResponse(BaseModel):
    """Response for listing a user's meetings."""
    meetings: List[MeetingResponse]


# ==========================================
# Permanent Channel models
# ==========================================

class CreateChannelRequest(BaseModel):
    """Request body for creating a permanent channel."""
    title: str
    member_ids: List[str]  # User ObjectId strings to add (excluding self)


class ChannelMember(BaseModel):
    """Minimal user profile embedded in channel responses."""
    id: str
    name: str
    avatar_url: Optional[str] = None
    status: str = "pending"


class ChannelResponse(BaseModel):
    """Response after creating or fetching a permanent channel."""
    channel_id: str
    title: str
    created_by: str
    created_by_name: str
    members: List[ChannelMember]
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, v: datetime, _info) -> str:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()


class ChannelListResponse(BaseModel):
    """Response for listing a user's permanent channels."""
    channels: List[ChannelResponse]
