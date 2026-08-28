# Smart Vehicles Connect AI - Phone GPS Router & Sensor Integration
# Real-time vehicle tracking using smartphone GPS & ESP32 MPU6500 sensor telemetry

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import json
import asyncio
import httpx

# Router for REST endpoints under /api
api_router = APIRouter(prefix="/api", tags=["phone-gps"])

# Router for WebSocket endpoints at root level (/ws/...)
ws_router = APIRouter(tags=["phone-gps-ws"])

# For backwards compatibility with standard router inclusion
router = api_router

# In-memory storage for latest location
latest_location: Dict[str, Any] = {
    "latitude": None,
    "longitude": None,
    "accuracy": None,
    "speed": None,
    "heading": None,
    "timestamp": None,
    "vehicle_id": "vehicle-1"
}

# In-memory storage for ESP32 MPU6500 telemetry
latest_esp32_data: Dict[str, Any] = {
    "ax": 0.0,
    "ay": 0.0,
    "az": 1.0,
    "totalG": 1.0,
    "impact": False,
    "emergency": False,
    "lastUpdate": None
}

# In-memory storage for accidents
accidents: list = []

# Track recent accidents to prevent duplicate logging
recent_accidents_cache = {}  # key: (lat, lng, timestamp_window), value: accident_record
ACCIDENT_DEDUP_WINDOW = 10  # seconds - treat accidents within this window as duplicates

def is_duplicate_accident(lat: float, lng: float, timestamp: str) -> bool:
    """Check if this accident is a duplicate of a recent one"""
    global recent_accidents_cache
    
    try:
        accident_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    except:
        accident_time = datetime.utcnow()
    
    # Clean up old cache entries
    current_time = datetime.utcnow()
    keys_to_remove = []
    for key, cached_data in recent_accidents_cache.items():
        try:
            cached_time = datetime.fromisoformat(cached_data['timestamp'].replace('Z', '+00:00'))
            if (current_time - cached_time).total_seconds() > ACCIDENT_DEDUP_WINDOW:
                keys_to_remove.append(key)
        except:
            keys_to_remove.append(key)
    
    for key in keys_to_remove:
        del recent_accidents_cache[key]
    
    # Check for nearby recent accidents
    for cache_key, cached_data in recent_accidents_cache.items():
        try:
            cached_time = datetime.fromisoformat(cached_data['timestamp'].replace('Z', '+00:00'))
            time_diff = (accident_time - cached_time).total_seconds()
            
            # If within time window and nearby location (within 0.0005 degrees ~ 50m)
            if time_diff < ACCIDENT_DEDUP_WINDOW and time_diff > -ACCIDENT_DEDUP_WINDOW:
                if abs(lat - cached_data['latitude']) < 0.0005 and abs(lng - cached_data['longitude']) < 0.0005:
                    return True
        except:
            continue
    
    return False

# WebSocket connection managers
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                if connection in self.active_connections:
                    self.active_connections.remove(connection)

phone_manager = ConnectionManager()
dashboard_manager = ConnectionManager()

