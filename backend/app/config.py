import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default_secret")
    CORS_ORIGINS: list = ["*"]

settings = Settings()
