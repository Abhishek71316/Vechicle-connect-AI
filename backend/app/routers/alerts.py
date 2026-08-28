# RoadGuardian AI - Alerts Router
# API endpoints for alerts

from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas.alert import Alert, AlertResponse

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("/", response_model=List[Alert])
async def get_alerts():
    """
    Get all alerts
    """
    try:
        # Will be implemented with database
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=AlertResponse)
async def create_alert(alert: Alert):
    """
    Create a new alert
    """
    try:
        print(f"Received alert: {alert}")
        return AlertResponse(
            message="Alert created successfully",
            data=alert
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
