# RoadGuardian AI - Accident Detection Router
# API endpoints for accident detection

from fastapi import APIRouter, HTTPException
from ..services.accident_detector import AccidentDetector

router = APIRouter(prefix="/api/accident-detection", tags=["accident-detection"])

# Initialize accident detector
accident_detector = AccidentDetector()

@router.post("/analyze")
async def analyze_accident_risk(request: dict):
    """
    Analyze sensor data for possible accident detection
    """
    try:
        sensor_data = request.get('sensor_data', {})
        speed = request.get('speed', 0)
        
        result = accident_detector.analyze_sensor_data(sensor_data, speed)
        
        return {
            "message": "Accident analysis completed",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset")
async def reset_detector():
    """
    Reset accident detector state
    """
    try:
        accident_detector.reset()
        return {"message": "Accident detector reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
