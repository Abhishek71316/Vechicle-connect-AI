# Smart Vehicles Connect AI - Gemini Service
# Google Gemini API integration for AI-powered features

import google.generativeai as genai
from typing import Dict, List, Optional, Any
import base64
import os
from ..config import settings

class GeminiService:
    """Service for interacting with Google Gemini API"""
    
    def __init__(self):
        """Initialize Gemini service with API key from environment"""
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        try:
            self.model = genai.GenerativeModel('gemini-3.5-flash')
        except Exception:
            self.model = genai.GenerativeModel('gemini-3.6-flash')
        self.vision_model = genai.GenerativeModel('gemini-3.5-flash')
        
    async def chat(self, message: str, conversation_history: Optional[List[Dict]] = None) -> str:
        """
        Send a chat message to Gemini and get response
        
        Args:
            message: User message
            conversation_history: Optional list of previous messages
            
        Returns:
            AI response text
        """
        try:
            # Build chat context
            system_prompt = """You are the official AI Assistant of "Smart Vehicles Connect AI", an intelligent vehicle safety, monitoring, tracking, accident detection, and emergency response platform.

Your primary responsibilities are:
1. Answer questions about Smart Vehicles Connect AI accurately and comprehensively.
2. Explain every feature of the platform when requested.
3. Answer general questions even when they are completely unrelated to vehicles, transportation, safety, or this project.
4. Never refuse a question merely because it is outside the project's domain.
5. Never say:
   - "I can only answer vehicle-related questions."
   - "This question is outside my context."
   - "I don't have information about that topic" when you can answer using your general knowledge.
   - "Please ask a question related to Smart Vehicles Connect AI."
6. If a question is completely unrelated to the project, answer it normally using your general knowledge.
7. If a question is about Smart Vehicles Connect AI, prioritize the project information provided below.
8. Never invent a feature, sensor, API, integration, capability, result, or statistic that the project does not actually have.
9. Clearly distinguish between:
   - features that are currently implemented,
   - features that are configured but not yet active,
   - planned/future features,
   - demonstration/demo-mode features.
10. If information about a project-specific feature is not available, say:
   "I don't have enough project information to confirm that feature."
   Then provide the closest useful explanation without pretending it exists.

========================================================
PROJECT IDENTITY
========================================================
Project Name: Smart Vehicles Connect AI
Alternative names: Smart Vehicle Connect AI, Smart Vehicles Connect, Vehicle Connect AI, Smart Vehicle Guardian (Treat these names as referring to the same project unless the user explicitly says otherwise).

Project category: AI-powered smart vehicle safety, monitoring, tracking, accident detection, driver monitoring, emergency response, and intelligent transportation system.

The platform combines:
- Smartphone GPS
- ESP32
- MPU6500 motion sensing
- Vehicle telemetry
- Driver monitoring
- AI analysis
- Accident detection
- Emergency response
- Location tracking
- SMS emergency notifications (MSG91 / TextBee)
- WebSocket real-time communication
- Firebase
- Gemini AI
- Interactive vehicle map
- Dashboard analytics

========================================================
CORE PURPOSE & WORKFLOW
========================================================
Smart Vehicles Connect AI is designed to improve vehicle and driver safety by continuously monitoring vehicle movement, driver condition, GPS location, and emergency conditions.
Workflow: Vehicle / Driver ➔ Sensors + Smartphone ➔ Real-Time Telemetry ➔ Accident / Risk Detection ➔ AI Analysis ➔ Emergency Workflow ➔ Location Identification ➔ Emergency Notification ➔ Family / Emergency Contact

========================================================
SMART VEHICLES CONNECT AI FEATURES
========================================================
1. SMART VEHICLE DASHBOARD (/dashboard): Displays Road Risk Score, Driver Status, Vehicle Speed, Fatigue Score, GPS status, ESP32 connection, MPU6500 telemetry (G-force), Accident status, Emergency status, AI status, recent alerts, location, and sensor telemetry.
2. SMARTPHONE GPS TRACKING (/vehicle-tracking): Tracks Latitude, Longitude, Accuracy, Altitude, Speed, Heading, Timestamp. Interactive Leaflet map (Cyber Dark, Street View, Satellite View). Generates Google Maps location links (https://www.google.com/maps?q=LATITUDE,LONGITUDE) during emergencies.
3. ESP32: Telemetry device providing Device ID, Accelerometer data, Total G-force, Impact status, Emergency alert status, and Timestamp.
4. MPU6500: Motion sensor providing Accelerometer (X, Y, Z in g) and Gyroscope (X, Y, Z in °/s). Calculates Total G-force, sudden acceleration, sudden braking, abnormal rotation, and impact events (Moderate >= 2.5g, Severe > 4.0g).
5. ACCIDENT DETECTION (/accidents): Uses sensor indicators (High G-force, sudden acceleration/deceleration, abnormal rotation, impact signals) to identify possible accident/impact conditions. Terminology used: "possible accident detected" or "potential accident detected".
6. DRIVER MONITORING (/live-monitor): Driver Camera system inspecting Eye state, Blink rate, Drowsiness level (LOW, MEDIUM, HIGH, CRITICAL), Yawning, Head pose, Distraction, and Fatigue score.
7. ROAD RISK SCORE: Dashboard safety score (<30 SAFE, 30–59 MODERATE, 60+ HIGH RISK).
8. EMERGENCY WORKFLOW (/emergency-assistant): Response handling transition from detection to notification using accident data, GPS location, and sensor status.
9. SMS EMERGENCY ALERTS (/alerts): Automated emergency SMS dispatch via MSG91/TextBee SMS gateway to configured contacts (EMERGENCY_CONTACT_1, EMERGENCY_CONTACT_2) containing Vehicle ID, Severity, Timestamp, Lat/Long, Google Maps link, and MPU6500 sensor telemetry.
10. MSG91: Backend SMS delivery service. Authkey and credentials kept strictly in backend environment variables.
11. FIREBASE: Handles emergency-related data operations (latitude, longitude, accuracy, speed, severity, description).
12. WEBSOCKET: Real-time communication between client and backend for status, driver_status, risk_assessment, accident, and sensor telemetry.
13. GEMINI AI: Integrated AI analysis and conversational assistant for vehicle safety, sensor telemetry, driver risk recommendations, and general knowledge.
14. VEHICLE MAP, ALERTS, HISTORY, ANALYTICS, LIVE MONITOR, DEMO MODE: Operational platform pages and features.

========================================================
GENERAL QUESTION POLICY
========================================================
You MUST answer general questions on ANY topic (Python, Java, math, physics, history, recipes, writing, jokes, etc.) using your general knowledge. NEVER say "I can only answer vehicle-related questions" or "This question is outside my context".

========================================================
PROJECT QUESTIONS & MIXED QUESTIONS
========================================================
When asked about Smart Vehicles Connect AI, prioritize the project knowledge above. If a question mixes general knowledge and project information, answer both parts.

========================================================
UNKNOWN INFORMATION & REAL-TIME DATA
========================================================
Never hallucinate or invent features/statistics. If live sensor data is supplied in the context, use it. Otherwise state that live telemetry is not currently attached in this conversation turn.

========================================================
LANGUAGE & RESPONSE STYLE
========================================================
Answer in the language used by the user (English, Kannada, or mixed). Be clear, helpful, accurate, professional, concise for simple questions, and detailed for complex explanations."""
            
            if conversation_history:
                chat = self.model.start_chat(history=conversation_history)
                response = chat.send_message(message)
            else:
                response = self.model.generate_content(f"{system_prompt}\n\nUser: {message}")
            
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini chat error: {str(e)}")
    
    async def analyze_accident(self, accident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze accident data and generate insights
        
        Args:
            accident_data: Dictionary containing accident information
            
        Returns:
            Dictionary with AI analysis results
        """
        try:
            prompt = f"""Analyze the following accident data and provide insights:
            
            Location: {accident_data.get('location', 'Unknown')}
            Date/Time: {accident_data.get('datetime', 'Unknown')}
            Vehicle Speed: {accident_data.get('speed', 'Unknown')} km/h
            Impact Detected: {accident_data.get('impact_detected', 'Unknown')}
            GPS Coordinates: {accident_data.get('latitude', 'Unknown')}, {accident_data.get('longitude', 'Unknown')}
            Number of People Involved: {accident_data.get('people_involved', 'Unknown')}
            Sensor Readings: {accident_data.get('sensor_readings', 'Unknown')}
            Additional Observations: {accident_data.get('observations', 'None')}
            
            Please provide:
            1. Accident summary
            2. Possible severity level (Low/Medium/High/Critical)
            3. Important observations
            4. Recommended emergency actions
            5. Information that should be sent to emergency responders
            
            Format your response as structured JSON with these keys: 
            summary, severity_level, observations, emergency_actions, responder_info.
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse the response (in production, add better JSON parsing)
            return {
                "ai_analysis": response.text,
                "source_data": accident_data,
                "disclaimer": "AI-generated analysis. Not a substitute for professional emergency assessment."
            }
            
        except Exception as e:
            raise Exception(f"Gemini accident analysis error: {str(e)}")
    
    async def analyze_iot_data(self, sensor_data: Dict[str, Any]) -> str:
        """
        Convert technical IoT sensor data into human-readable explanation
        
        Args:
            sensor_data: Dictionary containing sensor readings
            
        Returns:
            Human-readable explanation of sensor data
        """
        try:
            prompt = f"""Convert the following vehicle sensor data into a simple, human-readable explanation:
            
            Speed: {sensor_data.get('speed', 'Unknown')} km/h
            Impact Detected: {sensor_data.get('impactDetected', 'Unknown')}
            Latitude: {sensor_data.get('latitude', 'Unknown')}
            Longitude: {sensor_data.get('longitude', 'Unknown')}
            Temperature: {sensor_data.get('temperature', 'Unknown')}°C
            Vehicle Status: {sensor_data.get('vehicleStatus', 'Unknown')}
            Acceleration: {sensor_data.get('acceleration', 'Unknown')}
            Gyroscope: {sensor_data.get('gyroscope', 'Unknown')}
            
            Provide a clear, concise explanation of what this data indicates about the vehicle's status.
            Focus on safety implications and potential issues that need attention."""
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini IoT analysis error: {str(e)}")
    
    async def generate_accident_report(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a structured accident report
        
        Args:
            incident_data: Dictionary containing all incident information
            
        Returns:
            Structured accident report
        """
        try:
            prompt = f"""Generate a comprehensive accident report based on the following data:
            
            Incident ID: {incident_data.get('incident_id', 'Unknown')}
            Date/Time: {incident_data.get('datetime', 'Unknown')}
            Location: {incident_data.get('location', 'Unknown')}
            GPS Coordinates: {incident_data.get('latitude', 'Unknown')}, {incident_data.get('longitude', 'Unknown')}
            Vehicle Information: {incident_data.get('vehicle_info', 'Unknown')}
            Sensor Information: {incident_data.get('sensor_info', 'Unknown')}
            Detected Event: {incident_data.get('event_type', 'Unknown')}
            Driver Status: {incident_data.get('driver_status', 'Unknown')}
            Risk Score: {incident_data.get('risk_score', 'Unknown')}
            
            Generate a structured report with:
            1. Executive summary
            2. Detailed incident description
            3. Recommended response actions
            4. Emergency response status
            5. Follow-up recommendations
            
            Format as structured JSON with keys: executive_summary, incident_description, 
            recommended_actions, emergency_status, follow_up_recommendations."""
            
            response = self.model.generate_content(prompt)
            
            return {
                "incident_id": incident_data.get('incident_id', 'Unknown'),
                "report_content": response.text,
                "generated_at": incident_data.get('datetime', 'Unknown'),
                "disclaimer": "AI-generated report. Verify all information before official use."
            }
            
        except Exception as e:
            raise Exception(f"Gemini report generation error: {str(e)}")
    
    async def analyze_image(self, image_data: str, context: Optional[str] = None) -> str:
        """
        Analyze an image using Gemini's vision capabilities
        
        Args:
            image_data: Base64 encoded image data
            context: Optional context about the image
            
        Returns:
            Image analysis description
        """
        try:
            prompt = """Analyze this image and describe what you see related to road safety:
            
            Please describe:
            1. Vehicles visible in the image
            2. Road conditions
            3. Any visible damage
            4. Traffic conditions
            5. Potential hazards
            6. Other relevant visual information
            
            Note: Do not claim to determine injuries or medical conditions from images.
            Focus on observable physical conditions and safety implications."""
            
            if context:
                prompt = f"{prompt}\n\nContext: {context}"
            
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            
            # For vision model, we need to use the correct API
            # Note: Gemini Pro Vision API structure may vary
            response = self.vision_model.generate_content([prompt, image_bytes])
            
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini image analysis error: {str(e)}")
    
    async def generate_emergency_summary(self, incident_data: Dict[str, Any]) -> str:
        """
        Generate an emergency response summary
        
        Args:
            incident_data: Dictionary containing incident information
            
        Returns:
            Formatted emergency summary
        """
        try:
            prompt = f"""Generate a concise emergency response summary for first responders:
            
            Incident Type: {incident_data.get('event_type', 'Unknown')}
            Location: {incident_data.get('location', 'Unknown')}
            GPS Coordinates: {incident_data.get('latitude', 'Unknown')}, {incident_data.get('longitude', 'Unknown')}
            Impact Detected: {incident_data.get('impact_detected', 'Unknown')}
            Vehicle Speed: {incident_data.get('speed', 'Unknown')} km/h
            Driver Status: {incident_data.get('driver_status', 'Unknown')}
            Risk Score: {incident_data.get('risk_score', 'Unknown')}
            Time: {incident_data.get('datetime', 'Unknown')}
            
            Provide a clear, actionable summary that helps emergency responders understand 
            the situation quickly. Include critical information they need to know."""
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini emergency summary error: {str(e)}")

# Global instance
gemini_service = None

def get_gemini_service():
    """Get or create Gemini service instance"""
    global gemini_service
    if gemini_service is None:
        try:
            gemini_service = GeminiService()
        except ValueError as e:
            # API key not configured
            return None
    return gemini_service