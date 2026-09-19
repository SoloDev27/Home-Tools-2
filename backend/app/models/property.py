from sqlalchemy import Column, Integer, String, Float, ForeignKey, TEXT, TIMESTAMP, JSON, types
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# Pydantic models for Hierarchical Data
class NoteSchema(BaseModel):
    id: str
    type: str  # 'compiled', 'inspection_daily', 'inspection_prev'
    title: str = ""
    content: str = ""

class DimensionSchema(BaseModel):
    h: float = 0
    w: float = 0
    l: float = 0
    sqft: float = 0

class RoomSchema(BaseModel):
    id: str
    name: str
    dimensions: Optional[DimensionSchema] = None
    notes: List[NoteSchema] = []

class FloorNodeSchema(BaseModel):
    id: str
    name: str
    dimensions: Optional[DimensionSchema] = None
    notes: List[NoteSchema] = []
    rooms: List[RoomSchema] = []

class HierarchySchema(BaseModel):
    dimensions: Optional[DimensionSchema] = None
    notes: List[NoteSchema] = []
    floors: List[FloorNodeSchema] = []
    coordinates: Optional[Any] = None

class PydanticType(types.TypeDecorator):
    """
    SQLAlchemy TypeDecorator to automatically serialize/deserialize 
    Pydantic models to JSONB (on Postgres) or JSON (on other DBs).
    """
    impl = JSON
    cache_ok = True
    
    def __init__(self, pydantic_model: Any, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pydantic_model = pydantic_model

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, BaseModel):
            return value.model_dump(mode="json")
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return self.pydantic_model.model_validate(value)

class Property(Base):
    __tablename__ = "property"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    name = Column(TEXT, nullable=False)
    address = Column(TEXT)
    city = Column(TEXT)
    county = Column(TEXT)
    state = Column(TEXT)
    country = Column(TEXT)
    zip = Column(TEXT)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    group_id = Column(Integer, ForeignKey("home_groups.id", ondelete="CASCADE"))
    area_id = Column(Integer, ForeignKey("areas.id", ondelete="CASCADE"), nullable=True)
    type = Column(TEXT, default='home')
    icon = Column(TEXT)
    hierarchy = Column(PydanticType(HierarchySchema))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="properties")
    map = relationship("Map", back_populates="properties")
    area = relationship("Area", back_populates="properties")
    group = relationship("HomeGroup", back_populates="properties")
    images = relationship("Image", back_populates="property", cascade="all, delete-orphan")
    floors = relationship("Floor", back_populates="property", cascade="all, delete-orphan")
    render = relationship("Render", back_populates="property", uselist=False, cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="property", cascade="all, delete-orphan")

class PropertySchema(BaseModel):
    id: Optional[int] = None
    owner_id: Optional[int] = None
    map_id: Optional[int] = None
    area_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    address: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    type: Optional[str] = "home"
    icon: Optional[str] = None
    hierarchy: Optional[HierarchySchema] = None