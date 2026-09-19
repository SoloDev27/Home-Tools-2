from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db_session
from app.models.note import Note, NoteCreate, NoteUpdate, NoteResponse
from app.models.map import Map
from app.models.area import Area
from app.models.property import Property
from app.models.feature import Feature
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user
from typing import Optional, List

router = APIRouter(prefix="/notes", tags=["Notes"])

@router.get("/all")
def get_all_notes(
    map_id: int,
    area_id: Optional[int] = None,
    property_id: Optional[int] = None,
    feature_id: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db_session)
):
    map_obj = db.query(Map).filter(Map.id == map_id, Map.owner_id == current_user["id"]).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    
    query = db.query(Note).filter(Note.map_id == map_id, Note.owner_id == current_user["id"])
    if area_id is not None:
        query = query.filter(Note.area_id == area_id)
    if property_id is not None:
        query = query.filter(Note.property_id == property_id)
    if feature_id is not None:
        query = query.filter(Note.feature_id == feature_id)
    if category is not None:
        query = query.filter(Note.category == category)
    if status is not None:
        query = query.filter(Note.status == status)
        
    notes = query.order_by(Note.created_at.desc()).all()
    return ResponseModel(True, "", {"notes": notes})

@router.get("/{note_id}")
def get_note_by_id(note_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user["id"]).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return ResponseModel(True, "", {"note": note})

@router.post("")
def create_note(data: NoteCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    map_obj = db.query(Map).filter(Map.id == data.map_id, Map.owner_id == current_user["id"]).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    
    if data.area_id:
        area_obj = db.query(Area).filter(Area.id == data.area_id, Area.owner_id == current_user["id"]).first()
        if not area_obj:
            raise HTTPException(status_code=404, detail="Area not found")
            
    if data.property_id:
        prop_obj = db.query(Property).filter(Property.id == data.property_id, Property.owner_id == current_user["id"]).first()
        if not prop_obj:
            raise HTTPException(status_code=404, detail="Property not found")

    if data.feature_id:
        feat_obj = db.query(Feature).filter(Feature.id == data.feature_id, Feature.owner_id == current_user["id"]).first()
        if not feat_obj:
            raise HTTPException(status_code=404, detail="Feature not found")

    new_note = Note(
        owner_id=current_user["id"],
        map_id=data.map_id,
        area_id=data.area_id,
        property_id=data.property_id,
        feature_id=data.feature_id,
        title=data.title,
        content=data.content,
        category=data.category or "general",
        status=data.status or "open",
        priority=data.priority or "medium",
        cost_estimate=data.cost_estimate,
        extra_info=data.extra_info or {}
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return ResponseModel(True, "Note created successfully", {"note": new_note})

@router.put("/{note_id}")
def update_note(note_id: int, data: NoteUpdate, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user["id"]).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(note, field, val)
    
    db.commit()
    db.refresh(note)
    return ResponseModel(True, "Note updated successfully", {"note": note})

@router.delete("/{note_id}")
def delete_note(note_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    note = db.query(Note).filter(Note.id == note_id, Note.owner_id == current_user["id"]).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return ResponseModel(True, "Note deleted successfully")
