from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_gps_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "phone-gps-tracking"

def test_latest_location_initial():
    response = client.get("/api/location/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_data"
    assert data["latitude"] is None

def test_websocket_phone_and_latest_location():
    # Connect to /ws/phone and send location data
    with client.websocket_connect("/ws/phone") as ws_phone:
        gps_payload = {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "accuracy": 5.0,
            "speed": 15.5,
            "heading": 90.0,
            "timestamp": "2026-08-21T12:00:00Z",
            "vehicle_id": "vehicle-test"
        }
        ws_phone.send_json(gps_payload)
        response_msg = ws_phone.receive_json()
        assert response_msg["status"] == "received"

    # Now verify GET /api/location/latest returns the updated data
    response = client.get("/api/location/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["latitude"] == 12.9716
    assert data["longitude"] == 77.5946
    assert data["speed"] == 15.5
    assert data["vehicle_id"] == "vehicle-test"

def test_post_accident():
    accident_payload = {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "impact_magnitude": 4.5,
        "timestamp": "2026-08-21T12:05:00Z",
        "vehicle_id": "vehicle-test"
    }
    response = client.post("/api/accident", json=accident_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["accident_id"] >= 1
    assert data["data"]["impact_magnitude"] == 4.5

def test_websocket_dashboard():
    with client.websocket_connect("/ws/dashboard") as ws_dash:
        # Dashboard should receive initial location update if present
        data = ws_dash.receive_json()
        assert "type" in data
