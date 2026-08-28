const path = require("path");
const envPath = path.join(__dirname, ".env");
try {
    require(path.join(__dirname, "node_modules", "dotenv")).config({ path: envPath, override: true });
} catch (e) {
    try {
        require("dotenv").config({ path: envPath, override: true });
    } catch (e2) {}
}

console.log("🔒 TEXTBEE ENV CONFIG LOADED:", {
    apiKey: process.env.TEXTBEE_API_KEY ? "SET" : "MISSING",
    contact1: process.env.EMERGENCY_CONTACT_1 || "MISSING",
    contact2: process.env.EMERGENCY_CONTACT_2 || "MISSING"
});
const express = require("express");
const cors = require("cors");
const http = require("http");
const axios = require("axios");

const { sendAccidentSMS, sendEmergencySMS, maskPhone } = require("./services/textbeeService");
const { generateSmartResponse } = require("./services/aiQueryEngine");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Absolute static path using __dirname guarantees index.html is served regardless of CWD
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// STORED VEHICLE & LOCATION & ESP32 & SMS DATA
// =====================================================

let vehicleLocation = {
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null
};

let latestESP32Data = {
    hasData: false,
    device_id: "RG-001",
    accel_x: null,
    accel_y: null,
    accel_z: null,
    total_g: null,
    impact: false,
    alert_active: false,
    uptime_ms: 0,
    timestamp: null
};

let vehicleData = {
    latitude: null,
    longitude: null,
    accuracy: null,

    ax: null,
    ay: null,
    az: null,
    totalG: null,

    impact: false,
    emergency: false,

    lastUpdate: null
};

let accidents = [];
let smsLogs = [];
let tripHistory = [
    {
        id: "TRIP-1001",
        start_location: "Bengaluru City Center",
        end_location: "Kempegowda Int. Airport",
        start_time: new Date(Date.now() - 3600000 * 5).toISOString(),
        end_time: new Date(Date.now() - 3600000 * 4.2).toISOString(),
        distance: 34.5,
        duration: 48,
        average_speed: 43.1,
        max_speed: 78.5,
        risk_score: 12
    },
    {
        id: "TRIP-1002",
        start_location: "Koramangala 4th Block",
        end_location: "Electronic City Phase 1",
        start_time: new Date(Date.now() - 3600000 * 26).toISOString(),
        end_time: new Date(Date.now() - 3600000 * 25.1).toISOString(),
        distance: 16.2,
        duration: 35,
        average_speed: 27.8,
        max_speed: 58.0,
        risk_score: 24
    },
    {
        id: "TRIP-1003",
        start_location: "Indiranagar 100ft Rd",
        end_location: "Whitefield ITPL",
        start_time: new Date(Date.now() - 3600000 * 50).toISOString(),
        end_time: new Date(Date.now() - 3600000 * 49).toISOString(),
        distance: 14.8,
        duration: 42,
        average_speed: 21.1,
        max_speed: 49.5,
        risk_score: 45
    }
];

let lastSMSAlertTime = 0;
const ACCIDENT_SMS_COOLDOWN_MS = Number(process.env.ACCIDENT_SMS_COOLDOWN_MS) || 300000; // 5-minute cooldown between auto SMS alerts


// Explicit route handlers for root dashboard and GPS page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/gps.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "gps.html"));
});


// =====================================================
// PHONE GPS ENDPOINTS (/api/location & /api/gps)
// =====================================================

function syncToFastAPI(payload) {
    try {
        const data = JSON.stringify(payload);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 8000,
            path: '/api/location/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        });
        req.on('error', () => {}); // Silent catch if FastAPI backend is not running
        req.write(data);
        req.end();
    } catch (e) {}
}

app.post("/api/location", (req, res) => {
    const body = req.body || {};
    const lat = body.latitude ?? body.lat;
    const lng = body.longitude ?? body.lng ?? body.lon;
    const accuracy = body.accuracy ?? body.acc;
    const timestamp = body.timestamp;

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    vehicleLocation = {
        latitude: Number(lat),
        longitude: Number(lng),
        accuracy: accuracy ? Number(accuracy) : null,
        timestamp: timestamp ? (typeof timestamp === 'number' ? new Date(timestamp).toISOString() : String(timestamp)) : new Date().toISOString()
    };

    vehicleData.latitude = vehicleLocation.latitude;
    vehicleData.longitude = vehicleLocation.longitude;
    vehicleData.accuracy = vehicleLocation.accuracy;
    vehicleData.lastUpdate = vehicleLocation.timestamp;

    console.log(`📍 Phone GPS Updated: Lat ${vehicleLocation.latitude.toFixed(6)}, Lng ${vehicleLocation.longitude.toFixed(6)} (${new Date().toLocaleTimeString()})`);

    syncToFastAPI({
        latitude: vehicleLocation.latitude,
        longitude: vehicleLocation.longitude,
        accuracy: vehicleLocation.accuracy,
        speed: 0,
        heading: 0,
        altitude: 0,
        timestamp: vehicleLocation.timestamp
    });

    res.json({
        success: true,
        message: "Location updated",
        data: vehicleLocation
    });
});

