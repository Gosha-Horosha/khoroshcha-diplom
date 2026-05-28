import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.config import settings
from app.api.endpoints import auth, diary, permissions
from app.db.session import engine, get_db
from app.db.models import Base

# from app.schemas import diary

# Создание таблиц
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Diary App API",
    description="API для управления личным дневником",
    version="1.0.0"
)

#
# Настройка CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.BACKEND_CORS_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
#
# Подключение роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(diary.router, prefix="/api/diary", tags=["diary"])
# app.include_router(permissions.router, prefix="/api/permissions", tags=["permissions"])
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_DIR = os.path.join("/frontend", "public")  # пример


@app.get("/login")
async def login_page():
    return FileResponse(os.path.join(HTML_DIR, "login.html"))

# if __name__ == '__main__':
#     app.r