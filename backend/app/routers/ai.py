# RoadGuardian AI - AI Router
# API endpoints for AI processing

from fastapi import APIRouter, HTTPException, UploadFile, File
from ..ai.driver_monitor import DriverMonitor
from ..ai.gemini_service import get_gemini_service
import base64
import cv2
import numpy as np

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Initialize driver monitor
driver_monitor = DriverMonitor()

@router.post("/analyze-frame")
async def analyze_frame(frame_data: dict):
    """
    Analyze a single frame for driver state
    """
    try:
        # Get base64 image data
        image_data = frame_data.get("image")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Decode base64 image
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Analyze frame
        result = driver_monitor.analyze_frame(frame)
        
        return {
            "message": "Frame analyzed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset-state")
async def reset_state():
    """
    Reset driver monitoring state
    """
    try:
        driver_monitor.reset_state()
        return {"message": "State reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Gemini AI Endpoints

@router.post("/chat")
async def gemini_chat(request: dict):
    """
    Chat with Gemini AI for road safety assistance
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini service not configured - API key missing")
        
        message = request.get("message")
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        conversation_history = request.get("conversation_history")
        
        response = await gemini_service.chat(message, conversation_history)
        
        return {
            "message": "Chat response generated",
            "response": response
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/analyze-accident")
async def analyze_accident(request: dict):
    """
    Analyze accident data using Gemini AI
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini service not configured - API key missing")
        
        accident_data = request.get("accident_data")
        if not accident_data:
            raise HTTPException(status_code=400, detail="Accident data is required")
        
        analysis = await gemini_service.analyze_accident(accident_data)
        
        return {
            "message": "Accident analysis completed",
            "data": analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Accident analysis error: {str(e)}")

@router.post("/analyze-iot")
async def analyze_iot(request: dict):
    """
    Analyze IoT sensor data using Gemini AI
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini service not configured - API key missing")
        
        sensor_data = request.get("sensor_data")
        if not sensor_data:
            raise HTTPException(status_code=400, detail="Sensor data is required")
        
        explanation = await gemini_service.analyze_iot_data(sensor_data)
        
        return {
            "message": "IoT data analysis completed",
            "explanation": explanation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IoT analysis error: {str(e)}")

@router.post("/generate-report")
async def generate_report(request: dict):
    """
    Generate AI accident report using Gemini
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini service not configured - API key missing")
        
        incident_data = request.get("incident_data")
        if not incident_data:
            raise HTTPException(status_code=400, detail="Incident data is required")
        
        report = await gemini_service.generate_accident_report(incident_data)
        
        return {
            "message": "Report generated successfully",
            "report": report
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")

@router.post("/analyze-image")
async def analyze_image(request: dict):
    """
    Analyze image using Gemini's vision capabilities
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini service not configured - API key missing")
        
        image_data = request.get("image_data")
        if not image_data:
            raise HTTPException(status_code=400, detail="Image data is required")
        
        context = request.get("context")
        
        analysis = await gemini_service.analyze_image(image_data, context)
        
        return {
            "message": "Image analysis completed",
            "analysis": analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")

@router.post("/emergency-summary")
async def emergency_summary(request: dict):
    """
    Generate emergency response summary using Gemini
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            raise HTTPException(status_code=503, detail="Gemini service not configured - API key missing")
        
        incident_data = request.get("incident_data")
        if not incident_data:
            raise HTTPException(status_code=400, detail="Incident data is required")
        
        summary = await gemini_service.generate_emergency_summary(incident_data)
        
        return {
            "message": "Emergency summary generated",
            "summary": summary
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Emergency summary error: {str(e)}")

@router.get("/status")
async def gemini_status():
    """
    Check Gemini service status
    """
    try:
        gemini_service = get_gemini_service()
        if not gemini_service:
            return {
                "status": "not_configured",
                "message": "Gemini API key not configured"
            }
        
        return {
            "status": "operational",
            "message": "Gemini service is ready"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
