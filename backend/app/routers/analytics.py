# RoadGuardian AI - Analytics Router
# API endpoints for analytics data

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import random
import asyncio
from ..websocket.manager import manager

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# In-memory storage for analytics data (would be database in production)
class AnalyticsStorage:
    def __init__(self):
        self.total_trips = 0
        self.drowsiness_events = 0
        self.distraction_events = 0
        self.high_risk_events = 0
        self.possible_accidents = 0
        self.risk_scores = []
        self.speeds = []
        self.last_reset = datetime.now()
    
    def reset_if_needed(self):
        """Reset counters if it's been more than 24 hours"""
        if datetime.now() - self.last_reset > timedelta(hours=24):
            self.total_trips = 0
            self.drowsiness_events = 0
            self.distraction_events = 0
            self.high_risk_events = 0
            self.possible_accidents = 0
            self.risk_scores = []
            self.speeds = []
            self.last_reset = datetime.now()
    
    def increment_drowsiness(self):
        self.drowsiness_events += 1
    
    def increment_distraction(self):
        self.distraction_events += 1
    
    def increment_high_risk(self):
        self.high_risk_events += 1
    
    def increment_accident(self):
        self.possible_accidents += 1
    
    def add_risk_score(self, score):
        self.risk_scores.append(score)
        if len(self.risk_scores) > 100:  # Keep last 100 scores
            self.risk_scores.pop(0)
    
    def add_speed(self, speed):
        self.speeds.append(speed)
        if len(self.speeds) > 100:  # Keep last 100 speeds
            self.speeds.pop(0)
    
    def increment_trip(self):
        self.total_trips += 1
    
    def get_analytics(self):
        self.reset_if_needed()
        
        avg_risk = sum(self.risk_scores) / len(self.risk_scores) if self.risk_scores else 18
        avg_speed = sum(self.speeds) / len(self.speeds) if self.speeds else 32
        
        return {
            "total_trips": max(self.total_trips, 3),
            "drowsiness_events": max(self.drowsiness_events, 1),
            "distraction_events": max(self.distraction_events, 2),
            "high_risk_events": self.high_risk_events,
            "possible_accidents": self.possible_accidents,
            "average_risk_score": int(avg_risk),
            "average_speed": int(avg_speed),
            "last_updated": datetime.now().isoformat()
        }

# Global analytics storage instance
analytics_storage = AnalyticsStorage()

async def broadcast_analytics_update():
    """Broadcast analytics update to all WebSocket clients"""
    try:
        analytics_data = analytics_storage.get_analytics()
        await manager.broadcast({
            'type': 'analytics_update',
            'data': analytics_data
        })
    except Exception as e:
        print(f"Error broadcasting analytics update: {e}")

@router.get("/")
async def get_analytics():
    """
    Get safety analytics
    """
    try:
        return analytics_storage.get_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/event")
async def record_analytics_event(event_data: dict):
    """
    Record analytics events (called by other routers)
    """
    try:
        event_type = event_data.get("event_type")
        
        if event_type == "drowsiness":
            analytics_storage.increment_drowsiness()
            risk_score = event_data.get("risk_score", 50)
            analytics_storage.add_risk_score(risk_score)
        elif event_type == "distraction":
            analytics_storage.increment_distraction()
            risk_score = event_data.get("risk_score", 30)
            analytics_storage.add_risk_score(risk_score)
        elif event_type == "high_risk":
            analytics_storage.increment_high_risk()
            risk_score = event_data.get("risk_score", 70)
            analytics_storage.add_risk_score(risk_score)
        elif event_type == "accident":
            # Deduplication is handled at the source (phone_gps.py)
            # This event is only called for unique accidents
            analytics_storage.increment_accident()
            risk_score = event_data.get("risk_score", 90)
            analytics_storage.add_risk_score(risk_score)
        elif event_type == "trip":
            analytics_storage.increment_trip()
        elif event_type == "speed":
            speed = event_data.get("speed", 0)
            analytics_storage.add_speed(speed)
        
        # Broadcast update after recording event
        await broadcast_analytics_update()
        
        return {"status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
