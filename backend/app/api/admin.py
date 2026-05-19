from fastapi import APIRouter, Query, HTTPException
from app.connection_manager import manager
from app.config import settings
from app.database import get_db
from app.services.meeting_service import end_meeting

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
    Forcefully close an active meeting, kick users, and mark it ended in DB.
    Requires the admin secret key.
    """
    if admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
        
    # Kick from websockets
    await manager.close_channel(meeting_id)
    # End in DB
    await end_meeting(meeting_id)
    
    return {"status": "success"}
