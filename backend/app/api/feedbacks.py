from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.database import get_db
from app.api.auth import get_current_user
from app.models.feedback import FeedbackCreateRequest
from datetime import datetime

router = APIRouter()

@router.post("")
async def submit_feedback(request: FeedbackCreateRequest, user: dict = Depends(get_current_user)):
    """Submit user feedback to the admin."""
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")
        
    db = get_db()
    feedback_doc = {
        "user_id": str(user["_id"]),
        "user_email": user.get("email", "unknown@example.com"),
        "message": request.message.strip(),
        "created_at": datetime.utcnow()
    }
    
    await db.feedbacks.insert_one(feedback_doc)
    return {"status": "success", "message": "Feedback submitted successfully"}