app.get("/api/location", (req, res) => {
    if (!vehicleLocation.latitude) {
        return res.status(404).json({ error: "No location fix yet" });
    }
    res.json(vehicleLocation);
});

app.get("/api/gps", (req, res) => {
    res.json(vehicleLocation);
});


// =====================================================
// ESP32 MPU6500 TELEMETRY & HARDWARE IMPACT ENDPOINTS
// =====================================================

const handleESP32Telemetry = (req, res) => {
    try {
        console.log("================================");
        console.log("ESP32 TELEMETRY RECEIVED:");
        console.log(req.body);
        console.log("================================");

        const data = req.body || {};

        const raw_x =
            data.accel_x ??
            data.ax ??
            (data.acceleration && data.acceleration.x);

        const raw_y =
            data.accel_y ??
            data.ay ??
            (data.acceleration && data.acceleration.y);

        const raw_z =
            data.accel_z ??
            data.az ??
            (data.acceleration && data.acceleration.z);

        const raw_total =
            data.total_g ??
            data.totalG ??
            (data.acceleration && data.acceleration.total);

        const accel_x =
            raw_x !== undefined && raw_x !== null
                ? Number(raw_x)
                : 0;

        const accel_y =
            raw_y !== undefined && raw_y !== null
                ? Number(raw_y)
                : 0;

        const accel_z =
            raw_z !== undefined && raw_z !== null
                ? Number(raw_z)
                : 1.0;

        const total_g =
            raw_total !== undefined && raw_total !== null
                ? Number(raw_total)
                : Math.sqrt(
                    accel_x * accel_x +
                    accel_y * accel_y +
                    accel_z * accel_z
                  );

        const impact = Boolean(data.impact);

        const alert_active = Boolean(
            data.alert_active !== undefined
                ? data.alert_active
                : data.emergency
        );

        const isImpactDetected = Boolean(impact || alert_active);

        latestESP32Data = {
            hasData: true,
            device_id: data.device_id || "RG-001",

            accel_x: accel_x,
            accel_y: accel_y,
            accel_z: accel_z,

            total_g: total_g,

            impact: impact,
            alert_active: alert_active,

            uptime_ms: Number(data.uptime_ms) || 0,

            timestamp: new Date().toISOString()
        };

        vehicleData.ax = accel_x;
        vehicleData.ay = accel_y;
        vehicleData.az = accel_z;
        vehicleData.totalG = total_g;

        vehicleData.impact = impact;
        vehicleData.emergency = alert_active;
        vehicleData.lastUpdate = latestESP32Data.timestamp;

        if (isImpactDetected) {
            const accident_record = {
                id: accidents.length + 1,
                device_id: data.device_id || "RG-001",
                latitude: vehicleLocation.latitude,
                longitude: vehicleLocation.longitude,
                impact_magnitude: Number(total_g.toFixed(2)),
                timestamp: new Date().toISOString(),
                created_at: new Date().toISOString(),
                impact_level: total_g > 4.0 ? 'SEVERE' : total_g > 2.5 ? 'HIGH' : 'MODERATE',
                event_status: 'ACTIVE',
                risk_score: Math.min(100, Math.round(total_g * 25))
            };
            accidents.unshift(accident_record);
        }

        // Return HTTP 200 immediately to ESP32 to eliminate hardware delay
        res.status(200).json({
            success: true,
            message: "Telemetry received"
        });

        // Process TextBee Emergency SMS asynchronously with cooldown deduplication
        if (isImpactDetected && (Date.now() - lastSMSAlertTime >= ACCIDENT_SMS_COOLDOWN_MS)) {
            lastSMSAlertTime = Date.now();
            const accidentId = `ACC-ESP-${Date.now()}`;
            const accidentPayload = {
                accidentId,
                latitude: vehicleLocation.latitude,
                longitude: vehicleLocation.longitude,
                timestamp: new Date().toISOString(),
                severity: total_g > 4.0 ? "CRITICAL" : total_g > 2.5 ? "HIGH" : "MODERATE",
                vehicleId: data.device_id || "RG-001",
                driverName: "Driver"
            };

            console.log("🚨 ACCIDENT DETECTED FROM ESP32 TELEMETRY - Triggering Emergency SMS Pipeline:", accidentPayload);
            sendEmergencySMS(accidentPayload).then(result => {
                smsLogs.unshift({
                    id: smsLogs.length + 1,
                    accidentId: result.accidentId,
                    vehicleId: accidentPayload.vehicleId,
                    severity: accidentPayload.severity,
                    latitude: accidentPayload.latitude,
                    longitude: accidentPayload.longitude,
                    timestamp: new Date().toISOString(),
                    recipients: result.recipients,
                    status: result.success ? "SENT" : "FAILED"
                });
            }).catch(err => {
                console.error("[SMS] Async Emergency SMS error:", err.message);
            });
        }
    } catch (error) {
        console.error("ESP32 telemetry processing error:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "Processing failed" });
        }
    }
};

