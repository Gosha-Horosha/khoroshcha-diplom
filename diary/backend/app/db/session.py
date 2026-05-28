from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

import uuid
from app.core.config import settings

from app.db.models import Base,User

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# if __name__ == "__main__":
#     Base.metadata.create_all(bind=engine)
#     cur_session = SessionLocal()
#     try:
#         # проверим, не засеяно ли уже
#         existing = cur_session.execute(select(User)).scalars().all()
#         print(existing)
#         # if existing > 0:
#         #     print(f"Users already seeded: {existing}")
#
#         users = [
#             User(
#                 id=uuid.uuid4(),
#                 email="alice@example.com",
#                 username="alice",
#                 password_hash="password123",
#                 role="user",
#             ),
#             User(
#                 id=uuid.uuid4(),
#                 email="bob@example.com",
#                 username="bob",
#                 password_hash="qwerty456",
#                 role="user",
#             ),
#             User(
#                 id=uuid.uuid4(),
#                 email="admin@example.com",
#                 username="admin",
#                 password_hash="admin123",
#                 role="admin",
#             ),
#         ]
#
#         cur_session.add_all(users)
#         cur_session.commit()
#         print("Seeded users:", [u.email for u in users])
#     finally:
#         cur_session.close()
