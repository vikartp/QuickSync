"""
Meetings API router — handles meeting creation, lookup, and user meeting history.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from bson import ObjectId
from app.models.meeting import (
    CreateMeetingRequest, MeetingResponse, MeetingListResponse,
    CreateChannelRequest, ChannelResponse, ChannelListResponse, ChannelMember,
)
from app.services import meeting_service
from app.core import get_current_user, get_optional_user
from app.database import get_db

router = APIRouter()


@router.post("/create", response_model=MeetingResponse)
async def create_meeting(
    request: CreateMeetingRequest,
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Create a new meeting. Works for both logged-in users and guests.
    - Logged-in: created_by is set, meeting persists after ending.
    - Guest: must provide guest_name, meeting auto-deletes when empty.
    """
    if user:
        # Logged-in user creates a meeting
        meeting = await meeting_service.create_meeting(
            title=request.title,
            created_by=str(user["_id"]),
        )
    else:
        # Guest creates a meeting
        if not request.guest_name:
            raise HTTPException(status_code=400, detail="Guest name is required")
        meeting = await meeting_service.create_meeting(
            title=request.title,
            guest_name=request.guest_name,
        )

    return MeetingResponse(
        meeting_id=meeting["meeting_id"],
        title=meeting["title"],
        created_by=meeting.get("created_by"),
        is_guest_meeting=meeting["is_guest_meeting"],
        participants_limit=meeting["participants_limit"],
        status=meeting["status"],
        join_url=f"/meeting/{meeting['meeting_id']}",
        created_at=meeting["created_at"],
    )


@router.get("/my", response_model=MeetingListResponse)
async def get_my_meetings(user: dict = Depends(get_current_user)):
    """Get all meetings created by the currently authenticated user."""
    meetings = await meeting_service.get_user_meetings(str(user["_id"]))

    def _duration(m):
        if m.get("duration_minutes") is not None:
            return m["duration_minutes"]
        if m.get("ended_at") and m.get("created_at"):
            return round((m["ended_at"] - m["created_at"]).total_seconds() / 60)
        return None

    return MeetingListResponse(
        meetings=[
            MeetingResponse(
                meeting_id=m["meeting_id"],
                title=m.get("title"),
                created_by=m.get("created_by"),
                is_guest_meeting=m["is_guest_meeting"],
                participants_limit=m["participants_limit"],
                status=m["status"],
                join_url=f"/meeting/{m['meeting_id']}",
                created_at=m["created_at"],
                duration_minutes=_duration(m),
            )
            for m in meetings
        ]
    )


# ==========================================
# Permanent Channels (must be before /{meeting_id} to avoid path capture)
# ==========================================

async def _build_channel_response(channel: dict, db) -> ChannelResponse:
    """Fetch member profiles and build a ChannelResponse."""
    member_ids = channel.get("member_ids", [])
    object_ids = []
    for mid in member_ids:
        try:
            object_ids.append(ObjectId(mid))
        except Exception:
            pass

    users = await db.users.find({"_id": {"$in": object_ids}}).to_list(length=50)
    user_map = {str(u["_id"]): u for u in users}

    member_status = channel.get("member_status", {})

    members = [
        ChannelMember(
            id=mid,
            name=user_map[mid]["name"] if mid in user_map else "Unknown",
            avatar_url=user_map[mid].get("avatar_url") if mid in user_map else None,
            status=member_status.get(mid, "pending")
        )
        for mid in member_ids
    ]

    creator_id = channel["created_by"]
    creator_name = user_map[creator_id]["name"] if creator_id in user_map else "Unknown"

    return ChannelResponse(
        channel_id=channel["meeting_id"],
        title=channel["title"],
        created_by=creator_id,
        created_by_name=creator_name,
        members=members,
        created_at=channel["created_at"],
    )


@router.post("/channels", response_model=ChannelResponse)
async def create_channel(
    request: CreateChannelRequest,
    user: dict = Depends(get_current_user),
):
    """Create a permanent channel. Creator is always added as a member."""
    if not request.title.strip():
        raise HTTPException(status_code=400, detail="Channel title cannot be empty")

    db = get_db()

    # Validate that every requested member ID actually exists
    valid_ids: List[str] = []
    for mid in request.member_ids:
        try:
            u = await db.users.find_one({"_id": ObjectId(mid)})
            if u:
                valid_ids.append(mid)
        except Exception:
            pass

    channel = await meeting_service.create_permanent_channel(
        title=request.title.strip(),
        created_by=str(user["_id"]),
        member_ids=valid_ids,
    )

    return await _build_channel_response(channel, db)


@router.get("/channels", response_model=ChannelListResponse)
async def get_my_channels(user: dict = Depends(get_current_user)):
    """Get all permanent channels the current user belongs to."""
    db = get_db()
    channels = await meeting_service.get_channels_for_user(str(user["_id"]))
    responses = [await _build_channel_response(c, db) for c in channels]
    return ChannelListResponse(channels=responses)


@router.delete("/channels/{channel_id}")
async def delete_channel(channel_id: str, user: dict = Depends(get_current_user)):
    """Delete a recurring meeting. Only the creator can delete it."""
    meeting = await meeting_service.get_meeting(channel_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not meeting.get("is_permanent"):
        raise HTTPException(status_code=400, detail="Not a recurring meeting")
    if meeting.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only the creator can delete this meeting")
    await meeting_service.delete_meeting(channel_id)
    return {"status": "deleted"}


from pydantic import BaseModel
class InvitationUpdateRequest(BaseModel):
    status: str

@router.patch("/channels/{channel_id}/invitation")
async def update_channel_invitation(
    channel_id: str,
    request: InvitationUpdateRequest,
    user: dict = Depends(get_current_user)
):
    """Accept or reject an invitation to a recurring meeting."""
    meeting = await meeting_service.get_meeting(channel_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not meeting.get("is_permanent"):
        raise HTTPException(status_code=400, detail="Not a recurring meeting")
    if str(user["_id"]) not in meeting.get("member_ids", []):
        raise HTTPException(status_code=403, detail="You are not a member of this channel")

    if request.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")

    await meeting_service.update_invitation_status(channel_id, str(user["_id"]), request.status)
    return {"status": "updated"}


# ==========================================
# Meeting by ID (catch-all — must be after /channels, /my, /create)
# ==========================================

@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: str):
    """
    Get meeting details by UUID. No auth required — if you have the link, you can see it.
    This is used by the frontend to validate a meeting exists before joining.
    """
    meeting = await meeting_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return MeetingResponse(
        meeting_id=meeting["meeting_id"],
        title=meeting.get("title"),
        created_by=meeting.get("created_by"),
        is_guest_meeting=meeting["is_guest_meeting"],
        participants_limit=meeting["participants_limit"],
        status=meeting["status"],
        join_url=f"/meeting/{meeting['meeting_id']}",
        created_at=meeting["created_at"],
        duration_minutes=meeting.get("duration_minutes"),
    )


@router.patch("/{meeting_id}/end")
async def end_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    """Manually end a meeting. Only the creator can end it."""
    meeting = await meeting_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only the creator can end this meeting")

    await meeting_service.end_meeting(meeting_id)
    return {"status": "ended"}


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    """Delete a meeting from history. Only the creator can delete it."""
    meeting = await meeting_service.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.get("created_by") != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only the creator can delete this meeting")

    await meeting_service.delete_meeting(meeting_id)
    return {"status": "deleted"}