app.post("/api/esp32/data", handleESP32Telemetry);
app.post("/api/esp32", handleESP32Telemetry);

app.get("/api/esp32", (req, res) => {
    res.json(latestESP32Data);
});


// =====================================================
// TEXTBEE.DEV SMS API ENDPOINTS & CONFIGURATION
// =====================================================

app.get("/api/emergency/sms-status", (req, res) => {
    const apiKey = process.env.TEXTBEE_API_KEY || "";
    const deviceId = process.env.TEXTBEE_DEVICE_ID || "";
    const hasApiKey = Boolean(apiKey && apiKey.trim() !== "");
    
    const contact1 = process.env.EMERGENCY_CONTACT_1 || "";
    const contact2 = process.env.EMERGENCY_CONTACT_2 || "";
    const lastLog = smsLogs[0] || null;

    res.json({
        configured: hasApiKey,
        has_authkey: hasApiKey,
        fully_configured: hasApiKey,
        provider: "TextBee.dev",
        service: "SMS",
        status: hasApiKey ? "ONLINE" : "UNCONFIGURED",
        device_id: deviceId,
        contacts_count: [contact1, contact2].filter(Boolean).length,
        emergency_contact_1: maskPhone(contact1),
        emergency_contact_2: maskPhone(contact2),
        last_sms: lastLog ? {
            timestamp: lastLog.timestamp,
            status: lastLog.status,
            recipients_count: lastLog.recipients?.length || 0
        } : null,
        recent_logs: smsLogs.slice(0, 15)
    });
});

app.post("/api/emergency/send-sms", async (req, res) => {
    try {
        const {
            accidentId,
            latitude,
            longitude,
            timestamp,
            severity,
            vehicleId,
            driverName
        } = req.body || {};

        const lat = Number(latitude) || vehicleLocation.latitude || 12.908011;
        const lng = Number(longitude) || vehicleLocation.longitude || 76.380341;

        const result = await sendEmergencySMS({
            accidentId: accidentId || `ACC-${Date.now()}`,
            latitude: lat,
            longitude: lng,
            timestamp: timestamp || new Date().toISOString(),
            severity: severity || "CRITICAL",
            vehicleId: vehicleId || "RG-001",
            driverName: driverName || "Driver",
            accel_x: req.body?.accel_x ?? latestESP32Data.accel_x ?? 2.41,
            accel_y: req.body?.accel_y ?? latestESP32Data.accel_y ?? 1.83,
            accel_z: req.body?.accel_z ?? latestESP32Data.accel_z ?? 0.72,
            total_g: req.body?.total_g ?? latestESP32Data.total_g ?? 3.08,
            gyro_x: req.body?.gyro_x ?? latestESP32Data.gyro_x ?? 185,
            gyro_y: req.body?.gyro_y ?? latestESP32Data.gyro_y ?? 241,
            gyro_z: req.body?.gyro_z ?? latestESP32Data.gyro_z ?? 96
        });

        smsLogs.unshift({
            id: smsLogs.length + 1,
            accidentId: result.accidentId,
            vehicleId: vehicleId || "RG-001",
            severity: severity || "CRITICAL",
            latitude: lat,
            longitude: lng,
            timestamp: new Date().toISOString(),
            recipients: result.recipients,
            status: result.success ? "SENT" : "FAILED"
        });

        res.json(result);
    } catch (error) {
        console.error("[SMS] Emergency send endpoint error:", error);
        res.status(500).json({
            success: false,
            error: "SMS_PROVIDER_DISPATCH_FAILED",
            message: error.message
        });
    }
});

