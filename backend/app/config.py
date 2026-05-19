import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Centralized configuration loaded from environment variables."""

    # Admin secret for server-level operations
    ADMIN_KEY: str = os.getenv("ADMIN_KEY", "default_secret")

    # MongoDB Atlas connection string
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/quicksync")
    MONGO_DB_NAME: str = "QuickSync"

    # JWT configuration
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change_me_in_production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # CORS
    CORS_ORIGINS: list = ["*"]

settings = Settings()
