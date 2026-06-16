import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


# -----------------------------------------------------------------------------
# Base
# -----------------------------------------------------------------------------

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("password must not be empty")
        return value


class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    password_confirm: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("username must not be empty")
        return value.strip()

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("password must not be empty")
        return value

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.password_confirm:
            raise ValueError("passwords do not match")
        return self


# -----------------------------------------------------------------------------
# Users
# -----------------------------------------------------------------------------

class UserBase(BaseModel):
    email: EmailStr
    username: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("username must not be empty")
        return value.strip()


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("password must not be empty")
        return value


class UserPublic(BaseSchema):
    id: uuid.UUID
    email: EmailStr
    username: str


class UserRead(UserBase):
    id: uuid.UUID
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Posts
# -----------------------------------------------------------------------------

class PostBase(BaseModel):
    display_name: str
    visibility_mode: Optional[str] = None
    status: str = "active"
    content_json: dict[str, Any]

    @field_validator("display_name")
    @classmethod
    def display_name_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("display_name must not be empty")
        return value.strip()



class PostCreate(PostBase):
    parent_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "display_name": "first_user root post",
                "visibility_mode": "friends",
                "status": "active",
                "content_json": {
                    "title": "first_user root post",
                    "text": "мой первый пост",
                    "excerpt": "мой первый пост"
                },
                "parent_id": None
            }
        }
    )

class PostUpdate(BaseModel):
    display_name: Optional[str] = None
    visibility_mode: Optional[str] = None
    status: Optional[str] = None
    content_json: Optional[dict[str, Any]] = None

    @field_validator("display_name")
    @classmethod
    def display_name_not_empty(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("display_name must not be empty")
        return value.strip()


class PostRead(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    type: str
    display_name: str
    visibility_mode: Optional[str] = None
    status: str
    content_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


# -----------------------------------------------------------------------------
# Friendships
# -----------------------------------------------------------------------------

class FriendshipBase(BaseModel):
    friend_id: uuid.UUID
    status: str = "pending"
    is_close: bool = False


class FriendshipCreate(BaseModel):
    friend_id: uuid.UUID
    is_close: bool = False


class FriendshipUpdate(BaseModel):
    status: Optional[str] = None
    is_close: Optional[bool] = None

    @field_validator("status")
    @classmethod
    def status_allowed(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        allowed = {"pending", "accepted", "rejected", "blocked"}
        if value not in allowed:
            raise ValueError(f"status must be one of {sorted(allowed)}")
        return value


class FriendshipRead(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    friend_id: uuid.UUID
    status: str
    is_close: bool
    created_at: datetime
    updated_at: datetime

class FavoriteCreate(BaseModel):
    post_id: uuid.UUID


# -----------------------------------------------------------------------------
# Profile
# -----------------------------------------------------------------------------

class ProfileRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    bio: str = ""


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("username must not be empty")
        return value.strip()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class DeleteAccountRequest(BaseModel):
    password: str


