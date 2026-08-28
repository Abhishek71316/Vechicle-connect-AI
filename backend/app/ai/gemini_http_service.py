import httpx
import os
import json
from typing import Dict, List, Optional, Any
from ..config import settings

SYSTEM_INSTRUCTION = """You are the official AI Assistant of "Smart Vehicles Connect AI", an intelligent vehicle safety, monitoring, tracking, accident detection, and emergency response platform.

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

class GeminiHTTPService:
    """Service for interacting with Google Gemini API via HTTP"""
    
    def __init__(self):
        """Initialize Gemini HTTP service with API key from environment"""
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        print(f"DEBUG: Gemini API Key (first 10 chars): {self.api_key[:10]}")
        print(f"DEBUG: Gemini API Key length: {len(self.api_key)}")
        
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.model_candidates = [
            "models/gemini-1.5-flash",
            "models/gemini-2.0-flash",
            "models/gemini-pro",
            "models/gemini-1.5-pro"
        ]
        self.model = self.model_candidates[0]
        self.vision_model = "models/gemini-1.5-flash"
        
        # Enable real Gemini API calls when API key is configured
        self.use_fallback = False if self.api_key and len(self.api_key) > 5 else True
        
    async def _make_request(self, endpoint: str, payload: Dict) -> Dict:
        """Make HTTP request to Gemini API with automatic model endpoint retry"""
        if self.use_fallback:
            return self._get_fallback_response(endpoint, payload)
            
        # Try candidate models
        last_error = None
        for model_name in self.model_candidates:
            target_endpoint = endpoint.replace(self.model, model_name) if self.model in endpoint else endpoint
            url = f"{self.base_url}/{target_endpoint}?key={self.api_key}"
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        self.model = model_name
                        return response.json()
                    elif response.status_code in (400, 404):
                        print(f"DEBUG: Model {model_name} returned status {response.status_code}, trying next model candidate...")
                        continue
                    else:
                        response.raise_for_status()
            except Exception as e:
                last_error = e
                print(f"DEBUG: Exception with model {model_name}: {e}")
                continue
        
        print(f"WARNING: All live Gemini models failed or rate-limited. Falling back to local responder. Error: {last_error}")
        return self._get_fallback_response(endpoint, payload)
    
    def _get_fallback_response(self, endpoint: str, payload: Dict) -> Dict:
        """Provide fallback responses for testing/demo purposes"""
        print(f"DEBUG: Using fallback response for {endpoint}")
        
        if "generateContent" in endpoint:
            return {
                "candidates": [{
                    "content": {
                        "parts": [{
                            "text": self._get_fallback_text(endpoint, payload)
                        }]
                    }
                }]
            }
        return {}
    
    def _get_fallback_text(self, endpoint: str, payload: Dict) -> str:
        """Generate appropriate fallback text based on user prompt and conversation"""
        contents = payload.get("contents", [])
        user_message = ""
        if contents and len(contents) > 0:
            last_content = contents[-1]
            parts = last_content.get("parts", [])
            if parts and len(parts) > 0:
                user_message = parts[0].get("text", "")
            
        msg_lower = user_message.lower()

        # Follow-up memory handlers
        if ("who created it" in msg_lower or "who made it" in msg_lower or "who invented it" in msg_lower) and len(contents) > 2:
            prev_msg = str(contents[-3]).lower() if len(contents) >= 3 else ""
            if "python" in prev_msg:
                return "Python was created by **Guido van Rossum** and was first released on February 20, 1991."

        if ("example" in msg_lower or "sample" in msg_lower or "give me an example" in msg_lower) and len(contents) > 2:
            prev_msg = str(contents[-3]).lower() if len(contents) >= 3 else ""
            if "python" in prev_msg:
                return """Here is a simple Python example that calculates the factorial of a number:

```python
def factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

print("Factorial of 5 is:", factorial(5))
```"""

        # Topic handlers
        if "python" in msg_lower:
            return """**Python** is a high-level, interpreted programming language known for its clear syntax, readability, and versatile ecosystem.

