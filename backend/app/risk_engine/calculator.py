# Smart Vehicles connect AI - Risk Engine
# Calculates road risk score based on multiple factors

from typing import Dict, List
from datetime import datetime

class RiskEngine:
    def __init__(self):
        # Risk weights (configurable)
        self.weights = {
            'drowsiness': 0.35,
            'yawning': 0.15,
            'head_distraction': 0.20,
            'phone_distraction': 0.10,
            'speed': 0.05,
            'sudden_acceleration': 0.05,
            'sudden_braking': 0.05,
            'abnormal_rotation': 0.05
        }
        
        # Risk thresholds
        self.risk_levels = {
            'SAFE': (0, 20),
            'CAUTION': (21, 40),
            'WARNING': (41, 60),
            'HIGH RISK': (61, 80),
            'CRITICAL': (81, 100)
        }
    
    def calculate_risk(self, driver_status: Dict, sensor_data: Dict, 
                       speed: float = 0) -> Dict:
        """
        Calculate overall road risk score (0-100)
        
        Args:
            driver_status: Driver monitoring data
            sensor_data: ESP32 sensor data
            speed: Vehicle speed in km/h
            
        Returns:
            Risk assessment with score, level, and reasons
        """
        risk_score = 0
        reasons = []
        
        # Drowsiness risk
        drowsiness_risk = self.calculate_drowsiness_risk(driver_status)
        risk_score += drowsiness_risk * self.weights['drowsiness']
        if drowsiness_risk > 50:
            reasons.append(f"Driver drowsiness detected (level: {driver_status.get('drowsiness_level', 'UNKNOWN')})")
        
        # Yawning risk
        yawning_risk = self.calculate_yawning_risk(driver_status)
        risk_score += yawning_risk * self.weights['yawning']
        if driver_status.get('yawning'):
            reasons.append("Driver yawning detected")
        
        # Head distraction risk
        head_distraction_risk = self.calculate_head_distraction_risk(driver_status)
        risk_score += head_distraction_risk * self.weights['head_distraction']
        if driver_status.get('distraction'):
            reasons.append(f"Driver distracted (head pose: {driver_status.get('head_pose', 'UNKNOWN')})")
        
        # Phone distraction risk (if available)
        phone_distraction_risk = self.calculate_phone_distraction_risk(driver_status)
        risk_score += phone_distraction_risk * self.weights['phone_distraction']
        if phone_distraction_risk > 50:
            reasons.append("Phone usage detected")
        
        # Speed risk
        speed_risk = self.calculate_speed_risk(speed)
        risk_score += speed_risk * self.weights['speed']
        if speed_risk > 50:
            reasons.append(f"High speed detected ({speed:.1f} km/h)")
        
        # Sudden acceleration risk
        sudden_accel_risk = self.calculate_sudden_accel_risk(sensor_data)
        risk_score += sudden_accel_risk * self.weights['sudden_acceleration']
        if sensor_data.get('sudden_acceleration'):
            reasons.append("Sudden acceleration detected")
        
        # Sudden braking risk
        sudden_brake_risk = self.calculate_sudden_brake_risk(sensor_data)
        risk_score += sudden_brake_risk * self.weights['sudden_braking']
        if sensor_data.get('sudden_braking'):
            reasons.append("Sudden braking detected")
        
        # Abnormal rotation risk
        rotation_risk = self.calculate_rotation_risk(sensor_data)
        risk_score += rotation_risk * self.weights['abnormal_rotation']
        if sensor_data.get('abnormal_rotation'):
            reasons.append("Abnormal vehicle rotation detected")
        
        # Cap score at 100
        risk_score = min(risk_score, 100)
        
        # Determine risk level
        risk_level = self.determine_risk_level(risk_score)
        
        return {
            'risk_score': int(risk_score),
            'risk_level': risk_level,
            'reasons': reasons if reasons else ['Normal driving conditions'],
            'timestamp': datetime.now().isoformat()
        }
    
    def calculate_drowsiness_risk(self, driver_status: Dict) -> float:
        """Calculate risk from drowsiness (0-100)"""
        drowsiness_level = driver_status.get('drowsiness_level', 'LOW')
        fatigue_score = driver_status.get('fatigue_score', 0)
        
        if drowsiness_level == 'CRITICAL':
            return 100
        elif drowsiness_level == 'HIGH':
            return 80
        elif drowsiness_level == 'MEDIUM':
            return 60
        elif drowsiness_level == 'LOW':
            return fatigue_score  # Use actual fatigue score
        else:
            return 0
    
    def calculate_yawning_risk(self, driver_status: Dict) -> float:
        """Calculate risk from yawning (0-100)"""
        if driver_status.get('yawning'):
            return 70
        return 0
    
    def calculate_head_distraction_risk(self, driver_status: Dict) -> float:
        """Calculate risk from head distraction (0-100)"""
        if driver_status.get('distraction'):
            return 80
        return 0
    
    def calculate_phone_distraction_risk(self, driver_status: Dict) -> float:
        """Calculate risk from phone distraction (0-100)"""
        # This would be detected by YOLO if implemented
        # For now, return 0
        return 0
    
    def calculate_speed_risk(self, speed: float) -> float:
        """Calculate risk from speed (0-100)"""
        if speed > 120:
            return 100
        elif speed > 100:
            return 80
        elif speed > 80:
            return 60
        elif speed > 60:
            return 40
        elif speed > 40:
            return 20
        else:
            return 0
    
    def calculate_sudden_accel_risk(self, sensor_data: Dict) -> float:
        """Calculate risk from sudden acceleration (0-100)"""
        if sensor_data.get('sudden_acceleration'):
            return 60
        return 0
    
    def calculate_sudden_brake_risk(self, sensor_data: Dict) -> float:
        """Calculate risk from sudden braking (0-100)"""
        if sensor_data.get('sudden_braking'):
            return 70
        return 0
    
    def calculate_rotation_risk(self, sensor_data: Dict) -> float:
        """Calculate risk from abnormal rotation (0-100)"""
        if sensor_data.get('abnormal_rotation'):
            return 65
        return 0
    
    def determine_risk_level(self, risk_score: int) -> str:
        """Determine risk level based on score"""
        for level, (min_score, max_score) in self.risk_levels.items():
            if min_score <= risk_score <= max_score:
                return level
        return 'SAFE'
    
    def update_weights(self, new_weights: Dict):
        """Update risk weights"""
        self.weights.update(new_weights)
