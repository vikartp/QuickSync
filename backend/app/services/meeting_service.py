"""
Meeting service — handles meeting creation, lookup, lifecycle, and cleanup.
"""

import uuid
from datetime import datetime
from typing import Optional, List
from app.database import get_db


async def create_meeting(
    title: Optional[str] = None,
    created_by: Optional[str] = None,
    guest_name: Optional[str] = None,
) -> dict:
    """
    Create a new meeting with a unique UUID.
    - If created_by is set, it's a logged-in user's meeting (persists after ending).
    - If guest_name is set, it's a guest meeting (auto-deleted when empty).
    """
    db = get_db()
    meeting_id = str(uuid.uuid4())
    is_guest = created_by is None

    meeting_doc = {
        "meeting_id": meeting_id,
        "title": title or f"Meeting {meeting_id[:8]}",
        "created_by": created_by,
        "guest_creator_name": guest_name if is_guest else None,
        "is_guest_meeting": is_guest,
        "participants_limit": 2,        # Hard limit for now; future: configurable
        "max_duration_minutes": None,   # Future: 30 for paid tier
        "status": "active",
        "participants": [],
        "created_at": datetime.utcnow(),
        "ended_at": None,
    }

    await db.meetings.insert_one(meeting_doc)
    return meeting_doc


async def get_meeting(meeting_id: str) -> Optional[dict]:
    """Fetch a meeting by its UUID."""
    db = get_db()
    return await db.meetings.find_one({"meeting_id": meeting_id})


async def get_user_meetings(user_id: str) -> List[dict]:
    """Fetch all non-permanent meetings created by a specific logged-in user, newest first."""
    db = get_db()
    cursor = db.meetings.find(
        {"created_by": user_id, "is_permanent": {"$ne": True}}
    ).sort("created_at", -1)
    return await cursor.to_list(length=100)


async def create_permanent_channel(
    title: str,
    created_by: str,
    member_ids: List[str],
) -> dict:
    """Create a permanent channel shared among a fixed set of members."""
    db = get_db()
    channel_id = str(uuid.uuid4())

    # Ensure creator is always included; deduplicate
    all_members = list(dict.fromkeys([created_by] + member_ids))

    channel_doc = {
        "meeting_id": channel_id,
        "title": title,
        "created_by": created_by,
        "is_guest_meeting": False,
        "is_permanent": True,
        "member_ids": all_members,
        "participants_limit": len(all_members),
        "max_duration_minutes": None,
        "status": "active",
        "participants": [],
        "created_at": datetime.utcnow(),
        "ended_at": None,
    }

    await db.meetings.insert_one(channel_doc)
    return channel_doc


async def get_channels_for_user(user_id: str) -> List[dict]:
    """Fetch all permanent channels where the user is a creator or member, newest first."""
    db = get_db()
    cursor = db.meetings.find(
        {"is_permanent": True, "member_ids": user_id}
    ).sort("created_at", -1)
    return await cursor.to_list(length=100)


async def add_participant(meeting_id: str, name: str) -> bool:
    """
    Add a participant to a meeting's live tracking array.
    Returns False if the meeting is full or doesn't exist.
    """
    db = get_db()
    meeting = await db.meetings.find_one({"meeting_id": meeting_id})

    if not meeting or meeting["status"] != "active":
        return False

    if len(meeting["participants"]) >= meeting["participants_limit"]:
        return False

    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$push": {"participants": {"name": name, "joined_at": datetime.utcnow()}}}
    )
    return True


async def remove_participant(meeting_id: str, name: str):
    """
    Remove a participant from the meeting's live tracking.
    If the meeting is a guest meeting and becomes empty, auto-delete it.
    If it's a logged-in user's meeting and becomes empty, mark it as ended.
    """
    db = get_db()
    meeting = await db.meetings.find_one({"meeting_id": meeting_id})

    if not meeting:
        return

    # Remove the participant (first match by name)
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$pull": {"participants": {"name": name}}}
    )

    # Re-fetch to check updated participant count
    updated = await db.meetings.find_one({"meeting_id": meeting_id})
    if not updated:
        return

    remaining = len(updated.get("participants", []))

    if remaining == 0:
        if updated.get("is_guest_meeting"):
            # Guest meetings are ephemeral — delete from DB
            await db.meetings.delete_one({"meeting_id": meeting_id})
        else:
            # Logged-in user meetings persist — mark as ended
            await db.meetings.update_one(
                {"meeting_id": meeting_id},
                {"$set": {"status": "ended", "ended_at": datetime.utcnow()}}
            )


async def end_meeting(meeting_id: str):
    """Manually end a meeting (mark as ended, store duration, clear participants)."""
    db = get_db()
    meeting = await db.meetings.find_one({"meeting_id": meeting_id})
    duration_minutes = None
    if meeting and meeting.get("created_at"):
        delta = datetime.utcnow() - meeting["created_at"]
        duration_minutes = round(delta.total_seconds() / 60)

    update: dict = {
        "status": "ended",
        "ended_at": datetime.utcnow(),
        "participants": [],
    }
    if duration_minutes is not None:
        update["duration_minutes"] = duration_minutes

    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": update}
    )


async def delete_meeting(meeting_id: str):
    """Permanently delete a meeting from the database."""
    db = get_db()
    await db.meetings.delete_one({"meeting_id": meeting_id})
