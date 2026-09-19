def test_create_room(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test Home", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    floor_res = client.post("/api/floors", json={"property_id": prop_id, "name": "Floor 1"}, headers=auth_headers)
    floor_id = floor_res.json()["data"]["floor"]["id"]
    res = client.post("/api/rooms", json={
        "floor_id": floor_id,
        "type": "bedroom",
        "name": "Master Bedroom",
        "length": 5.0,
        "width": 4.0,
        "height": 2.5
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["data"]["room"]["name"] == "Master Bedroom"
    assert data["data"]["room"]["type"] == "bedroom"
    assert data["data"]["room"]["length"] == 5.0

def test_get_rooms_by_floor(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    floor_res = client.post("/api/floors", json={"property_id": prop_id, "name": "Floor 1"}, headers=auth_headers)
    floor_id = floor_res.json()["data"]["floor"]["id"]
    client.post("/api/rooms", json={"floor_id": floor_id, "type": "bedroom", "name": "Room 1"}, headers=auth_headers)
    client.post("/api/rooms", json={"floor_id": floor_id, "type": "bathroom", "name": "Room 2"}, headers=auth_headers)
    res = client.get(f"/api/rooms/{floor_id}/all", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["data"]["rooms"]) == 2

def test_edit_room(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    floor_res = client.post("/api/floors", json={"property_id": prop_id, "name": "Floor 1"}, headers=auth_headers)
    floor_id = floor_res.json()["data"]["floor"]["id"]
    create_res = client.post("/api/rooms", json={"floor_id": floor_id, "type": "bedroom", "name": "Old Room"}, headers=auth_headers)
    room_id = create_res.json()["data"]["room"]["id"]
    res = client.patch(f"/api/rooms/{room_id}", json={"floor_id": floor_id, "type": "bedroom", "name": "Renamed Room", "width": 4.5}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["room"]["name"] == "Renamed Room"
    assert res.json()["data"]["room"]["width"] == 4.5

def test_delete_room(client, auth_headers):
    prop_res = client.post("/api/property", json={"map_id": 1, "name": "Test", "lat": 32.0, "lng": -83.0}, headers=auth_headers)
    prop_id = prop_res.json()["data"]["property"]["id"]
    floor_res = client.post("/api/floors", json={"property_id": prop_id, "name": "Floor 1"}, headers=auth_headers)
    floor_id = floor_res.json()["data"]["floor"]["id"]
    create_res = client.post("/api/rooms", json={"floor_id": floor_id, "type": "bedroom", "name": "Delete Me"}, headers=auth_headers)
    room_id = create_res.json()["data"]["room"]["id"]
    res = client.delete(f"/api/rooms/{room_id}", headers=auth_headers)
    assert res.status_code == 200
