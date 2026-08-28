from fastapi import APIRouter, HTTPException
from typing import List, Any
from .phone_gps import accidents, report_accident, AccidentData

router = APIRouter(prefix="/api/accidents", tags=["accidents"])

@router.get("/")
async def get_accidents():
    """
    Get all accident records
    """
    try:
        return {
            "status": "success",
            "count": len(accidents),
            "accidents": accidents
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_accident(accident: AccidentData):
    """
    Create a new accident record
    """
    try:
        res = report_accident(accident)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

