# RoadGuardian AI - Risk Schemas
# Pydantic schemas for risk assessment

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RiskAssessment(BaseModel):
    risk_score: int
    risk_level: str
    reasons: List[str]
    timestamp: datetime

class RiskResponse(BaseModel):
    message: str
    data: RiskAssessment
