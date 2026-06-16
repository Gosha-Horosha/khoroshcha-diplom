from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:eight2004@localhost/postgres"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Application
    DEBUG: bool = True

    SMTP_HOST: Optional[str] = "smtp.mail.ru"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = "archive_mose@mail.ru"
    SMTP_PASSWORD: Optional[str] = "av7P3Q4XUuo93dYPf1gI"
    SMTP_FROM_EMAIL: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:3000"
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    EMAIL_VERIFY_EXPIRE_MINUTES: int = 1440  # 24 часа


    class Config:
        env_file = ".env"


settings = Settings()