/**
 * Smart Vehicle Connect AI - Dynamic Gemini AI Query Engine
 * Exclusively uses Google Gemini API to generate intelligent, dynamic,
 * multilingual, and context-aware responses with live vehicle telemetry.
 */

const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();

/**
 * Builds structured vehicle context from live server state (/api/esp32, /api/location, /api/vehicle)
 */
function buildVehicleContext(liveData = {}) {
  const {
    vehicleData = {},
    latestESP32Data = {},
    vehicleLocation = {},
    accidents = [],
    smsLogs = [],
    clientVehicleContext
  } = liveData;

  const esp32Connected = Boolean(
    latestESP32Data.hasData || 
    (latestESP32Data.timestamp && Date.now() - new Date(latestESP32Data.timestamp).getTime() < 60000) ||
    clientVehicleContext?.esp32?.connected
  );
  
  const gpsFixAvailable = Boolean(
    (vehicleLocation.latitude && vehicleLocation.longitude) ||
    (clientVehicleContext?.gps?.latitude && clientVehicleContext?.gps?.longitude)
  );

  return {
    esp32: {
      device_id: latestESP32Data.device_id || clientVehicleContext?.esp32?.device_id || "RG-001",
      connected: esp32Connected,
      has_data: Boolean(latestESP32Data.hasData || clientVehicleContext?.esp32?.has_data),
      accel_x: latestESP32Data.accel_x ?? vehicleData.ax ?? clientVehicleContext?.esp32?.accel_x ?? null,
      accel_y: latestESP32Data.accel_y ?? vehicleData.ay ?? clientVehicleContext?.esp32?.accel_y ?? null,
      accel_z: latestESP32Data.accel_z ?? vehicleData.az ?? clientVehicleContext?.esp32?.accel_z ?? null,
      total_g: latestESP32Data.total_g ?? vehicleData.totalG ?? clientVehicleContext?.esp32?.total_g ?? null,
      impact: Boolean(latestESP32Data.impact || vehicleData.impact || clientVehicleContext?.esp32?.impact),
      alert_active: Boolean(latestESP32Data.alert_active || vehicleData.emergency || clientVehicleContext?.esp32?.alert_active),
      uptime_seconds: Math.round((latestESP32Data.uptime_ms || 0) / 1000) || clientVehicleContext?.esp32?.uptime_seconds || 0,
      last_telemetry_timestamp: latestESP32Data.timestamp || vehicleData.lastUpdate || clientVehicleContext?.esp32?.last_telemetry_timestamp || null
    },
    gps: {
      has_fix: gpsFixAvailable,
      latitude: vehicleLocation?.latitude ?? clientVehicleContext?.gps?.latitude ?? null,
      longitude: vehicleLocation?.longitude ?? clientVehicleContext?.gps?.longitude ?? null,
      accuracy: vehicleLocation?.accuracy ?? clientVehicleContext?.gps?.accuracy ?? null,
      speed: vehicleLocation?.speed ?? clientVehicleContext?.gps?.speed ?? null,
      heading: vehicleLocation?.heading ?? clientVehicleContext?.gps?.heading ?? null,
      last_fix_timestamp: vehicleLocation?.timestamp ?? clientVehicleContext?.gps?.last_fix_timestamp ?? null
    },
    driver: {
      drowsiness_level: vehicleData.drowsiness_level || "NORMAL",
      fatigue_score: vehicleData.fatigue_score ?? 0,
      distraction: vehicleData.distraction ?? false
    },
    system: {
      accidents_count: Array.isArray(accidents) ? accidents.length : (clientVehicleContext?.system?.accidents_count || 0),
      sms_dispatched_count: Array.isArray(smsLogs) ? smsLogs.length : (clientVehicleContext?.system?.sms_dispatched_count || 0),
      emergency_mode: Boolean(latestESP32Data.alert_active || vehicleData.emergency || clientVehicleContext?.system?.emergency_mode)
    }
  };
}

/**
 * Builds the comprehensive system instruction for Gemini
 */
