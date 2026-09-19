import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv

from app.db.session import get_db_session
from app.models.point import Point, PointSchema
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user

load_dotenv()
PROJECT_ENV = os.environ.get("PROJECT_ENV", "development")

router = APIRouter(prefix="/points", tags=["Points"])


# Common logic for point validation and variable setup
def validate_point_data(point_schema: PointSchema, is_patch=False):
    if not is_patch and point_schema.map_id is None:
        raise HTTPException(status_code=400, detail="Missing required field: map_id")

    # Validation based on type
    allowed_types = [
        "icon", "home", "apartment", "unit", "radius", "line", "marker",
        "structure", "valve", "flora", "inspection", "fixture",
        "polygon", "rectangle", "measure", "setback", "utility", "curve", "callout", "material"
    ]
    if point_schema.type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid point type: '{point_schema.type}'. Allowed types are: {', '.join(allowed_types)}")

    if point_schema.type == "radius":
        if not is_patch and point_schema.radius is None:
            raise HTTPException(status_code=400, detail="Missing radius for point type: 'radius'")
    elif point_schema.type == "line":
        if not is_patch:
            if point_schema.end_lng is None or point_schema.end_lat is None:
                raise HTTPException(status_code=400, detail="Missing end_lng and/or end_lat for point type: 'line'")
        
        if point_schema.end_lng is not None and not (-180 <= point_schema.end_lng <= 180):
            raise HTTPException(status_code=400, detail="Invalid end longitude")
        if point_schema.end_lat is not None and not (-90 <= point_schema.end_lat <= 90):
            raise HTTPException(status_code=400, detail="Invalid end latitude")
            
    if not (-180 <= point_schema.lng <= 180):
        raise HTTPException(status_code=400, detail="Longitude must be between -180 and 180")
    if not (-90 <= point_schema.lat <= 90):
        raise HTTPException(status_code=400, detail="Invalid latitude")


# Get All Points By User (and Map)
@router.get("/all")
def get_all_points(map_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    points = db.query(Point).filter(Point.owner_id == current_user["id"], Point.map_id == map_id).all()
    return ResponseModel(True, "", {"points": points})


# Create Point
@router.post("")
def create_point(point_schema: PointSchema, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    validate_point_data(point_schema)
    
    try:
        new_point = Point(
            owner_id=current_user["id"],
            map_id=point_schema.map_id,
            type=point_schema.type,
            name=point_schema.name,
            icon=point_schema.icon,
            lng=point_schema.lng,
            lat=point_schema.lat,
            radius=point_schema.radius,
            end_lng=point_schema.end_lng,
            end_lat=point_schema.end_lat,
            unit_id=point_schema.unit_id,
            extra_info=point_schema.extra_info
        )
        db.add(new_point)
        db.commit()
        db.refresh(new_point)
        return ResponseModel(True, "Point created", {"point": new_point})
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# Edit Point
@router.patch("/{id}")
def edit_point(id: int, point_schema: PointSchema, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    validate_point_data(point_schema, is_patch=True)
    
    try:
        point = db.query(Point).filter(Point.id == id, Point.owner_id == current_user["id"]).first()
        if not point:
            raise HTTPException(status_code=404, detail="Point not found")

        update_data = point_schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(point, key, value)
            
        db.commit()
        db.refresh(point)
        return ResponseModel(True, "Point updated", {"point": point})
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# Delete Point
@router.delete("/{id}")
def delete_point(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    try:
        point = db.query(Point).filter(Point.id == id, Point.owner_id == current_user["id"]).first()
        if not point:
            raise HTTPException(status_code=404, detail="Point not found")
            
        db.delete(point)
        db.commit()
        return ResponseModel(True, "Point deleted successfully")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))