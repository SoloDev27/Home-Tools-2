def test_create_floor(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test Home", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    res = client.post("/api/floors", json={
        "property_id": prop_id,
        "name": "First Floor",
        "bedroom_count": 3,
        "bathroom_count": 2
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["data"]["floor"]["name"] == "First Floor"
    assert data["data"]["floor"]["bedroom_count"] == 3

def test_get_floors_by_property(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    client.post("/api/floors", json={"property_id": prop_id, "name": "Floor 1"}, headers=auth_headers)
    client.post("/api/floors", json={"property_id": prop_id, "name": "Floor 2"}, headers=auth_headers)
    res = client.get(f"/api/floors/{prop_id}/all", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["data"]["floors"]) == 2

def test_edit_floor(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    create_res = client.post("/api/floors", json={"property_id": prop_id, "name": "Old Floor"}, headers=auth_headers)
    floor_id = create_res.json()["data"]["floor"]["id"]
    res = client.patch(f"/api/floors/{floor_id}", json={"property_id": prop_id, "name": "Renamed Floor", "bedroom_count": 4}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["floor"]["name"] == "Renamed Floor"
    assert res.json()["data"]["floor"]["bedroom_count"] == 4

def test_delete_floor(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    create_res = client.post("/api/floors", json={"property_id": prop_id, "name": "Delete Me"}, headers=auth_headers)
    floor_id = create_res.json()["data"]["floor"]["id"]
    res = client.delete(f"/api/floors/{floor_id}", headers=auth_headers)
    assert res.status_code == 200
