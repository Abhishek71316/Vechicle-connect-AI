# Smart Vehicles connect AI - FastAPI Backend
# Main entry point for the backend application

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from .env file (explicit path)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Debug: Check if API key is loaded
api_key = os.getenv("GEMINI_API_KEY")
print(f"DEBUG: GEMINI_API_KEY loaded: {bool(api_key)}")
print(f"DEBUG: GEMINI_API_KEY length: {len(api_key) if api_key else 0}")
print(f"DEBUG: .env path: {env_path}")
print(f"DEBUG: .env exists: {env_path.exists()}")

from .routers import location, driver_status, sensor_data, alerts, accidents, analytics, history, risk, accident_detection, ai_gemini, phone_gps
# Temporarily commented out due to protobuf dependency issues
# from .routers import ai
from .websocket.handler import router as websocket_router

app = FastAPI(
    title="Smart Vehicles connect AI Backend",
    description="AI-Powered Smart Road Safety System API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(location.router)
app.include_router(driver_status.router)
app.include_router(sensor_data.router)
app.include_router(alerts.router)
app.include_router(accidents.router)
app.include_router(analytics.router)
app.include_router(history.router)
# Placeholder AI router (full integration pending dependency resolution)
app.include_router(ai_gemini.router)
# Temporarily commented out due to protobuf dependency issues
# app.include_router(ai.router)
app.include_router(risk.router)
app.include_router(accident_detection.router)
app.include_router(websocket_router)
# Phone GPS tracking routers
app.include_router(phone_gps.api_router)
app.include_router(phone_gps.ws_router)

@app.get("/")
def root():
    return {
        "message": "Smart Vehicles connect AI Backend",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/status")
def status():
    return {
        "backend": "running",
        "database": "connected",
        "websocket": "ready"
    }
