from sqlalchemy import Column, Integer, String, Float, ForeignKey, TEXT, JSON, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class Area(Base):
    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    name = Column(TEXT, nullable=False)
    type = Column(TEXT, nullable=False, default="polygon")  # polygon, rectangle, radius, lot
    coordinates = Column(JSON, nullable=True)  # JSON blob of coordinates [[lng, lat], ...]
    width = Column(Float, nullable=True)  # width in meters / feet
    length = Column(Float, nullable=True)  # length in meters / feet
    radius = Column(Float, nullable=True)  # radius for circular zones
    area_sqft = Column(Float, nullable=True)  # calculated surface area in sq ft
    area_acres = Column(Float, nullable=True)  # calculated surface area in acres
    color = Column(TEXT, nullable=True, default="#3b82f6")
    extra_info = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", backref="areas")
    map = relationship("Map", back_populates="areas")
    properties = relationship("Property", back_populates="area", cascade="all, delete-orphan")
    features = relationship("Feature", back_populates="area", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="area", cascade="all, delete-orphan")

class AreaBase(BaseModel):
    name: str
    type: str = "polygon"
    coordinates: Optional[Any] = None
    width: Optional[float] = None
    length: Optional[float] = None
    radius: Optional[float] = None
    area_sqft: Optional[float] = None
    area_acres: Optional[float] = None
    color: Optional[str] = "#3b82f6"
    extra_info: Optional[Dict[str, Any]] = None

class AreaCreate(AreaBase):
    map_id: int

class AreaUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    coordinates: Optional[Any] = None
    width: Optional[float] = None
    length: Optional[float] = None
    radius: Optional[float] = None
    area_sqft: Optional[float] = None
    area_acres: Optional[float] = None
    color: Optional[str] = None
    extra_info: Optional[Dict[str, Any]] = None

class AreaResponse(AreaBase):
    id: int
    owner_id: int
    map_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
