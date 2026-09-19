import pytest
from fastapi.testclient import TestClient

def test_areas_features_notes_crud(client: TestClient, auth_headers: dict):
    # 1. Create a map
    map_res = client.post("/api/maps/", json={"name": "Test Site Map"}, headers=auth_headers)
    assert map_res.status_code == 200
    map_id = map_res.json()["id"]

    # 2. Create an Area (Sectioning)
    area_payload = {
        "map_id": map_id,
        "name": "North Lot",
        "type": "lot",
        "coordinates": [[
            [-83.5, 32.9],
            [-83.49, 32.9],
            [-83.49, 32.91],
            [-83.5, 32.91],
            [-83.5, 32.9]
        ]],
        "width": 300.0,
        "length": 400.0,
        "area_sqft": 120000.0,
        "area_acres": 2.75,
        "color": "#3b82f6"
    }
    area_res = client.post("/api/areas", json=area_payload, headers=auth_headers)
    assert area_res.status_code == 200
    area_data = area_res.json()["data"]["area"]
    area_id = area_data["id"]
    assert area_data["name"] == "North Lot"
    assert area_data["map_id"] == map_id

    # 3. Get all areas
    get_areas_res = client.get(f"/api/areas/all?map_id={map_id}", headers=auth_headers)
    assert get_areas_res.status_code == 200
    assert len(get_areas_res.json()["data"]["areas"]) >= 1

    # 4. Create a Feature child of the Area
    feat_payload = {
        "map_id": map_id,
        "area_id": area_id,
        "type": "utility",
        "name": "Water Main",
        "geometry": {
            "type": "LineString",
            "coordinates": [[-83.5, 32.9], [-83.495, 32.905]]
        },
        "properties_data": {"color": "#0284c7"}
    }
    feat_res = client.post("/api/features", json=feat_payload, headers=auth_headers)
    assert feat_res.status_code == 200
    feat_data = feat_res.json()["data"]["feature"]
    feat_id = feat_data["id"]
    assert feat_data["area_id"] == area_id

    # 5. Create a Property child of the Area
    prop_payload = {
        "map_id": map_id,
        "area_id": area_id,
        "name": "Residence Unit 1",
        "type": "home",
        "lat": 32.905,
        "lng": -83.495
    }
    prop_res = client.post("/api/property", json=prop_payload, headers=auth_headers)
    assert prop_res.status_code == 200
    prop_data = prop_res.json()["data"]["property"]
    prop_id = prop_data["id"]
    assert prop_data["area_id"] == area_id

    # 6. Create Notes attached to Map, Area, Property, and Feature
    note_prop_res = client.post("/api/notes", json={
        "map_id": map_id,
        "area_id": area_id,
        "property_id": prop_id,
        "title": "Roof Inspection",
        "content": "Check shingles and gutters",
        "category": "inspection",
        "cost_estimate": 450.0
    }, headers=auth_headers)
    assert note_prop_res.status_code == 200
    note_id = note_prop_res.json()["data"]["note"]["id"]

    # 7. Get notes with filters
    notes_filter_res = client.get(f"/api/notes/all?map_id={map_id}&property_id={prop_id}", headers=auth_headers)
    assert notes_filter_res.status_code == 200
    notes_list = notes_filter_res.json()["data"]["notes"]
    assert len(notes_list) == 1
    assert notes_list[0]["title"] == "Roof Inspection"
    assert notes_list[0]["cost_estimate"] == 450.0

    # 8. Update Note
    note_update_res = client.put(f"/api/notes/{note_id}", json={
        "status": "completed"
    }, headers=auth_headers)
    assert note_update_res.status_code == 200
    assert note_update_res.json()["data"]["note"]["status"] == "completed"

    # 9. Clean up
    del_note_res = client.delete(f"/api/notes/{note_id}", headers=auth_headers)
    assert del_note_res.status_code == 200

    del_feat_res = client.delete(f"/api/features/{feat_id}", headers=auth_headers)
    assert del_feat_res.status_code == 200

    del_prop_res = client.delete(f"/api/property/{prop_id}", headers=auth_headers)
    assert del_prop_res.status_code == 200

    del_area_res = client.delete(f"/api/areas/{area_id}", headers=auth_headers)
    assert del_area_res.status_code == 200
