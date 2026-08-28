# RoadGuardian AI - Location Router
# API endpoints for location data

from fastapi import APIRouter, HTTPException
import httpx
from ..schemas.location import LocationData, LocationResponse
from datetime import datetime

router = APIRouter(prefix="/api/location", tags=["location"])

@router.post("/", response_model=LocationResponse)
async def receive_location(location: LocationData):
    """
    Receive location data from frontend
    """
    try:
        # Store location data (will be implemented with database)
        print(f"Received location: {location}")
        
        # Send analytics events based on location data
        try:
            async with httpx.AsyncClient() as client:
                base_url = "http://localhost:8000"
                
                # Record speed if available
                if hasattr(location, 'speed') and location.speed:
                    await client.post(f"{base_url}/api/analytics/event", json={
                        "event_type": "speed",
                        "speed": location.speed
                    })
        except Exception as e:
            print(f"Error recording analytics: {e}")
        
        return LocationResponse(
            message="Location received successfully",
            data=location
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
