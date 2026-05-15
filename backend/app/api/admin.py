from fastapi import APIRouter, Query, HTTPException
from app.connection_manager import manager
from app.config import settings

router = APIRouter()

@router.get("/sessions")
def get_sessions(secret_key: str = Query(None)):
    """
    Retrieve all active channels and their participants.
    Requires the admin secret key.
    """
    if secret_key != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    return {"sessions": manager.session_data}

@router.delete("/sessions/{channel}")
async def delete_session(channel: str, secret_key: str = Query(None)):
    """
    Forcefully close an active channel and disconnect all peers.
    Requires the admin secret key.
    """
    if secret_key != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid secret key")
    await manager.close_channel(channel)
    return {"status": "success"}
