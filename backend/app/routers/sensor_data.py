# RoadGuardian AI - Sensor Data Router
# API endpoints for ESP32 sensor data

from fastapi import APIRouter, HTTPException
import httpx
import math
from ..schemas.sensor_data import SensorData, SensorDataResponse

router = APIRouter(prefix="/api/sensor-data", tags=["sensor-data"])

@router.post("/", response_model=SensorDataResponse)
async def receive_sensor_data(data: SensorData):
    """
    Receive sensor data from ESP32
    """
    try:
        # Process sensor data (will be implemented with accident detection)
        print(f"Received sensor data: {data}")
        
        # Send analytics events based on sensor data
        try:
            async with httpx.AsyncClient() as client:
                base_url = "http://localhost:8000"
                
                # Calculate speed from accelerometer data (simplified)
                if hasattr(data, 'accelerometer') and data.accelerometer:
                    accel = data.accelerometer
                    # Simple speed estimation based on acceleration magnitude
                    accel_magnitude = math.sqrt(accel.x**2 + accel.y**2 + accel.z**2)
                    estimated_speed = int(accel_magnitude * 30)  # Rough estimation
                    
                    await client.post(f"{base_url}/api/analytics/event", json={
                        "event_type": "speed",
                        "speed": estimated_speed
                    })
                
                # Record high-risk events for dangerous sensor patterns
                if hasattr(data, 'impact') and data.impact:
                    await client.post(f"{base_url}/api/analytics/event", json={
                        "event_type": "high_risk",
                        "risk_score": 85
                    })
                
                if hasattr(data, 'sudden_braking') and data.sudden_braking:
                    await client.post(f"{base_url}/api/analytics/event", json={
                        "event_type": "high_risk",
                        "risk_score": 60
                    })
        except Exception as e:
            print(f"Error recording analytics: {e}")
        
        return SensorDataResponse(
            message="Sensor data received successfully",
            data=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
