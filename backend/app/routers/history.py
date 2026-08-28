# RoadGuardian AI - History Router
# API endpoints for trip history

from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/")
async def get_history():
    """
    Get trip history
    """
    try:
        # Will be implemented with database
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trip")
async def create_trip():
    """
    Create a new trip (increments trip counter)
    """
    try:
        try:
            async with httpx.AsyncClient() as client:
                base_url = "http://localhost:8000"
                await client.post(f"{base_url}/api/analytics/event", json={
                    "event_type": "trip"
                })
        except Exception as e:
            print(f"Error recording analytics: {e}")
        return {"status": "trip created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
