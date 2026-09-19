from sqlalchemy import Column, Integer, String, Float, ForeignKey, TEXT, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id", ondelete="CASCADE"), nullable=True)
    property_id = Column(Integer, ForeignKey("property.id", ondelete="CASCADE"), nullable=True)
    feature_id = Column(Integer, ForeignKey("features.id", ondelete="CASCADE"), nullable=True)
    title = Column(TEXT, nullable=False)
    content = Column(TEXT, nullable=False)
    category = Column(TEXT, default="general")  # general, maintenance, inspection, work_order, estimate
    status = Column(TEXT, default="open")  # open, in_progress, completed
    priority = Column(TEXT, default="medium")  # low, medium, high, urgent
    cost_estimate = Column(Float, nullable=True)
    extra_info = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", backref="user_notes")
    map = relationship("Map", back_populates="notes")
    area = relationship("Area", back_populates="notes")
    property = relationship("Property", back_populates="notes")
    feature = relationship("Feature", back_populates="notes")

class NoteBase(BaseModel):
    area_id: Optional[int] = None
    property_id: Optional[int] = None
    feature_id: Optional[int] = None
    title: str
    content: str
    category: Optional[str] = "general"
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"
    cost_estimate: Optional[float] = None
    extra_info: Optional[Dict[str, Any]] = None

class NoteCreate(NoteBase):
    map_id: int

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    cost_estimate: Optional[float] = None
    extra_info: Optional[Dict[str, Any]] = None

class NoteResponse(NoteBase):
    id: int
    owner_id: int
    map_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
