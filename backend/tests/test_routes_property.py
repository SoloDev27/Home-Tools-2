def test_create_property(client, auth_headers):
    res = client.post("/api/property", json={
        "map_id": 1,
        "name": "Test Home",
        "lat": 32.9,
        "lng": -83.5,
        "type": "home"
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["property"]["name"] == "Test Home"

def test_get_all_properties(client, auth_headers):
    client.post("/api/property", json={"map_id": 1, "name": "Home 1", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    client.post("/api/property", json={"map_id": 1, "name": "Home 2", "lat": 33.0, "lng": -84.0}, headers=auth_headers)
    res = client.get("/api/property/all?map_id=1", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["data"]["properties"]) == 2

def test_get_property_by_id(client, auth_headers):
    create_res = client.post("/api/property", json={"map_id": 1, "name": "Find Me", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = create_res.json()["data"]["property"]["id"]
    res = client.get(f"/api/property/{prop_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["property"]["name"] == "Find Me"

def test_edit_property(client, auth_headers):
    create_res = client.post("/api/property", json={"map_id": 1, "name": "Old Name", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = create_res.json()["data"]["property"]["id"]
    res = client.patch(f"/api/property/{prop_id}", json={"name": "New Name", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["property"]["name"] == "New Name"

def test_delete_property(client, auth_headers):
    create_res = client.post("/api/property", json={"map_id": 1, "name": "Delete Me", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = create_res.json()["data"]["property"]["id"]
    res = client.delete(f"/api/property/{prop_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["success"] is True
