def test_create_point_marker(client, auth_headers):
    res = client.post("/api/points", json={
        "map_id": 1,
        "type": "icon",
        "name": "Test Point",
        "lng": -83.5,
        "lat": 32.9
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["point"]["name"] == "Test Point"
    assert data["data"]["point"]["end_lng"] is None

def test_create_point_radius(client, auth_headers):
    res = client.post("/api/points", json={
        "map_id": 1,
        "type": "radius",
        "name": "Test Radius",
        "lng": -83.5,
        "lat": 32.9,
        "radius": 100
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["point"]["radius"] == 100

def test_create_point_radius_missing_radius(client, auth_headers):
    res = client.post("/api/points", json={
        "map_id": 1,
        "type": "radius",
        "name": "Bad Radius",
        "lng": -83.5,
        "lat": 32.9
    }, headers=auth_headers)
    assert res.status_code == 400

def test_create_point_line(client, auth_headers):
    res = client.post("/api/points", json={
        "map_id": 1,
        "type": "line",
        "name": "Test Line",
        "lng": -83.5,
        "lat": 32.9,
        "end_lng": -83.4,
        "end_lat": 32.8
    }, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["point"]["end_lng"] == -83.4

def test_create_point_line_missing_end(client, auth_headers):
    res = client.post("/api/points", json={
        "map_id": 1,
        "type": "line",
        "name": "Bad Line",
        "lng": -83.5,
        "lat": 32.9
    }, headers=auth_headers)
    assert res.status_code == 400

def test_get_all_points(client, auth_headers):
    client.post("/api/points", json={"map_id": 1, "type": "icon", "name": "P1", "lng": -83.5, "lat": 32.9}, headers=auth_headers)
    client.post("/api/points", json={"map_id": 1, "type": "icon", "name": "P2", "lng": -83.6, "lat": 32.8}, headers=auth_headers)
    res = client.get("/api/points/all?map_id=1", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()["data"]["points"]) == 2

def test_edit_point(client, auth_headers):
    create_res = client.post("/api/points", json={"map_id": 1, "type": "icon", "name": "Old", "lng": -83.5, "lat": 32.9}, headers=auth_headers)
    point_id = create_res.json()["data"]["point"]["id"]
    res = client.patch(f"/api/points/{point_id}", json={"type": "icon", "name": "Updated", "lng": -83.5, "lat": 32.9}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["point"]["name"] == "Updated"

def test_delete_point(client, auth_headers):
    create_res = client.post("/api/points", json={"map_id": 1, "type": "icon", "name": "Delete", "lng": -83.5, "lat": 32.9}, headers=auth_headers)
    point_id = create_res.json()["data"]["point"]["id"]
    res = client.delete(f"/api/points/{point_id}", headers=auth_headers)
    assert res.status_code == 200
