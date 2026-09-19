import os
import uuid
from fastapi import HTTPException, UploadFile, File

from app.models.image import Image

# Absolute, so the upload location does not depend on the process's working
# directory. As a relative path it wrote to ./app/uploads under one cwd and
# backend/app/uploads under another, splitting a user's files across two trees.
UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

# Upload Image
def upload_image(image: Image, file: UploadFile = File(...), owner_id: int | None = None):
    """Persist an upload and return {"filename", "filepath"}.

    owner_id is passed explicitly: ImageSchema.owner_id defaults to None and is
    never populated from the request, so reading it here wrote every file into
    ``app/uploads/None/property/None/``. Callers must supply the authenticated
    user's id."""
    try:
        if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
            raise HTTPException(status_code=400, detail="Invalid image type")
        owner = owner_id if owner_id is not None else image.owner_id
        if owner is None:
            raise HTTPException(status_code=400, detail="Image owner is required")
        kind = "property" if image.type == "property" else "user"
        image_dir = os.path.join(UPLOAD_ROOT, str(owner), kind)
        os.makedirs(image_dir, exist_ok=True)
        ext = os.path.splitext(file.filename or "")[1]
        filename = f'{uuid.uuid4()}{ext}'
        filepath = os.path.join(image_dir, filename)
        with open(filepath, "wb") as f:
            f.write(file.file.read())
        return {"filename": filename, "filepath": filepath}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Warning: Failed to upload image: {e}")
        return False
    

# Delete Image
def delete_image(filepath: str):
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    else:
        return False
    
        