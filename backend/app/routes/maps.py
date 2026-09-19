from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db_session
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.map import Map, MapCreate, MapUpdate, MapResponse, PointPreview

router = APIRouter(prefix="/maps", tags=["maps"])

def format_map_response(db_map: Map) -> MapResponse:
    points = db_map.points or []
    points_count = len(points)
    
    if not points:
        computed_center = [-98.5795, 39.8283]
        computed_zoom = 4.0
    elif len(points) == 1:
        computed_center = [points[0].lng, points[0].lat]
        computed_zoom = 12.0
    else:
        best_cluster = [points[0]]
        for p in points:
            cluster = [
                other for other in points
                if abs(other.lng - p.lng) <= 0.2 and abs(other.lat - p.lat) <= 0.2
            ]
            if len(cluster) > len(best_cluster):
                best_cluster = cluster
                
        avg_lng = sum(p.lng for p in best_cluster) / len(best_cluster)
        avg_lat = sum(p.lat for p in best_cluster) / len(best_cluster)
        computed_center = [round(avg_lng, 6), round(avg_lat, 6)]
        computed_zoom = 12.0

    points_preview = [
        PointPreview(id=p.id, name=p.name, type=p.type, lng=p.lng, lat=p.lat)
        for p in points
    ]

    return MapResponse(
        id=db_map.id,
        owner_id=db_map.owner_id,
        name=db_map.name,
        description=db_map.description,
        image_location=db_map.image_location,
        image_lat=db_map.image_lat,
        image_lng=db_map.image_lng,
        image_zoom=db_map.image_zoom,
        points_count=points_count,
        computed_center=computed_center,
        computed_zoom=computed_zoom,
        points_preview=points_preview,
        created_at=db_map.created_at,
        updated_at=db_map.updated_at,
    )

COMMON_SYMBOLS = "!@#$%?.-,':;_&()"
ALLOWED_MAP_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 " + COMMON_SYMBOLS)
ALLOWED_DESC_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 \n\r" + COMMON_SYMBOLS)

@router.get("/", response_model=List[MapResponse])
def get_maps(db: Session = Depends(get_db_session), current_user: dict = Depends(get_current_user)):
    maps = db.query(Map).filter(Map.owner_id == current_user["id"]).all()
    return [format_map_response(m) for m in maps]

@router.post("/", response_model=MapResponse)
def create_map(map_data: MapCreate, db: Session = Depends(get_db_session), current_user: dict = Depends(get_current_user)):
    name = (map_data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Map Name is required and cannot be empty.")
    if len(name) > 25:
        raise HTTPException(status_code=400, detail="Map Name cannot exceed 25 characters.")
    for ch in name:
        if ch not in ALLOWED_MAP_CHARS:
            raise HTTPException(status_code=400, detail=f"Map Name contains invalid character '{ch}'. Allowed: letters, numbers, spaces, and {COMMON_SYMBOLS}")

    desc = map_data.description
    if desc:
        if len(desc) > 125:
            raise HTTPException(status_code=400, detail="Description cannot exceed 125 characters.")
        for ch in desc:
            if ch not in ALLOWED_DESC_CHARS:
                raise HTTPException(status_code=400, detail=f"Description contains invalid character '{ch}'. Allowed: letters, numbers, spaces, and {COMMON_SYMBOLS}")

    data = map_data.model_dump()
    data["name"] = name
    new_map = Map(**data, owner_id=current_user["id"])
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return format_map_response(new_map)

@router.get("/{map_id}", response_model=MapResponse)
def get_map(map_id: int, db: Session = Depends(get_db_session), current_user: dict = Depends(get_current_user)):
    db_map = db.query(Map).filter(Map.id == map_id, Map.owner_id == current_user["id"]).first()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
    return format_map_response(db_map)

@router.put("/{map_id}", response_model=MapResponse)
def update_map(map_id: int, map_update: MapUpdate, db: Session = Depends(get_db_session), current_user: dict = Depends(get_current_user)):
    db_map = db.query(Map).filter(Map.id == map_id, Map.owner_id == current_user["id"]).first()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
    
    update_data = map_update.model_dump(exclude_unset=True)
    if "name" in update_data:
        name_val = (update_data["name"] or "").strip()
        if not name_val:
            raise HTTPException(status_code=400, detail="Map Name is required and cannot be empty.")
        if len(name_val) > 25:
            raise HTTPException(status_code=400, detail="Map Name cannot exceed 25 characters.")
        for ch in name_val:
            if ch not in ALLOWED_MAP_CHARS:
                raise HTTPException(status_code=400, detail=f"Map Name contains invalid character '{ch}'. Allowed: letters, numbers, spaces, and {COMMON_SYMBOLS}")
        update_data["name"] = name_val

    if "description" in update_data and update_data["description"]:
        desc_val = update_data["description"]
        if len(desc_val) > 125:
            raise HTTPException(status_code=400, detail="Description cannot exceed 125 characters.")
        for ch in desc_val:
            if ch not in ALLOWED_DESC_CHARS:
                raise HTTPException(status_code=400, detail=f"Description contains invalid character '{ch}'. Allowed: letters, numbers, spaces, and {COMMON_SYMBOLS}")

    if "image_location" in update_data and not update_data["image_location"]:
        db_map.image_location = None
        db_map.image_lat = None
        db_map.image_lng = None
        db_map.image_zoom = None
        update_data.pop("image_location", None)
        update_data.pop("image_lat", None)
        update_data.pop("image_lng", None)
        update_data.pop("image_zoom", None)

    for key, value in update_data.items():
        setattr(db_map, key, value)
        
    db.commit()
    db.refresh(db_map)
    return format_map_response(db_map)

@router.delete("/{map_id}")
def delete_map(map_id: int, db: Session = Depends(get_db_session), current_user: dict = Depends(get_current_user)):
    db_map = db.query(Map).filter(Map.id == map_id, Map.owner_id == current_user["id"]).first()
    if not db_map:
        raise HTTPException(status_code=404, detail="Map not found")
        
    db.delete(db_map)
    db.commit()
    return {"message": "Map deleted successfully"}
