from sqlalchemy import Column, Integer, String, Float, ForeignKey, TEXT, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id", ondelete="CASCADE"), nullable=True)
    property_id = Column(Integer, ForeignKey("property.id", ondelete="SET NULL"), nullable=True)
    type = Column(TEXT, nullable=False)  # footprint, setback, measure, utility, curve, material, valve, flora, fixture, inspection, pin, callout
    name = Column(TEXT, nullable=False)
    icon = Column(TEXT, nullable=True)
    geometry = Column(JSON, nullable=False)  # JSON blob of coordinates and shape structure: { type: "Polygon"|"LineString"|"Point", coordinates: [...] }
    properties_data = Column(JSON, nullable=True)  # styles, color, depth, materialType, measurements, text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", backref="features")
    map = relationship("Map", back_populates="features")
    area = relationship("Area", back_populates="features")
    property = relationship("Property", backref="features")
    notes = relationship("Note", back_populates="feature", cascade="all, delete-orphan")

class FeatureBase(BaseModel):
    area_id: Optional[int] = None
    property_id: Optional[int] = None
    type: str
    name: str
    icon: Optional[str] = None
    geometry: Any  # JSON blob
    properties_data: Optional[Dict[str, Any]] = None

class FeatureCreate(FeatureBase):
    map_id: int

class FeatureUpdate(BaseModel):
    area_id: Optional[int] = None
    property_id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None
    icon: Optional[str] = None
    geometry: Optional[Any] = None
    properties_data: Optional[Dict[str, Any]] = None

class FeatureResponse(FeatureBase):
    id: int
    owner_id: int
    map_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
