# RoadGuardian AI - Driver Status Schemas
# Pydantic schemas for driver monitoring data

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DriverStatus(BaseModel):
    drowsiness_level: str
    eye_state: str
    blink_rate: int
    yawning: bool
    head_pose: str
    fatigue_score: int
    distraction: bool
    timestamp: datetime

class DriverStatusResponse(BaseModel):
    message: str
    data: DriverStatus
