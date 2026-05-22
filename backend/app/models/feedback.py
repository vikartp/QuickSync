from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional

class FeedbackInDB(BaseModel):
    """Represents a feedback document stored in MongoDB."""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    user_email: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FeedbackCreateRequest(BaseModel):
    """Request body for submitting feedback."""
    message: str

class FeedbackResponse(BaseModel):
    """Response returned for a feedback document."""
    id: str
    user_email: str
    message: str
    created_at: datetime
