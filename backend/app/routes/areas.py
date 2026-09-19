from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db_session
from app.models.area import Area, AreaCreate, AreaUpdate, AreaResponse
from app.models.map import Map
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user
from typing import Optional, List

router = APIRouter(prefix="/areas", tags=["Areas"])

@router.get("/all")
def get_all_areas(map_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    map_obj = db.query(Map).filter(Map.id == map_id, Map.owner_id == current_user["id"]).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    areas = db.query(Area).filter(Area.map_id == map_id, Area.owner_id == current_user["id"]).order_by(Area.created_at.asc()).all()
    return ResponseModel(True, "", {"areas": areas})

@router.get("/{area_id}")
def get_area_by_id(area_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    area = db.query(Area).filter(Area.id == area_id, Area.owner_id == current_user["id"]).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    return ResponseModel(True, "", {"area": area})

@router.post("")
def create_area(data: AreaCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    map_obj = db.query(Map).filter(Map.id == data.map_id, Map.owner_id == current_user["id"]).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    new_area = Area(
        owner_id=current_user["id"],
        map_id=data.map_id,
        name=data.name,
        type=data.type,
        coordinates=data.coordinates,
        width=data.width,
        length=data.length,
        radius=data.radius,
        area_sqft=data.area_sqft,
        area_acres=data.area_acres,
        color=data.color or "#3b82f6",
        extra_info=data.extra_info
    )
    db.add(new_area)
    db.commit()
    db.refresh(new_area)
    return ResponseModel(True, "Area created successfully", {"area": new_area})

@router.put("/{area_id}")
@router.patch("/{area_id}")
def update_area(area_id: int, data: AreaUpdate, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    area = db.query(Area).filter(Area.id == area_id, Area.owner_id == current_user["id"]).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(area, field, val)
    
    db.commit()
    db.refresh(area)
    return ResponseModel(True, "Area updated successfully", {"area": area})

@router.delete("/{area_id}")
def delete_area(area_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    area = db.query(Area).filter(Area.id == area_id, Area.owner_id == current_user["id"]).first()
    if not area:
        raise HTTPException(status_code=404, detail="Area not found")
    db.delete(area)
    db.commit()
    return ResponseModel(True, "Area deleted successfully")
