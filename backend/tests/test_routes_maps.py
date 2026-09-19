def test_create_map_validation(client, auth_headers):
    # 1. Empty name should fail
    res = client.post("/api/maps/", json={"name": ""}, headers=auth_headers)
    assert res.status_code == 400
    assert "Map Name is required" in res.json()["detail"]

    # 2. Whitespace-only name should fail
    res = client.post("/api/maps/", json={"name": "   "}, headers=auth_headers)
    assert res.status_code == 400

    # 3. Name > 25 characters should fail
    res = client.post("/api/maps/", json={"name": "A" * 26}, headers=auth_headers)
    assert res.status_code == 400
    assert "cannot exceed 25 characters" in res.json()["detail"]

    # 4. Name with invalid characters should fail
    res = client.post("/api/maps/", json={"name": "Map <test>"}, headers=auth_headers)
    assert res.status_code == 400
    assert "contains invalid character" in res.json()["detail"]

    # 5. Description > 125 characters should fail
    res = client.post("/api/maps/", json={
        "name": "Valid Name",
        "description": "B" * 126
    }, headers=auth_headers)
    assert res.status_code == 400
    assert "Description cannot exceed 125 characters" in res.json()["detail"]

    # 6. Valid name and description with 125 characters and allowed symbols (!@#$%?.-,':;_&())
    valid_desc_125 = ("Short desc: #1, ok! (done)? " + "word " * 20)[:125]
    assert len(valid_desc_125) == 125
    res = client.post("/api/maps/", json={
        "name": "House #1 (New)! & Old: -",
        "description": valid_desc_125
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "House #1 (New)! & Old: -"
    assert data["description"] == valid_desc_125
    map_id = data["id"]

    # 7. Update validation tests
    # Invalid update name
    up_res = client.put(f"/api/maps/{map_id}", json={"name": ""}, headers=auth_headers)
    assert up_res.status_code == 400
    up_res = client.put(f"/api/maps/{map_id}", json={"name": "X" * 26}, headers=auth_headers)
    assert up_res.status_code == 400
    up_res = client.put(f"/api/maps/{map_id}", json={"description": "D" * 126}, headers=auth_headers)
    assert up_res.status_code == 400

    # Clean up
    del_res = client.delete(f"/api/maps/{map_id}", headers=auth_headers)
    assert del_res.status_code == 200
