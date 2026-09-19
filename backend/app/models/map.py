from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, TEXT
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class Map(Base):
    __tablename__ = "maps"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(TEXT)
    image_location = Column(TEXT, nullable=True)
    image_lat = Column(Float, nullable=True)
    image_lng = Column(Float, nullable=True)
    image_zoom = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="maps")
    points = relationship("Point", back_populates="map", cascade="all, delete-orphan")
    properties = relationship("Property", back_populates="map", cascade="all, delete-orphan")
    areas = relationship("Area", back_populates="map", cascade="all, delete-orphan")
    features = relationship("Feature", back_populates="map", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="map", cascade="all, delete-orphan")


# Pydantic Schemas
class MapBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_location: Optional[str] = None
    image_lat: Optional[float] = None
    image_lng: Optional[float] = None
    image_zoom: Optional[float] = None

class MapCreate(MapBase):
    pass

class MapUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_location: Optional[str] = None
    image_lat: Optional[float] = None
    image_lng: Optional[float] = None
    image_zoom: Optional[float] = None

class PointPreview(BaseModel):
    id: int
    name: str
    type: str
    lng: float
    lat: float

class MapResponse(MapBase):
    id: int
    owner_id: int
    points_count: int = 0
    computed_center: Optional[List[float]] = None
    computed_zoom: Optional[float] = None
    points_preview: Optional[List[PointPreview]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