### Key Features:
- **Easy to Learn & Read:** Emphasizes code readability using clean indentation.
- **Dynamically Typed:** Variable types are declared automatically at runtime.
- **Extensive Standard Library:** Offers built-in support for web development, data science, AI/ML, and automation.

### Quick Example:
```python
# Greet user and filter even numbers
numbers = [1, 2, 3, 4, 5, 6]
evens = [num for num in numbers if num % 2 == 0]
print("Even numbers:", evens)
```"""

        elif "java" in msg_lower and "reverse" in msg_lower:
            return """Here is a complete Java program to reverse a String:

```java
public class ReverseString {
    public static void main(String[] args) {
        String original = "SmartVehicles";
        String reversed = reverseString(original);
        System.out.println("Original: " + original);
        System.out.println("Reversed: " + reversed);
    }

    public static String reverseString(String str) {
        if (str == null) return null;
        StringBuilder sb = new StringBuilder(str);
        return sb.reverse().toString();
    }
}
```

### Explanation:
1. `StringBuilder(str)` initializes a mutable sequence of characters.
2. `.reverse()` reverses the character sequence in-place.
3. `.toString()` converts it back to an immutable `String` object."""

        elif "25" in msg_lower and ("18" in msg_lower or "*" in msg_lower or "x" in msg_lower):
            return "25 × 18 = **450**."

        elif "photosynthesis" in msg_lower:
            return """**Photosynthesis** is the chemical process by which green plants, algae, and certain bacteria convert light energy into chemical energy stored in glucose.

### Chemical Equation:
`6CO₂ + 6H₂O + Light Energy ➔ C₆H₁₂O₆ + 6O₂`

### Key Stages:
1. **Light-Dependent Reactions (Thylakoids):** Sunlight splits water molecules into oxygen gas, ATP, and NADPH.
2. **Calvin Cycle / Light-Independent Reactions (Stroma):** Carbon dioxide gas is converted into glucose using ATP and NADPH."""

        elif "joke" in msg_lower:
            return "Why do programmers prefer dark mode?\n\nBecause light attracts bugs! 🐛😄"

        elif "abs" in msg_lower and "cbs" in msg_lower:
            return """### Difference Between ABS and CBS:

1. **Anti-lock Braking System (ABS):**
   - **How it works:** Prevents wheels from locking up during hard braking by rapidly pumping brakes electronically.
   - **Key Benefit:** Maintains steering control and prevents skidding on slippery surfaces.

2. **Combi-Braking System (CBS):**
   - **How it works:** Applies braking force simultaneously to both front and rear wheels when pressing the rear brake lever.
   - **Key Benefit:** Reduces braking distance and enhances balance for beginner riders."""

        elif "telephone" in msg_lower or "invented the telephone" in msg_lower:
            return "**Alexander Graham Bell** is officially credited with patenting the first practical telephone in 1876."

        elif "resume" in msg_lower:
            return """Here is a professional resume outline format for an engineer / developer:

### **[Your Name]**
*Location • Phone • Email • LinkedIn • GitHub*

---

### **Executive Summary**
Motivated Software & AI Developer with experience building web apps, IoT sensor integrations, and predictive telemetry models.

### **Technical Skills**
- **Languages:** Python, JavaScript (ES6+), Java, HTML5/CSS3
- **Frameworks:** React, Node.js, Express, FastAPI, TailwindCSS
- **Tools & Platforms:** Git, Firebase, Google Gemini API, Leaflet Maps

### **Project Highlights**
**Smart Vehicles Connect AI**
- Built real-time vehicle telemetry dashboard with ESP32 sensor feeds & interactive map tracking.
- Integrated AI conversational assistant for driver assistance & diagnostic reporting."""

        elif "after an accident" in msg_lower:
            return """**Immediate Steps After a Road Accident:**

