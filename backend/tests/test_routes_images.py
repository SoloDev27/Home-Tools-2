"""Image route tests use multipart form uploads for the required file field."""
"""Image route tests.
Note: The add_image endpoint receives schema fields as separate query/form params
(because the route uses image_schema: ImageSchema = Depends()), so they must be sent
with ?param=value in the URL for multipart uploads.
"""
import os
import io

# Ensure upload directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def _upload(client, auth_headers, prop_id, filename="test.png"):
    file_data = io.BytesIO(b"fake-image-data")
    return client.post(
        f"/api/images?default_filename={filename}&type=property&property_id={prop_id}",
        files={"file": (filename, file_data, "image/png")},
        headers=auth_headers
    )

def test_upload_image(client, auth_headers):
    prop = client.post("/api/property", json={"map_id": 1, "name": "Img Home", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop.json()["data"]["property"]["id"]
    res = _upload(client, auth_headers, prop_id)
    assert res.status_code == 200, f"Upload failed (status={res.status_code}): {res.text}"
    data = res.json()
    assert data["success"] is True, f"Upload not successful: {res.text}"
    assert "id" in data["data"]

def test_uploaded_file_lands_under_the_authenticated_owner(client, auth_headers):
    """The upload path must carry the authenticated user's id.

    ImageSchema.owner_id defaults to None and is never set from the request, so
    reading it when building the path wrote every file to
    app/uploads/None/property/None/ and made it unfindable by its owner.
    """
    from pathlib import Path
    from app.utils.image_utils import UPLOAD_ROOT

    prop = client.post("/api/property", json={"map_id": 1, "name": "Path Home", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop.json()["data"]["property"]["id"]
    res = _upload(client, auth_headers, prop_id, "ownerpath.png")
    assert res.status_code == 200, res.text
    img_id = res.json()["data"]["id"]

    # The file is served back, so the path recorded in the DB is real.
    detail = client.get(f"/api/images/{img_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert b"fake-image-data" in detail.content

    root = Path(UPLOAD_ROOT)
    assert not any("None" in p.parts for p in root.rglob("*.png")), \
        "an upload was written under a None owner"
    assert (root / "1" / "property").is_dir(), \
        "the upload did not land under the authenticated owner's directory"


def test_upload_image_missing_file(client, auth_headers):
    res = client.post(
        "/api/images?default_filename=test.png&type=property",
        headers=auth_headers
    )
    assert res.status_code == 422

def test_delete_image(client, auth_headers):
    prop = client.post("/api/property", json={"map_id": 1, "name": "Del Home", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop.json()["data"]["property"]["id"]
    create_res = _upload(client, auth_headers, prop_id, "del.png")
    assert create_res.status_code == 200, f"Create failed: {create_res.text}"
    img_id = create_res.json()["data"]["id"]
    del_res = client.delete(f"/api/images/{img_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