app.post("/api/emergency/test-sms", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ success: false, error: "Test SMS endpoint restricted in production environment" });
    }

    try {
        const recipient = req.body?.recipient || process.env.EMERGENCY_CONTACT_1;
        const lat = Number(req.body?.latitude) || vehicleLocation.latitude || 12.908011;
        const lng = Number(req.body?.longitude) || vehicleLocation.longitude || 76.380341;

        if (!recipient) {
            return res.status(400).json({
                success: false,
                error: "Recipient phone number or EMERGENCY_CONTACT_1 required"
            });
        }

        const result = await sendAccidentSMS({
            recipient,
            latitude: lat,
            longitude: lng,
            timestamp: new Date().toISOString(),
            severity: "CRITICAL",
            vehicleId: "RG-001",
            driverName: "SmartGuard Driver",
            accel_x: req.body?.accel_x ?? latestESP32Data.accel_x ?? 2.41,
            accel_y: req.body?.accel_y ?? latestESP32Data.accel_y ?? 1.83,
            accel_z: req.body?.accel_z ?? latestESP32Data.accel_z ?? 0.72,
            total_g: req.body?.total_g ?? latestESP32Data.total_g ?? 3.08,
            gyro_x: req.body?.gyro_x ?? latestESP32Data.gyro_x ?? 185,
            gyro_y: req.body?.gyro_y ?? latestESP32Data.gyro_y ?? 241,
            gyro_z: req.body?.gyro_z ?? latestESP32Data.gyro_z ?? 96
        });

        smsLogs.unshift({
            id: smsLogs.length + 1,
            accidentId: `TEST-${Date.now()}`,
            vehicleId: "RG-001",
            severity: "TEST",
            latitude: lat,
            longitude: lng,
            timestamp: new Date().toISOString(),
            recipients: [{ phone: maskPhone(recipient), status: result.success ? "sent" : "failed" }],
            status: result.success ? "SENT" : "FAILED"
        });

        res.json({
            success: result.success,
            message: result.success ? "SMART VEHICLES CONNECT AI TEST SMS initiated" : (result.error || "Test SMS failed"),
            error: result.error || undefined,
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// =====================================================
// VEHICLE & ACCIDENT DATA ENDPOINTS
// =====================================================

app.get("/api/vehicle", (req, res) => {
    res.json(vehicleData);
});

app.get("/api/accidents", (req, res) => {
    res.json({
        status: "success",
        count: accidents.length,
        accidents: accidents
    });
});

app.post("/api/accident", (req, res) => {
    const { latitude, longitude, impact_magnitude, speed, heading } = req.body || {};
    const total_g = Number(impact_magnitude) || 3.5;
    const accident_record = {
        id: accidents.length + 1,
        latitude: Number(latitude) || vehicleLocation.latitude,
        longitude: Number(longitude) || vehicleLocation.longitude,
        impact_magnitude: total_g,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        impact_level: total_g > 4.0 ? 'SEVERE' : total_g > 2.5 ? 'HIGH' : 'MODERATE',
        event_status: 'ACTIVE',
        risk_score: Math.min(100, Math.round(total_g * 25))
    };
    accidents.unshift(accident_record);

    // Trigger TextBee Emergency SMS on manual accident POST with cooldown protection
    if (Date.now() - lastSMSAlertTime >= ACCIDENT_SMS_COOLDOWN_MS) {
        lastSMSAlertTime = Date.now();
        sendEmergencySMS({
            accidentId: `ACC-MAN-${accident_record.id}`,
            latitude: accident_record.latitude,
            longitude: accident_record.longitude,
            timestamp: accident_record.timestamp,
            severity: accident_record.impact_level,
            vehicleId: "RG-001",
            driverName: "Driver"
        }).then(result => {
            smsLogs.unshift({
                id: smsLogs.length + 1,
                accidentId: result.accidentId,
                vehicleId: "RG-001",
                severity: accident_record.impact_level,
                latitude: accident_record.latitude,
                longitude: accident_record.longitude,
                timestamp: new Date().toISOString(),
                recipients: result.recipients,
                status: result.success ? "SENT" : "FAILED"
            });
        }).catch(() => {});
    }

    res.json({
        status: "success",
        message: "Accident recorded and TextBee emergency SMS alert initiated",
        accident_id: accident_record.id,
        data: accident_record
    });
});

app.delete("/api/accidents", (req, res) => {
    accidents = [];
    res.json({ status: "success", message: "Accidents cleared", count: 0 });
});

app.post("/api/accidents/clear", (req, res) => {
    accidents = [];
    res.json({ status: "success", message: "Accidents cleared", count: 0 });
});

// =====================================================
// TRIP HISTORY ENDPOINTS
// =====================================================

app.get("/api/history", (req, res) => {
    res.json(tripHistory);
});

app.post("/api/history/trip", (req, res) => {
    const body = req.body || {};
    const newTrip = {
        id: body.id || `TRIP-${1000 + tripHistory.length + 1}`,
        start_location: body.start_location || "Current Location",
        end_location: body.end_location || "Destination",
        start_time: body.start_time || new Date().toISOString(),
        end_time: body.end_time || new Date().toISOString(),
        distance: Number(body.distance) || 12.5,
        duration: Number(body.duration) || 25,
        average_speed: Number(body.average_speed) || 30,
        max_speed: Number(body.max_speed) || 55,
        risk_score: Number(body.risk_score) || 10
    };
    tripHistory.unshift(newTrip);
    res.json({ status: "success", message: "Trip recorded", trip: newTrip });
});

app.delete("/api/history", (req, res) => {
    tripHistory = [];
    res.json({ status: "success", message: "Trip history cleared", count: 0 });
});

// =====================================================
// GEMINI GENERAL-PURPOSE CONVERSATIONAL AI ENDPOINTS
// =====================================================

app.get("/api/ai/status", (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY || "";
    res.json({
        status: "operational",
        message: "Gemini service is ready",
        has_key: Boolean(apiKey)
    });
});

const handleAIChat = async (req, res) => {
    try {
        const { message, conversation_history, history, language, vehicle_context } = req.body || {};
        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ success: false, detail: "Message is required" });
        }

        // Live backend telemetry (unified with /api/esp32, /api/location, /api/vehicle)
        const liveData = {
            vehicleData,
            latestESP32Data,
            vehicleLocation,
            accidents,
            smsLogs,
            clientVehicleContext: vehicle_context
        };

        const responseText = await generateSmartResponse({
            message: message.trim(),
            conversationHistory: conversation_history || history || [],
            language: language || "auto",
            liveData
        });

        res.json({
            success: true,
            reply: responseText,
            response: responseText,
            message: "Chat response generated"
        });
    } catch (error) {
        console.error("AI Chat endpoint error:", error.message || error);
        res.status(500).json({ 
            success: false,
            detail: "AI processing error",
            response: "Sorry, I couldn't connect to Gemini right now. Please try again.",
            reply: "Sorry, I couldn't connect to Gemini right now. Please try again."
        });
    }
};

