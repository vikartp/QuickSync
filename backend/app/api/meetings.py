"""
Meetings API router — handles meeting creation, lookup, and user meeting history.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.models.meeting import CreateMeetingRequest, MeetingResponse, MeetingListResponse
from app.services import meeting_service
from app.core import get_current_user, get_optional_user

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
            )
            for m in meetings
        ]
    )


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
