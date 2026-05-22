from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_db, close_db
from app.api.websockets import router as websockets_router
from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.meetings import router as meetings_router
from app.api.feedbacks import router as feedbacks_router
from app.services.meeting_service import cleanup_stale_participants


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage MongoDB connection lifecycle — connect on startup, close on shutdown."""
    await connect_db()
    # Clear ghost participants left over from any prior server crash
    await cleanup_stale_participants()
    yield
    await close_db()


app = FastAPI(
    title="QuickSync Signaling Server",
    description="A production-grade FastAPI WebRTC signaling server with MongoDB, Google OAuth, and shareable meeting links.",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route modules
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(meetings_router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(feedbacks_router, prefix="/api/feedbacks", tags=["Feedbacks"])
app.include_router(websockets_router, prefix="/ws", tags=["WebSockets"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])


@app.get("/", tags=["Health"])
def health_check():
    """Simple health check endpoint to verify server status."""
    return {"status": "ok", "service": "QuickSync Signaling Server v2.0"}
