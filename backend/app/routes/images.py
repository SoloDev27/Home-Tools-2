import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.db.session import get_db_session
from app.models.image import Image, ImageSchema
from app.models.property import Property
from app.models.response_model import ResponseModel
from app.routes.auth import get_current_user
from app.utils.image_utils import upload_image, delete_image

load_dotenv()
PROJECT_ENV = os.environ.get("PROJECT_ENV", "development")

router = APIRouter(prefix="/images", tags=["Images"])

# Get Image By ID
@router.get("/{id}")
def get_image_by_id(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    image = db.query(Image).filter(Image.id == id, Image.owner_id == current_user["id"]).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if not os.path.exists(image.filepath):
        raise HTTPException(status_code=404, detail="File missing")
    return FileResponse(image.filepath)


# Upload Images
@router.post("")
def add_image(image_schema: ImageSchema = Depends(), file: UploadFile = File(...), current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    # Note: image_schema = Depends() is for form-data if needed, but the original code used it.
    # Actually, the original used image: Image which might have been a Pydantic model parsed from JSON in a field?
    # No, FastAPI handles it. But for file uploads often you use individual fields or a class with Depends.
    
    if image_schema.type == "property":
        prop = db.query(Property).filter(Property.id == image_schema.property_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        if prop.owner_id != current_user["id"]:
            raise HTTPException(status_code=401, detail="User not authorized to add image to property")
            
    uploaded_img = upload_image(image_schema, file, owner_id=current_user["id"])
    if not uploaded_img:
        return ResponseModel(False, "Failed to upload image")
        
    new_image = Image(
        owner_id=current_user["id"],
        property_id=image_schema.property_id,
        default_filename=image_schema.default_filename,
        filename=uploaded_img["filename"],
        filepath=uploaded_img["filepath"],
        content_type=file.content_type,
        type=image_schema.type,
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    
    return ResponseModel(True, "", data={
        "id": new_image.id, 
        "property_id": new_image.property_id,
        "filename": new_image.filename
    })


# Replace Image
@router.put("/{id}")
def replace_image(id: int, image_schema: ImageSchema = Depends(), file: UploadFile = File(...), current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    image = db.query(Image).filter(Image.id == id, Image.owner_id == current_user["id"]).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    deleted = delete_image(image.filepath)
    if deleted:
        db.delete(image)
        db.commit()
        return add_image(image_schema, file, current_user, db)
    return ResponseModel(False, "Failed to replace image")


# Delete Image
@router.delete("/{id}")
def remove_image(id: int, current_user = Depends(get_current_user), db: Session = Depends(get_db_session)):
    image = db.query(Image).filter(Image.id == id, Image.owner_id == current_user["id"]).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    deleted = delete_image(image.filepath)
    if deleted:
        db.delete(image)
        db.commit()
        return ResponseModel(True, "Image successfully deleted")
    return ResponseModel(False, "Failed to delete image")