function buildSystemInstruction(vehicleContext) {
  return `You are the official intelligent AI Assistant of "Smart Vehicles Connect AI" (also referred to as "Smart Vehicle Connect AI" or "Vehicle Connect AI").

You are an expert AI engineer and automotive IoT specialist.

========================================================
1. PROJECT ARCHITECTURE & DOMAIN KNOWLEDGE
========================================================
- Project Identity: AI-powered smart vehicle safety, IoT telemetry, real-time tracking, accident detection, driver monitoring, and automated emergency response ecosystem.
- ESP32 Microcontroller: Reads sensor telemetry, calculates G-force, and streams HTTP/WebSocket packets to Node.js / Express backend.
- MPU6500 Sensor: Integrated 6-axis MotionTracking sensor combining 3-axis accelerometer (measures linear acceleration & gravity in g, ranges ±2g to ±16g) and 3-axis gyroscope (measures rotational angular velocity in °/s). I2C address 0x68.
- Total G-Force Formula: Total G = sqrt(ax² + ay² + az²). Baseline gravity is 1.0g.
- Accident Detection Thresholds: Normal Driving < 1.5g, Moderate Impact / Warning >= 2.5g, Severe Collision > 4.0g (triggers immediate emergency workflow).
- GPS Tracking: Captures latitude, longitude, accuracy, speed (km/h), and heading. Renders on interactive Leaflet maps with Cyber Dark, Street View, and Satellite View modes. Generates Google Maps navigation links (https://maps.google.com/?q=lat,lng).
- Emergency SMS Alerts: Dispatches collision details (Vehicle ID, severity, timestamp, coordinates, Google Maps link) via TextBee.dev / MSG91 SMS gateway to EMERGENCY_CONTACT_1 and EMERGENCY_CONTACT_2 with 5-minute cooldown deduplication.
- Driver Monitoring System (DMS): Computer vision inspecting Eye Aspect Ratio (EAR < 0.25 indicates closure), blink rate, PERCLOS, yawning (MAR), head pose (distraction), and drowsiness level (LOW, MEDIUM, HIGH, CRITICAL).
- Road Risk Score: 0 to 100 score engine (SAFE < 30, MODERATE 30-59, HIGH RISK 60+).
- Hardware Pinout: ESP32 to MPU6500: VCC->3.3V, GND->GND, SDA->GPIO 21, SCL->GPIO 22. Serial baud rate 115200.

========================================================
2. LIVE TELEMETRY CONTEXT (UPDATED IN REAL TIME)
========================================================
The following is the CURRENT LIVE VEHICLE TELEMETRY from the backend:
${JSON.stringify(vehicleContext, null, 2)}

INSTRUCTIONS FOR LIVE DATA QUESTIONS:
- If the user asks about live speed, acceleration, G-force, sensor values, impacts, coordinates, or ESP32 status, ALWAYS inspect the live telemetry above.
- If esp32.connected is false or accel values are null, explicitly state that live ESP32 telemetry is not currently received/streaming.
- If gps.has_fix is false or speed is null, state that no active GPS location fix is received yet.
- NEVER fabricate, invent, or hallucinate fake sensor values.

========================================================
3. GENERAL QUESTIONS & OPEN-DOMAIN KNOWLEDGE
========================================================
- You MUST answer general questions on ANY topic (Python, Java, C++, JavaScript, math, science, physics, gravity, photosynthesis, machine learning, history, writing, jokes, etc.) using your comprehensive knowledge.
- NEVER say "I can only answer vehicle-related questions" or "This is outside my context".
- If a question is completely unrelated to vehicles, answer it directly, accurately, and thoroughly.

========================================================
4. MULTILINGUAL & RESPONSE FORMATTING GUIDELINES
========================================================
- Automatically detect the user's language and respond naturally in the same language (e.g., Kannada ಕನ್ನಡ, Hindi हिन्दी, Tamil தமிழ், Telugu తెలుగు, Malayalam മലയാളം, English, etc.).
- If the user specifies "Answer in English" or "Explain in Kannada", strictly follow their requested language.
- Format responses cleanly with Markdown: use bold text, bullet points, numbered lists, tables where helpful, and code blocks for programming.`;
}

/**
 * Main query processor: sends the user query directly to Gemini API
 */
async function generateSmartResponse({
  message,
  conversationHistory = [],
  language = "auto",
  liveData = {}
}) {
  const userMessage = String(message || "").trim();
  if (!userMessage) {
    return "Please enter a question or message.";
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.error("[Gemini AI Error] GEMINI_API_KEY is not configured in .env");
    return "Sorry, I couldn't connect to Gemini right now because the API key is not configured. Please check your .env file.";
  }

  const vehicleContext = buildVehicleContext(liveData);
  const systemInstruction = buildSystemInstruction(vehicleContext);

  // Model selection hierarchy from .env or proven active Gemini models
  const primaryModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const candidateModels = [
    primaryModel,
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ].filter((v, i, a) => a.indexOf(v) === i); // remove duplicates

  // Construct multi-turn conversation contents
  const contents = [];
  if (Array.isArray(conversationHistory)) {
    // Keep recent history window (last 10 messages) to avoid token bloat
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      const role = (msg.role === "assistant" || msg.role === "model") ? "model" : "user";
      let text = "";
      if (Array.isArray(msg.parts) && msg.parts[0]?.text) {
        text = msg.parts[0].text;
      } else if (typeof msg.content === "string") {
        text = msg.content;
      }
      if (text && text.trim()) {
        contents.push({ role, parts: [{ text: text.trim() }] });
      }
    }
  }

  // Append current user message
  let promptText = userMessage;
  if (language && language !== "auto" && language !== "English") {
    promptText = `[Please respond in ${language} language]:\n${promptText}`;
  }
  contents.push({ role: "user", parts: [{ text: promptText }] });

  console.log("-----------------------------------------");
  console.log("CHAT USER MESSAGE:", userMessage);
  console.log("SENDING REQUEST TO GEMINI");
  console.log("TELEMETRY STATUS: ESP32 Connected:", vehicleContext.esp32.connected, "| GPS Fix:", vehicleContext.gps.has_fix);
  console.log("-----------------------------------------");

  let lastError = null;

  for (const model of candidateModels) {
    try {
      console.log(`[Gemini Dispatcher] Attempting model: ${model}`);
      const payload = {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000
        }
      );

      const candidate = response.data?.candidates?.[0];
      const responseText = candidate?.content?.parts?.[0]?.text;

      if (responseText && responseText.trim().length > 0) {
        console.log("GEMINI RESPONSE RECEIVED (Model:", model, ")");
        console.log("CHAT RESPONSE [First 100 chars]:", responseText.substring(0, 100).replace(/\n/g, " "), "...");
        return responseText.trim();
      }
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const errMsg = err.response?.data?.error?.message || err.message;
      console.warn(`[Gemini API Warning] Model ${model} failed (Status ${status}):`, errMsg);
    }
  }

  console.error("ALL GEMINI MODELS FAILED. Root error:", lastError?.message);
  return "Sorry, I couldn't connect to Gemini right now. Please try again.";
}

module.exports = {
  buildVehicleContext,
  generateSmartResponse
};
