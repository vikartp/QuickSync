from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.websockets import router as websockets_router
from app.api.admin import router as admin_router

app = FastAPI(
    title="QuickSync Signaling Server",
    description="A high-performance FastAPI WebRTC signaling server for real-time P2P communication.",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include separated route modules
app.include_router(websockets_router, prefix="/ws", tags=["WebSockets"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])

@app.get("/", tags=["Health"])
def health_check():
    """Simple health check endpoint to verify server status."""
    return {"status": "ok", "service": "QuickSync Signaling Server is running."}
