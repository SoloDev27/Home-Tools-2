from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db_session
from app.models.feature import Feature, FeatureCreate, FeatureUpdate, FeatureResponse
from app.models.map import Map
from app.models.area import Area
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user
from typing import Optional, List

router = APIRouter(prefix="/features", tags=["Features"])

@router.get("/all")
def get_all_features(
    map_id: int, 
    area_id: Optional[int] = None,
    property_id: Optional[int] = None,
    current_user = Depends(get_current_user), 
    db: Session = Depends(get_db_session)
):
    map_obj = db.query(Map).filter(Map.id == map_id, Map.owner_id == current_user["id"]).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    
    query = db.query(Feature).filter(Feature.map_id == map_id, Feature.owner_id == current_user["id"])
    if area_id is not None:
        query = query.filter(Feature.area_id == area_id)
    if property_id is not None:
        query = query.filter(Feature.property_id == property_id)
        
    features = query.order_by(Feature.created_at.asc()).all()
    return ResponseModel(True, "", {"features": features})

@router.get("/{feature_id}")
def get_feature_by_id(feature_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    feat = db.query(Feature).filter(Feature.id == feature_id, Feature.owner_id == current_user["id"]).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Feature not found")
    return ResponseModel(True, "", {"feature": feat})

@router.post("")
def create_feature(data: FeatureCreate, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    map_obj = db.query(Map).filter(Map.id == data.map_id, Map.owner_id == current_user["id"]).first()
    if not map_obj:
        raise HTTPException(status_code=404, detail="Map not found")
    
    if data.area_id:
        area_obj = db.query(Area).filter(Area.id == data.area_id, Area.owner_id == current_user["id"]).first()
        if not area_obj:
            raise HTTPException(status_code=404, detail="Area not found")

    new_feat = Feature(
        owner_id=current_user["id"],
        map_id=data.map_id,
        area_id=data.area_id,
        property_id=data.property_id,
        type=data.type,
        name=data.name,
        icon=data.icon,
        geometry=data.geometry,
        properties_data=data.properties_data or {}
    )
    db.add(new_feat)
    db.commit()
    db.refresh(new_feat)
    return ResponseModel(True, "Feature created successfully", {"feature": new_feat})

@router.put("/{feature_id}")
@router.patch("/{feature_id}")
def update_feature(feature_id: int, data: FeatureUpdate, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    feat = db.query(Feature).filter(Feature.id == feature_id, Feature.owner_id == current_user["id"]).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Feature not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(feat, field, val)
    
    db.commit()
    db.refresh(feat)
    return ResponseModel(True, "Feature updated successfully", {"feature": feat})

@router.delete("/{feature_id}")
def delete_feature(feature_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    feat = db.query(Feature).filter(Feature.id == feature_id, Feature.owner_id == current_user["id"]).first()
    if not feat:
        raise HTTPException(status_code=404, detail="Feature not found")
    db.delete(feat)
    db.commit()
    return ResponseModel(True, "Feature deleted successfully")
