import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.config import settings
from app.api.endpoints import auth, diary, favorites, friends, permissions
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

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(diary.router, prefix="/api/diary", tags=["diary"])
app.include_router(friends.router, prefix="/api/diary", tags=["friends"])
app.include_router(favorites.router, prefix="/api/diary", tags=["favorites"])
# app.include_router(permissions.router, prefix="/api/permissions", tags=["permissions"])
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HTML_DIR = os.path.join("/frontend", "public")  # пример


@app.get("/health")
def health():
    return {"status": "ok"}


# # if __name__ == '__main__':
# #     app.r