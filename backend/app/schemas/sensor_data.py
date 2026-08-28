# Smart Vehicles connect AI - Sensor Data Schemas
# Pydantic schemas for ESP32 sensor data

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Accelerometer(BaseModel):
    x: float
    y: float
    z: float

class Gyroscope(BaseModel):
    x: float
    y: float
    z: float

class SensorData(BaseModel):
    accelerometer: Accelerometer
    gyroscope: Gyroscope
    impact: bool
    sudden_braking: bool
    sudden_acceleration: bool
    abnormal_rotation: bool
    timestamp: datetime

class SensorDataResponse(BaseModel):
    message: str
    data: SensorData
