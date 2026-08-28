# RoadGuardian AI - Risk Router
# API endpoints for risk assessment

from fastapi import APIRouter, HTTPException
from ..risk_engine.calculator import RiskEngine

router = APIRouter(prefix="/api/risk", tags=["risk"])

# Initialize risk engine
risk_engine = RiskEngine()

@router.post("/calculate")
async def calculate_risk(request: dict):
    """
    Calculate road risk score based on driver status, sensor data, and speed
    """
    try:
        driver_status = request.get('driver_status', {})
        sensor_data = request.get('sensor_data', {})
        speed = request.get('speed', 0)
        
        risk_assessment = risk_engine.calculate_risk(
            driver_status=driver_status,
            sensor_data=sensor_data,
            speed=speed
        )
        
        return {
            "message": "Risk calculated successfully",
            "data": risk_assessment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-weights")
async def update_weights(weights: dict):
    """
    Update risk calculation weights
    """
    try:
        risk_engine.update_weights(weights)
        return {"message": "Weights updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