app.post("/api/ai/chat", handleAIChat);
app.post("/api/chat", handleAIChat);

app.post(["/api/ai/analyze-accident", "/api/analyze-accident"], async (req, res) => {
    try {
        const { accident_data } = req.body || {};
        const dataToAnalyze = accident_data || {
            location: vehicleLocation ? `Lat ${vehicleLocation.latitude}, Lng ${vehicleLocation.longitude}` : "Bangalore Expressway",
            speed: vehicleLocation?.speed || 48,
            impact_detected: true,
            total_g: (esp32Data && esp32Data.total_g) || 3.82,
            timestamp: new Date().toISOString()
        };

        const prompt = `Perform a comprehensive, professional automotive accident reconstruction and incident diagnosis based on the following real telemetry:
${JSON.stringify(dataToAnalyze, null, 2)}

Provide your response with clear markdown headings covering:
1. 💥 Incident Severity & Impact Classification
2. 🚗 Vehicle Dynamics & Kinematic Reconstruction (Speed, G-Force, Impact Angle)
3. 🔍 Probable Primary & Secondary Causes
4. 🛠️ Mechanical & Structural Damage Assessment
5. 🚨 Emergency Response & Safety Action Plan`;

        const result = await generateDynamicResponse(prompt, {
            vehicleData,
            latestESP32Data: esp32Data,
            vehicleLocation,
            accidents
        });

        res.json({
            message: "Accident analysis completed",
            data: {
                ai_analysis: result.response,
                source_data: dataToAnalyze,
                timestamp: new Date().toISOString()
            }
        });
    } catch (err) {
        console.error("Accident analysis error:", err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// TEXT-TO-SPEECH (TTS) ENDPOINT
// =====================================================
const { synthesizeSpeech } = require("./services/ttsService");

app.post("/api/tts", async (req, res) => {
    try {
        const { text, languageCode, voiceName, speakingRate, pitch } = req.body || {};
        if (!text || typeof text !== "string" || !text.trim()) {
            return res.status(400).json({ success: false, detail: "Text parameter is required." });
        }

        const result = await synthesizeSpeech({
            text: text.trim(),
            languageCode: languageCode || "kn-IN",
            voiceName,
            speakingRate: Number(speakingRate) || 1.0,
            pitch: Number(pitch) || 0.0
        });

        res.json(result);
    } catch (error) {
        console.error("TTS endpoint error:", error.message || error);
        res.status(500).json({
            success: false,
            detail: "TTS synthesis failed",
            error: error.message
        });
    }
});



// =====================================================
// ANALYTICS ENDPOINTS (/api/analytics)
// =====================================================
let analyticsStats = {
    drowsiness_events: 1,
    distraction_events: 2,
    high_risk_events: 0
};

app.get("/api/analytics", (req, res) => {
    const speed = (vehicleLocation && vehicleLocation.speed != null) ? Number(vehicleLocation.speed) : (vehicleData.speed || 0);
    const totalG = (esp32Data && esp32Data.total_g != null) ? Number(esp32Data.total_g) : 1.03;
    const isImpact = (esp32Data && esp32Data.impact) || false;
    const accidentCount = accidents ? accidents.length : 0;
    const totalTrips = tripHistory ? tripHistory.length : 3;

    // Calculate realistic average speed from trip history and current speed
    let avgSpeed = 31;
    if (tripHistory && tripHistory.length > 0) {
        const sum = tripHistory.reduce((acc, t) => acc + (Number(t.average_speed) || 0), 0);
        avgSpeed = Math.round((sum + (speed || 28)) / (tripHistory.length + 1));
    }

    // Dynamic risk score (0-100) responsive to G-force, alert status, and speed
    let currentRisk = 18;
    if (totalG > 2.0 || isImpact) currentRisk = 85;
    else if (totalG > 1.5) currentRisk = 55;
    else if (totalG > 1.2) currentRisk = 30;
    
    if (speed > 80) currentRisk += 20;
    else if (speed > 50) currentRisk += 10;
    
    if (esp32Data && esp32Data.alert_active) currentRisk += 25;
    currentRisk = Math.min(100, Math.max(5, currentRisk));

    res.json({
        total_trips: totalTrips,
        drowsiness_events: analyticsStats.drowsiness_events,
        distraction_events: analyticsStats.distraction_events,
        high_risk_events: analyticsStats.high_risk_events + (totalG > 1.5 ? 1 : 0),
        possible_accidents: accidentCount,
        average_risk_score: currentRisk,
        average_speed: avgSpeed,
        current_speed: speed,
        total_g: totalG,
        last_updated: new Date().toISOString()
    });
});

app.post("/api/analytics/event", (req, res) => {
    const { event_type } = req.body || {};
    if (event_type === "drowsiness") analyticsStats.drowsiness_events++;
    else if (event_type === "distraction") analyticsStats.distraction_events++;
    else if (event_type === "high_risk") analyticsStats.high_risk_events++;
    res.json({ success: true, stats: analyticsStats });
});

// =====================================================
// START SERVER
// =====================================================

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("=================================");
    console.log(" VEHICLE TRACKING SERVER");
    console.log("=================================");

    console.log(`Local: http://localhost:${PORT}`);
    console.log(`GPS Page: http://localhost:${PORT}/gps.html`);
    console.log(`ESP32 API: http://localhost:${PORT}/api/esp32`);
    console.log(`AI Chat API: http://localhost:${PORT}/api/chat`);
    console.log(`TTS API: http://localhost:${PORT}/api/tts`);
    console.log(`SMS Status API: http://localhost:${PORT}/api/emergency/sms-status`);

    console.log("");
    console.log("Use your laptop's Wi-Fi IP for");
    console.log("ESP32 and phone connections.");
    console.log("");
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`\n⚠️ Port ${PORT} is already in use by another running process.`);
        console.error("To free port 5000 in PowerShell, run:");
        console.error("Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force\n");
    } else {
        console.error("Server error:", err);
    }
});
