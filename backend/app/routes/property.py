import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv

from app.db.session import get_db_session
from app.models.property import Property, PropertySchema
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user
from app.utils.image_utils import delete_image

load_dotenv()
PROJECT_ENV = os.environ.get("PROJECT_ENV", "development")

router = APIRouter(prefix="/property", tags=["Property"])

# GET METHODS - ALL, BY ID
@router.get("/all")
def all_properties(map_id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    properties = db.query(Property).filter(Property.owner_id == current_user["id"], Property.map_id == map_id).all()
    
    return ResponseModel(True, "", {"properties": properties})


@router.get("/{id}")
def get_property_by_id(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    prop = db.query(Property).filter(Property.id == id).first()
    
    if not prop:
        raise HTTPException(status_code=404, detail=f"Property with ID {id} not found")
    if prop.owner_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="User does not have permission to access this property")
        
    return ResponseModel(True, "", {"property": prop})


# CREATE PROPERTY
@router.post("")
def create_property(property_schema: PropertySchema, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    if property_schema.map_id is None:
        raise HTTPException(status_code=400, detail="Missing required field: map_id")
    if property_schema.name is None:
        raise HTTPException(status_code=400, detail="Missing required field: name")
    if property_schema.lat is None or property_schema.lng is None:
        raise HTTPException(status_code=400, detail="Missing required field: lat, lng")
    try:
        new_prop = Property(
            owner_id=current_user["id"],
            map_id=property_schema.map_id,
            area_id=property_schema.area_id,
            name=property_schema.name,
            address=property_schema.address,
            city=property_schema.city,
            county=property_schema.county,
            state=property_schema.state,
            country=property_schema.country,
            zip=property_schema.zip,
            lat=property_schema.lat,
            lng=property_schema.lng,
            type=property_schema.type,
            icon=property_schema.icon,
            hierarchy=property_schema.hierarchy
        )
        
        db.add(new_prop)
        db.commit()
        db.refresh(new_prop)
        
        return ResponseModel(True, "", {"property": new_prop})
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# Edit Property
@router.patch("/{id}")
def edit_property(id: int, property_schema: PropertySchema, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    try:
        prop = db.query(Property).filter(Property.id == id).first()
        if not prop:
            raise HTTPException(status_code=404, detail=f"Property with ID {id} not found")
        if prop.owner_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to access this property")
            
        update_data = property_schema.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(prop, key, value)

        db.commit()
        db.refresh(prop)
        return ResponseModel(True, "Property edited successfully", {"property": prop})
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# Delete Property
@router.delete("/{id}")
def delete_property(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    try:
        prop = db.query(Property).filter(Property.id == id, Property.owner_id == current_user["id"]).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property to delete not found")
            
        # Handle image deletion
        if prop.images:
            for img in prop.images:
                try:
                    if img.filepath:
                        delete_image(img.filepath) 
                except Exception as e:
                    print(f"Warning: Failed to delete image: {e}")
                    
        db.delete(prop)
        db.commit()
        return ResponseModel(True, "Property successfully deleted")
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))