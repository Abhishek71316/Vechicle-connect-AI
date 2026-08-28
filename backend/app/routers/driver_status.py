# RoadGuardian AI - Driver Status Router
# API endpoints for driver monitoring data

from fastapi import APIRouter, HTTPException
import httpx
from ..schemas.driver_status import DriverStatus, DriverStatusResponse

router = APIRouter(prefix="/api/driver-status", tags=["driver-status"])

@router.post("/", response_model=DriverStatusResponse)
async def receive_driver_status(status: DriverStatus):
    """
    Receive driver status from AI monitoring
    """
    try:
        # Process driver status (will be implemented with risk engine)
        print(f"Received driver status: {status}")
        
        # Send analytics events based on driver status
        try:
            async with httpx.AsyncClient() as client:
                base_url = "http://localhost:8000"
                
                # Record drowsiness events
                if status.drowsiness_level in ["MEDIUM", "HIGH", "CRITICAL"]:
                    await client.post(f"{base_url}/api/analytics/event", json={
                        "event_type": "drowsiness",
                        "risk_score": status.fatigue_score if hasattr(status, 'fatigue_score') else 50
                    })
                
                # Record distraction events
                if hasattr(status, 'distraction') and status.distraction:
                    await client.post(f"{base_url}/api/analytics/event", json={
                        "event_type": "distraction",
                        "risk_score": 40
                    })
        except Exception as e:
            print(f"Error recording analytics: {e}")
        
        return DriverStatusResponse(
            message="Driver status received successfully",
            data=status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
