import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy.dialects.postgresql import Any


class Token(BaseModel):
    access_token: str
    token_type: str

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    password_confirm: str

    @field_validator("username")
    def username_not_empty(cls, v):
        if not v.strip():
            raise ValueError("username must not be empty")
        return v

    @field_validator("password_confirm")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("passwords do not match")
        return v

class UserPublic(BaseModel):
    id: str
    email: EmailStr
    username: str

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: uuid.UUID
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PostBase(BaseModel):
    type: str
    display_name: str
    visibility_mode: Optional[str] = None
    status: str = "active"
    content_json: dict[str, Any]


class PostCreate(PostBase):
    parent_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID


class PostUpdate(BaseModel):
    display_name: Optional[str] = None
    visibility_mode: Optional[str] = None
    status: Optional[str] = None
    content_json: Optional[dict[str, Any]] = None


class PostRead(PostBase):
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FriendshipBase(BaseModel):
    friend_id: uuid.UUID
    status: str = "pending"
    is_close: bool = False


class FriendshipCreate(FriendshipBase):
    user_id: uuid.UUID


class FriendshipRead(FriendshipBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
