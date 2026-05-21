"""
MongoDB async client using Motor.
Provides a single shared client instance and database reference.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Initialize the MongoDB connection. Called on app startup."""
    global client, db
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        serverSelectionTimeoutMS=5000,
    )
    db = client[settings.MONGO_DB_NAME]

    # Verify connection is working
    try:
        await client.admin.command("ping")
        print(f"Connected to MongoDB: {settings.MONGO_DB_NAME}")
    except Exception as e:
        print(f"MongoDB connection warning: {e}")
        print("Server will start but DB operations may fail until connection is established.")

    # Create indexes for fast lookups (idempotent — safe to run on every startup)
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("google_id", unique=True, sparse=True)
        await db.meetings.create_index("meeting_id", unique=True)
        await db.meetings.create_index("created_by")
        await db.meetings.create_index("status")
        await db.meetings.create_index("member_ids")          # for permanent channel lookups
        await db.meetings.create_index("is_permanent")
        print("Database indexes ensured.")
    except Exception as e:
        print(f"Index creation warning: {e}")


async def close_db():
    """Close the MongoDB connection. Called on app shutdown."""
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


def get_db():
    """Get the database instance. Use in route handlers."""
    return db
