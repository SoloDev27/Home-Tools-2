from sqlalchemy import Column, Integer, String, TEXT, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    first_name = Column(TEXT, default="New")
    last_name = Column(TEXT, default="User")
    phone_number = Column(String)
    country_code = Column(String)
    area_code = Column(String)
    bio = Column(TEXT)
    profile_icon = Column(TEXT)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    maps = relationship("Map", back_populates="owner", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="owner", cascade="all, delete-orphan")
    images = relationship("Image", back_populates="owner", cascade="all, delete-orphan")
    floors = relationship("Floor", back_populates="owner", cascade="all, delete-orphan")
    saved_types = relationship("SavedType", back_populates="owner", cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="user", uselist=False, cascade="all, delete-orphan")

import re

PHONE_REGEX = re.compile(r"^\+?[\d\s\-\(\)]{7,20}$")
COUNTRY_CODE_REGEX = re.compile(r"^\+\d{1,4}$")
AREA_CODE_REGEX = re.compile(r"^\d{3}$")

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=25)
    first_name: Optional[str] = "New"
    last_name: Optional[str] = "User"
    phone: Optional[str] = None
    country_code: Optional[str] = None
    area_code: Optional[str] = None
    bio: Optional[str] = None
    profile_icon: Optional[str] = None

class UserProfileSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    area_code: Optional[str] = None
    bio: Optional[str] = None
    profile_icon: Optional[str] = None
    username: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None and not PHONE_REGEX.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @field_validator('country_code')
    @classmethod
    def validate_country_code(cls, v):
        if v is not None and not COUNTRY_CODE_REGEX.match(v):
            raise ValueError("Country code must be like +1, +44, +81")
        return v

    @field_validator('area_code')
    @classmethod
    def validate_area_code(cls, v):
        if v is not None and not AREA_CODE_REGEX.match(v):
            raise ValueError("Area code must be exactly 3 digits")
        return v

class UserAccountSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=25)
