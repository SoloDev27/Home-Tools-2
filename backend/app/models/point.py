from sqlalchemy import Column, Integer, String, Float, ForeignKey, TEXT, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base
from pydantic import BaseModel
from enum import Enum
from typing import Optional

class PointType(str, Enum):
    radius = "radius"
    line = "line"
    home = "home"
    apartment = "apartment"
    unit = "unit"
    icon = "icon"
    marker = "marker"
    structure = "structure"
    valve = "valve"
    flora = "flora"
    inspection = "inspection"
    fixture = "fixture"
    polygon = "polygon"
    rectangle = "rectangle"
    measure = "measure"
    setback = "setback"
    utility = "utility"
    curve = "curve"
    callout = "callout"
    material = "material"

class Point(Base):
    __tablename__ = "points"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    type = Column(TEXT, nullable=False)
    name = Column(TEXT, nullable=False)
    icon = Column(TEXT)
    lng = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    end_lng = Column(Float)
    end_lat = Column(Float)
    radius = Column(Float)
    unit_id = Column(Integer, ForeignKey("property.id", ondelete="SET NULL"))
    extra_info = Column(JSON)

    # Relationships
    map = relationship("Map", back_populates="points")

class PointSchema(BaseModel):
    map_id: Optional[int] = None
    type: PointType
    name: str
    icon: Optional[str] = None
    lng: float
    lat: float
    end_lng: Optional[float] = None
    end_lat: Optional[float] = None
    radius: Optional[float] = None
    unit_id: Optional[int] = None
    extra_info: Optional[dict] = None