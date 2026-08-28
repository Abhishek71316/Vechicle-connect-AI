# Smart Vehicles connect AI - Accident Detection Service
# Multi-sensor accident event detector

from typing import Dict, Optional
from datetime import datetime
from collections import deque

class AccidentDetector:
    def __init__(self):
        # Sensor history for temporal analysis
        self.accel_history = deque(maxlen=10)
        self.gyro_history = deque(maxlen=10)
        self.speed_history = deque(maxlen=10)
        
        # Detection thresholds
        self.impact_threshold = 3.0  # g-force
        self.sudden_stop_threshold = -2.5  # g-force
        self.rotation_threshold = 150.0  # degrees/second
        self.speed_drop_threshold = 20.0  # km/s
        
        # Confirmation thresholds (number of consecutive detections)
        self.impact_confirmation = 2
        self.rotation_confirmation = 3
        
        # State tracking
        self.impact_count = 0
        self.rotation_count = 0
        self.last_accident_time = None
        self.accident_cooldown = 30  # seconds between accident detections
    
    def analyze_sensor_data(self, sensor_data: Dict, speed: float = 0) -> Dict:
        """
        Analyze sensor data for possible accident detection
        
        Args:
            sensor_data: ESP32 sensor data
            speed: Current vehicle speed in km/h
            
        Returns:
            Accident detection result
        """
        accelerometer = sensor_data.get('accelerometer', {})
        gyroscope = sensor_data.get('gyroscope', {})
        
        # Calculate acceleration magnitude
        accel_x = accelerometer.get('x', 0)
        accel_y = accelerometer.get('y', 0)
        accel_z = accelerometer.get('z', 0)
        accel_magnitude = (accel_x**2 + accel_y**2 + accel_z**2)**0.5
        
        # Calculate gyroscope magnitude
        gyro_x = gyroscope.get('x', 0)
        gyro_y = gyroscope.get('y', 0)
        gyro_z = gyroscope.get('z', 0)
        gyro_magnitude = (gyro_x**2 + gyro_y**2 + gyro_z**2)**0.5
        
        # Add to history
        self.accel_history.append(accel_magnitude)
        self.gyro_history.append(gyro_magnitude)
        self.speed_history.append(speed)
        
        # Check for accident indicators
        impact_detected = self.check_impact(accel_magnitude, accelerometer)
        sudden_stop_detected = self.check_sudden_stop(accelerator=accelerometer)
        abnormal_rotation_detected = self.check_abnormal_rotation(gyro_magnitude)
        speed_drop_detected = self.check_speed_drop()
        
        # Determine if accident is probable
        accident_probable = self.determine_accident_probability(
            impact_detected, sudden_stop_detected, 
            abnormal_rotation_detected, speed_drop_detected
        )
        
        if accident_probable:
            self.last_accident_time = datetime.now()
        
        return {
            'accident_probable': accident_probable,
            'impact_detected': impact_detected,
            'sudden_stop_detected': sudden_stop_detected,
            'abnormal_rotation_detected': abnormal_rotation_detected,
            'speed_drop_detected': speed_drop_detected,
            'acceleration_magnitude': accel_magnitude,
            'gyroscope_magnitude': gyro_magnitude,
            'timestamp': datetime.now().isoformat()
        }
    
    def check_impact(self, accel_magnitude: float, accelerometer: Dict) -> bool:
        """Check for high-impact event"""
        if accel_magnitude > self.impact_threshold:
            self.impact_count += 1
            return self.impact_count >= self.impact_confirmation
        else:
            self.impact_count = max(0, self.impact_count - 1)
            return False
    
    def check_sudden_stop(self, accelerator: Dict) -> bool:
        """Check for sudden braking/stop"""
        accel_x = accelerator.get('x', 0)
        if accel_x < self.sudden_stop_threshold:
            return True
        return False
    
    def check_abnormal_rotation(self, gyro_magnitude: float) -> bool:
        """Check for abnormal rotation"""
        if gyro_magnitude > self.rotation_threshold:
            self.rotation_count += 1
            return self.rotation_count >= self.rotation_confirmation
        else:
            self.rotation_count = max(0, self.rotation_count - 1)
            return False
    
    def check_speed_drop(self) -> bool:
        """Check for sudden speed drop"""
        if len(self.speed_history) < 5:
            return False
        
        # Calculate speed change
        speed_change = self.speed_history[-1] - self.speed_history[0]
        
        # Check if speed dropped significantly
        if speed_change > self.speed_drop_threshold and self.speed_history[0] > 20:
            return True
        
        return False
    
    def determine_accident_probability(self, impact: bool, sudden_stop: bool, 
                                     rotation: bool, speed_drop: bool) -> bool:
        """
        Determine if accident is probable based on multiple indicators
        """
        # Check cooldown period
        if self.last_accident_time:
            time_since_last = (datetime.now() - self.last_accident_time).total_seconds()
            if time_since_last < self.accident_cooldown:
                return False
        
        # Require multiple indicators for accident detection
        indicators = [impact, sudden_stop, rotation, speed_drop]
        indicator_count = sum(indicators)
        
        # Accident is probable if:
        # - Impact detected AND at least one other indicator
        # - OR 3 or more indicators detected
        if impact and indicator_count >= 2:
            return True
        elif indicator_count >= 3:
            return True
        
        return False
    
    def get_impact_level(self, accel_magnitude: float) -> str:
        """Determine impact severity level"""
        if accel_magnitude > 5.0:
            return "SEVERE"
        elif accel_magnitude > 3.5:
            return "HIGH"
        elif accel_magnitude > 2.5:
            return "MODERATE"
        elif accel_magnitude > 1.5:
            return "LOW"
        else:
            return "NONE"
    
    def reset(self):
        """Reset detection state"""
        self.accel_history.clear()
        self.gyro_history.clear()
        self.speed_history.clear()
        self.impact_count = 0
        self.rotation_count = 0
        self.last_accident_time = None