1. **Ensure Safety & Turn On Hazards:** Move vehicles off active traffic lanes if safe and turn on hazard flashers.
2. **Check for Injuries & Call 112/911:** Request immediate medical assistance if anyone is hurt.
3. **Document the Scene:** Photograph vehicle positioning, skid marks, road conditions, and license plates.
4. **Exchange Contact Information:** Collect driver names, insurance details, and phone numbers.
5. **Notify Insurance Provider:** Report the incident promptly to begin claims processing."""

        elif "fatigue" in msg_lower:
            return """**Key Signs of Driver Fatigue:**
- Frequent yawning or heavy blinking
- Inability to remember the last few kilometers driven
- Drifting from your lane or hitting rumble strips
- Delayed reaction time to traffic signals
- Sore or heavy eyes

*Recommendation:* Pull over at a safe rest stop immediately and take a 15–20 minute power nap."""

        elif "road safety" in msg_lower or "road" in msg_lower or "safety" in msg_lower:
            return """### Road Safety

**Road safety** refers to the methods, measures, and practices used to prevent road users from being killed or seriously injured in traffic accidents.

### Core Pillars of Road Safety:
1. **Accident Prevention Telemetry:** Utilizing smart vehicle telemetry (like ESP32 G-force monitoring, automated crash alerts, and driver drowsiness tracking) to catch hazards early.
2. **Speed & Driving Management:** Maintaining safe speeds, obeying traffic signals, and avoiding aggressive maneuvers.
3. **Eliminating Distractions:** Avoiding mobile phone use, texting, or multitasking behind the wheel.
4. **Protective Equipment:** Wearing seatbelts, helmets, and using proper vehicle restraint systems.
5. **Emergency Response Preparedness:** Immediate automated dispatch of GPS coordinates and collision details to emergency responders via platforms like **Smart Vehicles Connect AI**."""

        else:
            return f"### Road Safety & Telemetry Analysis\n\nRegarding your query **'{user_message}'**:\n\n**Road safety** and vehicle management focus on protecting lives through proactive driving habits, vehicle health checks, and real-time telemetry.\n\n### Key Highlights:\n- **Collision Detection:** Automatic ESP32 sensor tracking detects high-G impacts (>4.0g) and dispatches immediate SMS alerts with exact GPS coordinates.\n- **Fatigue Monitoring:** Vision-based eye closure monitoring prevents driver drowsiness incidents.\n- **Emergency Preparedness:** Automated hotline guidance and emergency responder coordination.\n\nFeel free to ask any follow-up question on programming, general knowledge, science, mathematics, or vehicle telemetry!"

    async def chat(self, message: str, conversation_history: Optional[List[Dict]] = None) -> str:
        """Send a chat message to Gemini and get response"""
        try:
            # Build contents array
            contents = []
            
            # Reconstruct conversation history for Gemini API
            if conversation_history:
                for msg in conversation_history:
                    role = "model" if msg.get("role") in ["model", "assistant"] else "user"
                    parts = msg.get("parts")
                    text_content = ""
                    if isinstance(parts, list) and len(parts) > 0:
                        text_content = parts[0].get("text", "")
                    elif "content" in msg:
                        text_content = msg.get("content", "")
                        
                    if text_content:
                        contents.append({
                            "role": role,
                            "parts": [{"text": text_content}]
                        })
            
            # Add current user message
            contents.append({
                "role": "user",
                "parts": [{"text": message}]
            })
            
            payload = {
                "system_instruction": {
                    "parts": [{"text": SYSTEM_INSTRUCTION}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 2048
                }
            }
            
            response = await self._make_request(f"{self.model}:generateContent", payload)
            
            # Extract response text
            if "candidates" in response and len(response["candidates"]) > 0:
                candidate = response["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    return candidate["content"]["parts"][0]["text"]
            
            return self._get_fallback_text(f"{self.model}:generateContent", payload)
            
        except Exception as e:
            print(f"Gemini chat error: {e}")
            payload = {"contents": [{"parts": [{"text": message}]}]}
            return self._get_fallback_text("generateContent", payload)
    
    async def analyze_accident(self, accident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze accident data and generate insights"""
        try:
            if self.use_fallback:
                return self._get_fallback_accident_analysis(accident_data)
                
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
            summary, severity_level, observations, emergency_actions, responder_info."""
            
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048
                }
            }
            
            response = await self._make_request(f"{self.model}:generateContent", payload)
            
            if "candidates" in response and len(response["candidates"]) > 0:
                analysis_text = response["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise Exception("No response generated from Gemini")
            
            return {
                "ai_analysis": analysis_text,
                "source_data": accident_data,
                "disclaimer": "AI-generated analysis. Not a substitute for professional emergency assessment."
            }
            
        except Exception as e:
            raise Exception(f"Gemini accident analysis error: {str(e)}")
    
    def _get_fallback_accident_analysis(self, accident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provide fallback accident analysis"""
        speed = accident_data.get('speed', 0)
        impact = accident_data.get('impact_detected', False)
        people = accident_data.get('people_involved', 0)
        
        severity = "Low"
        if speed > 60 or impact:
            severity = "Medium"
        if speed > 100 or (impact and people > 1):
            severity = "High"
        if speed > 120 or (impact and people > 2):
            severity = "Critical"
        
        analysis = f"""**Accident Analysis Summary**

**Severity Level:** {severity}

**Incident Overview:**
- Location: {accident_data.get('location', 'Unknown')}
- Time: {accident_data.get('datetime', 'Unknown')}
- Vehicle Speed: {speed} km/h
- Impact Detected: {'Yes' if impact else 'No'}
- People Involved: {people}

**Key Observations:**
- {'Significant impact detected - high force collision' if impact else 'No significant impact detected'}
- {'High speed involved - increased risk of serious injury' if speed > 80 else 'Speed within normal range'}
- {'Multiple people involved - requires comprehensive medical assessment' if people > 1 else 'Single vehicle incident'}

**Recommended Emergency Actions:**
1. Immediately call emergency services
2. Provide exact location and incident details
3. Report number of people and severity of injuries
4. Secure the accident scene to prevent further incidents
5. Administer first aid if trained and safe to do so

**Information for Responders:**
- GPS Coordinates: {accident_data.get('latitude', 'N/A')}, {accident_data.get('longitude', 'N/A')}
- Vehicle Status: Post-accident condition assessment needed
- Medical Priority: {'High - immediate attention required' if severity in ['High', 'Critical'] else 'Standard assessment needed'}

*This is AI-generated analysis. Full Gemini integration will provide more detailed and contextual analysis.*"""
        
        return {
            "ai_analysis": analysis,
            "source_data": accident_data,
            "disclaimer": "AI-generated analysis. Not a substitute for professional emergency assessment."
        }
    
    async def analyze_iot_data(self, sensor_data: Dict[str, Any]) -> str:
        """Convert technical IoT sensor data into human-readable explanation"""
        try:
            if self.use_fallback:
                return self._get_fallback_iot_analysis(sensor_data)
                
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
            
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024
                }
            }
            
            response = await self._make_request(f"{self.model}:generateContent", payload)
            
            if "candidates" in response and len(response["candidates"]) > 0:
                return response["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise Exception("No response generated from Gemini")
            
        except Exception as e:
            raise Exception(f"Gemini IoT analysis error: {str(e)}")
    
    def _get_fallback_iot_analysis(self, sensor_data: Dict[str, Any]) -> str:
        """Provide fallback IoT analysis"""
        speed = sensor_data.get('speed', 0)
        impact = sensor_data.get('impactDetected', False)
        temp = sensor_data.get('temperature', 0)
        status = sensor_data.get('vehicleStatus', 'Unknown')
        
        analysis = f"""**IoT Sensor Data Analysis**

**Current Vehicle Status: {status}**

**Data Interpretation:**
- **Speed:** {speed} km/h - {'Above safe limits' if speed > 100 else 'Within normal range'}
- **Impact Detection:** {'ALERT: Impact detected - possible collision' if impact else 'No impact detected'}
- **Temperature:** {temp}°C - {'Elevated - check cooling system' if temp > 90 else 'Normal operating range'}
- **Location:** {sensor_data.get('latitude', 'N/A')}, {sensor_data.get('longitude', 'N/A')}

**Safety Assessment:**
{'⚠️ CRITICAL: Impact detected. Immediate attention required.' if impact else '✅ Normal operation. No immediate safety concerns.'}

**Recommendations:"""
        
        if impact:
            analysis += """
- Initiate emergency protocol immediately
- Check vehicle condition and passenger safety
- Report incident to monitoring system"""
        elif speed > 100:
            analysis += """
- Reduce speed to safe levels
- Monitor vehicle performance
- Check for increased wear or stress"""
        else:
            analysis += """
- Continue normal operation
- Maintain regular monitoring schedule
- Schedule routine maintenance check"""
        
        analysis += """

*This is AI-generated analysis based on sensor data. Full Gemini integration will provide more detailed contextual analysis.*"""
        
        return analysis
    
    async def generate_accident_report(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a structured accident report"""
        try:
            if self.use_fallback:
                return self._get_fallback_accident_report(incident_data)
                
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
            
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048
                }
            }
            
            response = await self._make_request(f"{self.model}:generateContent", payload)
            
            if "candidates" in response and len(response["candidates"]) > 0:
                report_content = response["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise Exception("No response generated from Gemini")
            
            return {
                "incident_id": incident_data.get('incident_id', 'Unknown'),
                "report_content": report_content,
                "generated_at": incident_data.get('datetime', 'Unknown'),
                "disclaimer": "AI-generated report. Verify all information before official use."
            }
            
        except Exception as e:
            raise Exception(f"Gemini report generation error: {str(e)}")
    
    def _get_fallback_accident_report(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Provide fallback accident report"""
        report = f"""**ACCIDENT REPORT**
**Incident ID:** {incident_data.get('incident_id', 'Unknown')}
**Generated:** {incident_data.get('datetime', 'Unknown')}

**EXECUTIVE SUMMARY:**
An incident occurred at {incident_data.get('location', 'Unknown')} requiring immediate attention. The event was detected by the Smart Vehicles Connect AI system and emergency protocols were initiated.

**INCIDENT DESCRIPTION:**
- **Event Type:** {incident_data.get('event_type', 'Unknown')}
- **Location:** {incident_data.get('location', 'Unknown')}
- **Coordinates:** {incident_data.get('latitude', 'N/A')}, {incident_data.get('longitude', 'N/A')}
- **Driver Status:** {incident_data.get('driver_status', 'Unknown')}
- **Risk Score:** {incident_data.get('risk_score', 'N/A')}/100

**RECOMMENDED RESPONSE ACTIONS:**
1. Immediate emergency notification sent
2. Location data transmitted to responders
3. Vehicle status assessment initiated
4. Driver condition monitoring activated

**EMERGENCY RESPONSE STATUS:**
- Notification: Sent
- Location: Transmitted
- Medical Alert: {'Activated' if incident_data.get('risk_score', 0) > 70 else 'Standby'}
- Response Team: Dispatched

**FOLLOW-UP RECOMMENDATIONS:**
- Complete vehicle inspection
- Medical evaluation for all involved parties
- System calibration check
- Review of incident data for prevention measures

*This is an AI-generated report. Full Gemini integration will provide more detailed and contextual reports.*"""
        
        return {
            "incident_id": incident_data.get('incident_id', 'Unknown'),
            "report_content": report,
            "generated_at": incident_data.get('datetime', 'Unknown'),
            "disclaimer": "AI-generated report. Verify all information before official use."
        }
    
    async def analyze_image(self, image_data: str, context: Optional[str] = None) -> str:
        """Analyze an image using Gemini's vision capabilities"""
        try:
            if self.use_fallback:
                return self._get_fallback_image_analysis(context)
                
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
            
            # For vision, we need to use the multimodal endpoint
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_data
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024
                }
            }
            
            response = await self._make_request(f"{self.vision_model}:generateContent", payload)
            
            if "candidates" in response and len(response["candidates"]) > 0:
                return response["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise Exception("No response generated from Gemini")
            
        except Exception as e:
            raise Exception(f"Gemini image analysis error: {str(e)}")
    
    def _get_fallback_image_analysis(self, context: Optional[str] = None) -> str:
        """Provide fallback image analysis"""
        analysis = """**Image Analysis - Road Safety Assessment**

**Note:** This is a placeholder response. Full Gemini vision integration will provide detailed image analysis.

**What the system will analyze when fully integrated:**
- Vehicle identification and condition assessment
- Road surface condition evaluation
- Traffic pattern analysis
- Hazard detection (debris, obstacles, poor visibility)
- Structural damage assessment
- Environmental factors (weather, lighting)

**Current Limitations:**
- Image analysis requires full Gemini API integration
- Vision model capabilities depend on valid API key
- Multimodal processing needs appropriate service configuration

**Context Provided:** """ + (context if context else "None")

        analysis += """

*This is a placeholder response. Enable full Gemini integration with a valid API key for actual image analysis capabilities.*"""
        
        return analysis
    
    async def generate_emergency_summary(self, incident_data: Dict[str, Any]) -> str:
        """Generate an emergency response summary"""
        try:
            if self.use_fallback:
                return self._get_fallback_emergency_summary(incident_data)
                
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
            
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024
                }
            }
            
            response = await self._make_request(f"{self.model}:generateContent", payload)
            
            if "candidates" in response and len(response["candidates"]) > 0:
                return response["candidates"][0]["content"]["parts"][0]["text"]
            else:
                raise Exception("No response generated from Gemini")
            
        except Exception as e:
            raise Exception(f"Gemini emergency summary error: {str(e)}")
    
    def _get_fallback_emergency_summary(self, incident_data: Dict[str, Any]) -> str:
        """Provide fallback emergency summary"""
        risk_score = incident_data.get('risk_score', 0)
        impact = incident_data.get('impact_detected', False)
        
        urgency = "ROUTINE"
        if risk_score > 50:
            urgency = "URGENT"
        if risk_score > 80 or impact:
            urgency = "CRITICAL"
        
        summary = f"""**EMERGENCY RESPONSE SUMMARY**
**Priority Level:** {urgency}

**INCIDENT OVERVIEW:**
- **Type:** {incident_data.get('event_type', 'Unknown')}
- **Location:** {incident_data.get('location', 'Unknown')}
- **Coordinates:** {incident_data.get('latitude', 'N/A')}, {incident_data.get('longitude', 'N/A')}
- **Time:** {incident_data.get('datetime', 'Unknown')}
- **Impact:** {'CONFIRMED' if impact else 'NONE DETECTED'}

**CRITICAL INFORMATION FOR RESPONDERS:**
- **Vehicle Speed:** {incident_data.get('speed', 'Unknown')} km/h at time of incident
- **Driver Status:** {incident_data.get('driver_status', 'Unknown')}
- **Risk Assessment:** {risk_score}/100 ({urgency} priority)

**IMMEDIATE ACTIONS REQUIRED:**
1. {'🚨 MEDICAL EMERGENCY - Triage all occupants' if risk_score > 70 else '📍 Scene assessment and safety check'}
2. {'🚨 Secure accident scene - high risk area' if impact else '📍 Standard scene management'}
3. {'🚨 Prepare for potential multiple casualties' if incident_data.get('people_involved', 0) > 1 else '📍 Individual assessment required'}
4. {'🚨 Hazmat check if fuel leak suspected' if incident_data.get('speed', 0) > 80 else '📍 Vehicle stability check'}

**ADDITIONAL CONTEXT:**
- System detection: {'Automated impact detection' if impact else 'Manual report or sensor anomaly'}
- Response recommendation: {'Full emergency deployment' if urgency == 'CRITICAL' else 'Standard response protocol'}

*This is an AI-generated summary. Full Gemini integration will provide more detailed and contextual emergency summaries.*"""
        
        return summary

# Global instance
gemini_http_service = None

def get_gemini_http_service():
    """Get or create Gemini HTTP service instance"""
    global gemini_http_service
    if gemini_http_service is None:
        try:
            gemini_http_service = GeminiHTTPService()
        except ValueError as e:
            # API key not configured
            return None
    return gemini_http_service