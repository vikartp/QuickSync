from fastapi import APIRouter, Query, HTTPException
from bson import ObjectId
from app.connection_manager import manager
from app.config import settings
from app.database import get_db
from app.services import meeting_service

router = APIRouter()

@router.get("/sessions")
async def get_sessions(admin_key: str = Query(None)):
    """
    Retrieve all active meetings from the DB and combine with live WebSocket participant data.
    Requires the admin secret key.
    """
    if admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
        
    db = get_db()
    cursor = db.meetings.find({"status": "active"})
    meetings = await cursor.to_list(length=500)
    
    sessions_data = []
    for m in meetings:
        meeting_id = m["meeting_id"]
        live_users = manager.session_data.get(meeting_id, [])
        sessions_data.append({
            "meeting_id": meeting_id,
            "title": m.get("title") or f"Meeting {meeting_id[:8]}",
            "is_guest_meeting": m.get("is_guest_meeting", False),
            "created_at": m.get("created_at"),
            "live_users": live_users
        })
        
    return {"sessions": sessions_data}

@router.delete("/sessions/{meeting_id}")
async def delete_session(meeting_id: str, admin_key: str = Query(None)):
    """
    Forcefully delete a session.
    Requires the admin secret key.
    """
    if admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    await meeting_service.delete_meeting(meeting_id)
    await manager.close_channel(meeting_id)
    return {"status": "deleted", "meeting_id": meeting_id}


@router.get("/feedbacks")
async def get_feedbacks(admin_key: str = Query(None)):
    """
    Get all user feedbacks.
    Requires the admin secret key.
    """
    if admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    db = get_db()
    cursor = db.feedbacks.find().sort("created_at", -1)
    feedbacks = await cursor.to_list(length=100)
    
    return [
        {
            "id": str(fb["_id"]),
            "user_email": fb.get("user_email", "unknown"),
            "message": fb.get("message", ""),
            "created_at": fb["created_at"].isoformat() if fb.get("created_at") else None
        }
        for fb in feedbacks
    ]

@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(feedback_id: str, admin_key: str = Query(None)):
    """
    Delete a specific feedback document.
    Requires the admin secret key.
    """
    if admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    db = get_db()
    result = await db.feedbacks.delete_one({"_id": ObjectId(feedback_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    return {"status": "deleted", "feedback_id": feedback_id}