# Data Schemas
class GPSData(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    timestamp: Optional[Any] = None
    vehicle_id: Optional[str] = "vehicle-1"

class ESP32Data(BaseModel):
    ax: Optional[float] = 0.0
    ay: Optional[float] = 0.0
    az: Optional[float] = 1.0
    totalG: Optional[float] = 1.0
    impact: Optional[bool] = False
    emergency: Optional[bool] = False

class AccidentData(BaseModel):
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    impact_magnitude: float
    timestamp: Optional[Any] = None
    vehicle_id: Optional[str] = "vehicle-1"
    speed: Optional[float] = None
    heading: Optional[float] = None

# Health Check
@api_router.get("/health")
def gps_health_check():
    return {
        "status": "healthy",
        "service": "smart-vehicle-safety-system",
        "timestamp": datetime.utcnow().isoformat(),
        "latest_location_available": latest_location["latitude"] is not None
    }

# Get Latest Location
@api_router.get("/location/latest")
def get_latest_location():
    """Get the latest phone GPS location for ESP32 polling"""
    if latest_location["latitude"] is None:
        return {
            "status": "no_data",
            "message": "No GPS data available yet",
            "latitude": None,
            "longitude": None,
            "speed": None,
            "heading": None,
            "accuracy": None,
            "timestamp": None
        }
    
    return {
        "status": "success",
        "latitude": latest_location["latitude"],
        "longitude": latest_location["longitude"],
        "speed": latest_location["speed"],
        "heading": latest_location["heading"],
        "accuracy": latest_location["accuracy"],
        "timestamp": latest_location["timestamp"],
        "vehicle_id": latest_location["vehicle_id"]
    }

@api_router.get("/location")
def get_location():
    return latest_location

# Combined Vehicle State Endpoint for React Dashboard
@api_router.get("/vehicle")
def get_vehicle_combined_data():
    """Get merged GPS location & MPU6500 sensor telemetry for live tracking map"""
    return {
        "latitude": latest_location["latitude"],
        "longitude": latest_location["longitude"],
        "accuracy": latest_location["accuracy"],
        "speed": latest_location["speed"],
        "heading": latest_location["heading"],
        "ax": latest_esp32_data["ax"],
        "ay": latest_esp32_data["ay"],
        "az": latest_esp32_data["az"],
        "totalG": latest_esp32_data["totalG"],
        "impact": latest_esp32_data["impact"],
        "emergency": latest_esp32_data["emergency"],
        "lastUpdate": latest_location["timestamp"] or latest_esp32_data["lastUpdate"]
    }

# Post GPS Data
@api_router.post("/location")
@api_router.post("/gps")
def receive_gps_data(gps_data: GPSData):
    """Receive GPS data from phone via REST API"""
    global latest_location
    
    ts = gps_data.timestamp
    if isinstance(ts, datetime):
        ts = ts.isoformat()
    elif ts is None:
        ts = datetime.utcnow().isoformat()
    else:
        ts = str(ts)
        
    latest_location.update({
        "latitude": gps_data.latitude,
        "longitude": gps_data.longitude,
        "accuracy": gps_data.accuracy,
        "speed": gps_data.speed,
        "heading": gps_data.heading,
        "timestamp": ts,
        "vehicle_id": gps_data.vehicle_id or "vehicle-1"
    })
    
    # Broadcast to dashboard WebSocket clients
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(dashboard_manager.broadcast({
                "type": "location_update",
                "data": latest_location
            }))
    except RuntimeError:
        pass
    
    return {
        "status": "success",
        "message": "GPS data received and stored",
        "data": latest_location
    }

# Post ESP32 Telemetry
@api_router.post("/esp32")
async def receive_esp32_data(esp32_data: ESP32Data):
    """Receive MPU6500 sensor telemetry from ESP32"""
    global latest_esp32_data
    
    now_str = datetime.utcnow().isoformat()
    latest_esp32_data.update({
        "ax": esp32_data.ax or 0.0,
        "ay": esp32_data.ay or 0.0,
        "az": esp32_data.az or 1.0,
        "totalG": esp32_data.totalG or 1.0,
        "impact": bool(esp32_data.impact),
        "emergency": bool(esp32_data.emergency),
        "lastUpdate": now_str
    })
    
    # Handle impact alert creation
    if esp32_data.impact or esp32_data.emergency:
        lat = latest_location.get("latitude") or 0.0
        lng = latest_location.get("longitude") or 0.0
        
        # Check for duplicate accident
        if not is_duplicate_accident(lat, lng, now_str):
            accident_record = {
                "id": len(accidents) + 1,
                "latitude": lat,
                "longitude": lng,
                "impact_magnitude": esp32_data.totalG or 3.0,
                "timestamp": now_str,
                "vehicle_id": latest_location.get("vehicle_id", "vehicle-1"),
                "speed": latest_location.get("speed"),
                "heading": latest_location.get("heading"),
                "created_at": now_str
            }
            accidents.append(accident_record)
            
            # Cache this accident for deduplication
            cache_key = f"{lat:.4f}_{lng:.4f}_{now_str}"
            recent_accidents_cache[cache_key] = accident_record
            
            # Record unique accident in analytics (only for new accidents)
            try:
                await httpx.AsyncClient().post("http://localhost:8000/api/analytics/event", json={
                    "event_type": "accident",
                    "risk_score": 90
                })
            except Exception:
                pass
            
            try:
                await dashboard_manager.broadcast({
                    "type": "accident_report",
                    "data": accident_record
                })
            except RuntimeError:
                pass
        else:
            print(f"Duplicate accident detected at {lat}, {lng} - skipping logging")
    
    # Record high risk events for significant G-force
    if esp32_data.totalG and esp32_data.totalG > 2.0:
        try:
            await httpx.AsyncClient().post("http://localhost:8000/api/analytics/event", json={
                "event_type": "high_risk",
                "risk_score": min(int(esp32_data.totalG * 20), 100)
            })
        except Exception:
            pass

    # Broadcast ESP32 sensor update to WebSocket clients
    try:
        await dashboard_manager.broadcast({
            "type": "esp32_update",
            "data": latest_esp32_data
        })
    except RuntimeError:
        pass

    return {
        "status": "success",
        "message": "ESP32 sensor data received",
        "data": latest_esp32_data
    }

# Post Accident Data
@api_router.post("/accident")
def report_accident(accident_data: AccidentData):
    """Receive explicit accident report from ESP32 or phone"""
    ts = accident_data.timestamp
    if isinstance(ts, datetime):
        ts = ts.isoformat()
    elif ts is None:
        ts = datetime.utcnow().isoformat()
    else:
        ts = str(ts)
        
    lat = accident_data.latitude if (accident_data.latitude and accident_data.latitude != 0.0) else latest_location.get("latitude", 0.0)
    lng = accident_data.longitude if (accident_data.longitude and accident_data.longitude != 0.0) else latest_location.get("longitude", 0.0)
    
    # Check for duplicate accident
    if not is_duplicate_accident(lat, lng, ts):
        accident_record = {
            "id": len(accidents) + 1,
            "latitude": lat,
            "longitude": lng,
            "impact_magnitude": accident_data.impact_magnitude,
            "timestamp": ts,
            "vehicle_id": accident_data.vehicle_id or "vehicle-1",
            "speed": accident_data.speed if accident_data.speed is not None else latest_location.get("speed"),
            "heading": accident_data.heading if accident_data.heading is not None else latest_location.get("heading"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        accidents.append(accident_record)
        
        # Cache this accident for deduplication
        cache_key = f"{lat:.4f}_{lng:.4f}_{ts}"
        recent_accidents_cache[cache_key] = accident_record
        
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(dashboard_manager.broadcast({
                    "type": "accident_report",
                    "data": accident_record
                }))
        except RuntimeError:
            pass
        
        return {
            "status": "success",
            "message": "Accident report received",
            "accident_id": accident_record["id"],
            "data": accident_record
        }
    else:
        return {
            "status": "duplicate",
            "message": "Duplicate accident report - already logged recently",
            "data": {
                "latitude": lat,
                "longitude": lng,
                "timestamp": ts
            }
        }

# Get Accident History
@api_router.get("/accidents")
def get_accidents():
    """Get all accident records"""
    return {
        "status": "success",
        "count": len(accidents),
        "accidents": accidents
    }

# Clear Accident Records
@api_router.delete("/accidents")
@api_router.post("/accidents/clear")
def clear_accidents():
    """Clear all stored accident records"""
    global accidents, recent_accidents_cache
    accidents.clear()
    recent_accidents_cache.clear()
    return {
        "status": "success",
        "message": "Accident records cleared",
        "count": 0
    }

# WebSocket: Phone GPS Connection (/ws/phone)
@ws_router.websocket("/ws/phone")
async def websocket_phone_gps(websocket: WebSocket):
    """WebSocket connection for phone to send GPS data"""
    await phone_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            gps_data = json.loads(data)
            
            latest_location.update({
                "latitude": gps_data.get("latitude"),
                "longitude": gps_data.get("longitude"),
                "accuracy": gps_data.get("accuracy"),
                "speed": gps_data.get("speed"),
                "heading": gps_data.get("heading"),
                "timestamp": gps_data.get("timestamp") or datetime.utcnow().isoformat(),
                "vehicle_id": gps_data.get("vehicle_id", "vehicle-1")
            })
            
            await dashboard_manager.broadcast({
                "type": "location_update",
                "data": latest_location
            })
            
            await websocket.send_json({
                "status": "received",
                "timestamp": datetime.utcnow().isoformat()
            })
            
    except WebSocketDisconnect:
        phone_manager.disconnect(websocket)
    except Exception as e:
        phone_manager.disconnect(websocket)

# WebSocket: Dashboard Connection (/ws/dashboard)
@ws_router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """WebSocket connection for React dashboard to receive live updates"""
    await dashboard_manager.connect(websocket)
    try:
        if latest_location["latitude"] is not None:
            await websocket.send_json({
                "type": "location_update",
                "data": latest_location
            })
        
        await websocket.send_json({
            "type": "esp32_update",
            "data": latest_esp32_data
        })
        
        if accidents:
            await websocket.send_json({
                "type": "accident_history",
                "data": accidents
            })
        
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "status": "acknowledged",
                "message": "Dashboard connection active"
            })
            
    except WebSocketDisconnect:
        dashboard_manager.disconnect(websocket)
    except Exception as e:
        dashboard_manager.disconnect(websocket)