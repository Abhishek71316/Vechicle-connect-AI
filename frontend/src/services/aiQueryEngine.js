/**
 * Smart Vehicle Connect AI - Frontend AI Query Engine
 * Classifies user intent, inspects live vehicle telemetry, resolves conversation context,
 * generates specific responses across all domains without generic boilerplate repetition.
 */

const KANNADA_REGEX = /[\u0C80-\u0CFF]/;
const HINDI_DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;
const TELUGU_REGEX = /[\u0C00-\u0C7F]/;
const MALAYALAM_REGEX = /[\u0D00-\u0D7F]/;
const BENGALI_REGEX = /[\u0980-\u09FF]/;
const GUJARATI_REGEX = /[\u0A80-\u0AFF]/;
const PUNJABI_REGEX = /[\u0A00-\u0A7F]/;
const ARABIC_URDU_REGEX = /[\u0600-\u06FF]/;

export function detectLanguage(text = "", requestedLang = "auto") {
  if (requestedLang && requestedLang !== "auto" && requestedLang !== "English") {
    return requestedLang.toLowerCase();
  }
  const str = String(text);
  if (KANNADA_REGEX.test(str)) return "kannada";
  if (HINDI_DEVANAGARI_REGEX.test(str)) return "hindi";
  if (TAMIL_REGEX.test(str)) return "tamil";
  if (TELUGU_REGEX.test(str)) return "telugu";
  if (MALAYALAM_REGEX.test(str)) return "malayalam";
  if (BENGALI_REGEX.test(str)) return "bengali";
  if (GUJARATI_REGEX.test(str)) return "gujarati";
  if (PUNJABI_REGEX.test(str)) return "punjabi";
  if (ARABIC_URDU_REGEX.test(str)) return "urdu";
  return "english";
}

export function resolveTopicFromHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    let text = "";
    if (typeof item === "string") text = item;
    else if (item?.parts?.[0]?.text) text = item.parts[0].text;
    else if (item?.content) text = item.content;

    const tLower = text.toLowerCase();
    if (tLower.includes("mpu6500") || tLower.includes("mpu-6500") || tLower.includes("mpu 6500")) return "mpu6500";
    if (tLower.includes("accelerometer")) return "accelerometer";
    if (tLower.includes("gyroscope") || tLower.includes("gyro")) return "gyroscope";
    if (tLower.includes("gps") || tLower.includes("tracking") || tLower.includes("location")) return "gps";
    if (tLower.includes("accident") || tLower.includes("impact") || tLower.includes("collision")) return "accident";
    if (tLower.includes("sms") || tLower.includes("textbee") || tLower.includes("msg91")) return "sms";
    if (tLower.includes("driver") || tLower.includes("fatigue") || tLower.includes("drowsiness") || tLower.includes("camera")) return "driver_monitoring";
    if (tLower.includes("esp32")) return "esp32";
    if (tLower.includes("python")) return "python";
    if (tLower.includes("java")) return "java";
    if (tLower.includes("gravity")) return "gravity";
    if (tLower.includes("photosynthesis")) return "photosynthesis";
  }
  return null;
}

export function buildVehicleContext(liveData = {}) {
  const { vehicleData = {}, latestESP32Data = {}, vehicleLocation = {}, accidents = [], smsLogs = [] } = liveData;

  const esp32Connected = Boolean(latestESP32Data.hasData || (latestESP32Data.timestamp && Date.now() - new Date(latestESP32Data.timestamp).getTime() < 60000));
  const gpsFixAvailable = Boolean(vehicleLocation.latitude && vehicleLocation.longitude);

  return {
    esp32: {
      device_id: latestESP32Data.device_id || "RG-001",
      connected: esp32Connected,
      has_data: Boolean(latestESP32Data.hasData),
      accel_x: latestESP32Data.accel_x !== null && latestESP32Data.accel_x !== undefined ? latestESP32Data.accel_x : (vehicleData.ax ?? null),
      accel_y: latestESP32Data.accel_y !== null && latestESP32Data.accel_y !== undefined ? latestESP32Data.accel_y : (vehicleData.ay ?? null),
      accel_z: latestESP32Data.accel_z !== null && latestESP32Data.accel_z !== undefined ? latestESP32Data.accel_z : (vehicleData.az ?? null),
      total_g: latestESP32Data.total_g !== null && latestESP32Data.total_g !== undefined ? latestESP32Data.total_g : (vehicleData.totalG ?? null),
      impact: Boolean(latestESP32Data.impact || vehicleData.impact),
      alert_active: Boolean(latestESP32Data.alert_active || vehicleData.emergency),
      uptime_seconds: Math.round((latestESP32Data.uptime_ms || 0) / 1000),
      last_telemetry_timestamp: latestESP32Data.timestamp || vehicleData.lastUpdate || null
    },
    gps: {
      has_fix: gpsFixAvailable,
      latitude: vehicleLocation?.latitude ?? null,
      longitude: vehicleLocation?.longitude ?? null,
      accuracy: vehicleLocation?.accuracy ?? null,
      speed: vehicleLocation?.speed !== null && vehicleLocation?.speed !== undefined ? vehicleLocation.speed : null,
      heading: vehicleLocation?.heading ?? null,
      last_fix_timestamp: vehicleLocation?.timestamp ?? null
    },
    system: {
      accidents_count: Array.isArray(accidents) ? accidents.length : 0,
      sms_dispatched_count: Array.isArray(smsLogs) ? smsLogs.length : 0,
      emergency_mode: Boolean(latestESP32Data.alert_active || vehicleData.emergency)
    }
  };
}

export function generateDynamicResponse({
  message,
  conversationHistory = [],
  language = "auto",
  liveData = {}
}) {
  const userMessage = String(message || "").trim();
  const msgLower = userMessage.toLowerCase();
  const detectedLang = detectLanguage(userMessage, language);
  const resolvedTopic = resolveTopicFromHistory(conversationHistory);
  const vehicleContext = buildVehicleContext(liveData);
  const { esp32, gps } = vehicleContext;
  const { vehicleData = {}, latestESP32Data = {}, vehicleLocation = {} } = liveData;

  // KANNADA
  if (detectedLang === "kannada" || msgLower.includes("in kannada") || msgLower.includes("kannada")) {
    if (msgLower.includes("ಅಪಘಾತ") || msgLower.includes("accident") || msgLower.includes("detect")) {
      return `### ವಾಹನ ಅಪಘಾತ ಪತ್ತೆ ವಿಧಾನ (Accident Detection System)

**Smart Vehicles Connect AI** ವಾಹನ ಅಪಘಾತಗಳನ್ನು ಈ ಕೆಳಗಿನಂತೆ ನೈಜ ಸಮಯದಲ್ಲಿ ಪತ್ತೆ ಮಾಡುತ್ತದೆ:

1. **MPU6500 ಸೆನ್ಸಾರ್ ಮತ್ತು G-ಫೋರ್ಸ್ ಮಾಪನ:**
   - ವಾಹನದಲ್ಲಿ ಅಳವಡಿಸಲಾದ **ESP32** ಮತ್ತು **MPU6500 (3-Axis Accelerometer + Gyroscope)** ವಾಹನದ ಗತಿ ಮತ್ತು ಜಡತ್ವವನ್ನು ನಿರಂತರವಾಗಿ ಪರಿಶೀಲಿಸುತ್ತದೆ.
   - ಒಟ್ಟು ಜಡತ್ವ ಬಲ (Total G-Force) ಸೂತ್ರ: $\\text{Total G} = \\sqrt{a_x^2 + a_y^2 + a_z^2}$.
2. **ಅಪಘಾತದ ಮಿತಿಗಳು (Thresholds):**
   - **ಸಾಮಾನ್ಯ ಚಾಲನೆ:** $< 1.5\\text{ g}$
   - **ತೀವ್ರ ಜಡತ್ವ / ಸಂಭಾವ್ಯ ಘರ್ಷಣೆ:** $\\ge 2.5\\text{ g}$ (ಎಚ್ಚರಿಕೆ ನೀಡುತ್ತದೆ)
   - **ಗಂಭೀರ ಅಪಘಾತ (Severe Collision):** $> 4.0\\text{ g}$ (ಸ್ವಯಂಚಾಲಿತ ತುರ್ತು ಕಾರ್ಯಾಚರಣೆ)
3. **ಸ್ವಯಂಚಾಲಿತ ತುರ್ತು SMS ರವಾನೆ:**
   - ಅಪಘಾತ ಸಂಭವಿಸಿದ ತಕ್ಷಣ, ವಾಹನದ ನಿಖರ GPS ಅಕ್ಷಾಂಶ/ರೇಖಾಂಶ ಹಾಗೂ Google Maps ಲಿಂಕ್ ಅನ್ನು ನೋಂದಾಯಿತ ತುರ್ತು ಸಂಪರ್ಕ ಸಂಖ್ಯೆಗಳಿಗೆ TextBee/MSG91 ಗೇಟ್‌ವೇ ಮೂಲಕ SMS ಕಳುಹಿಸಲಾಗುತ್ತದೆ.`;
    }

    if (msgLower.includes("mpu6500") || msgLower.includes("mpu")) {
      return `### MPU6500 ಸಂವೇದಕ (MPU6500 Sensor Overview)

**MPU6500** ಎಂಬುದು ಅತ್ಯಾಧುನಿಕ **6-ಆಕ್ಸಿಸ್ ಮೋಷನ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಸಂವೇದಕವಾಗಿದೆ (6-Axis Motion Sensor)**:
- **3-ಆಕ್ಸಿಸ್ ಅಕ್ಸಿಲೆರೋಮೀಟರ್ (Accelerometer):** X, Y, Z ದಿಕ್ಕುಗಳಲ್ಲಿ ವಾಹನದ ರೇಖೀಯ ವೇಗವರ್ಧನೆ ಮತ್ತು ಗುರುತ್ವಾಕರ್ಷಣಾ ಬಲವನ್ನು (g) ಅಳೆಯುತ್ತದೆ.
- **3-ಆಕ್ಸಿಸ್ ಗೈರೊಸ್ಕೋಪ್ (Gyroscope):** ವಾಹನದ ಕೋನೀಯ ತಿರುಗುವಿಕೆ ವೇಗವನ್ನು ($^\\circ/s$) ಅಳೆಯುತ್ತದೆ.
- **ಬಳಕೆ:** ಅಪಘಾತಗಳ ತೀವ್ರತೆ, ಅನಿರೀಕ್ಷಿತ ಬ್ರೇಕಿಂಗ್, ಮತ್ತು ವಾಹನ ಪಲ್ಟಿಯಾಗುವುದನ್ನು (Roll/Pitch) ಪತ್ತೆಹಚ್ಚಲು ಇದನ್ನು ಬಳಸಲಾಗುತ್ತದೆ.`;
    }

    if (msgLower.includes("ವೇಗ") || msgLower.includes("speed")) {
      if (vehicleLocation.latitude && vehicleLocation.speed !== undefined) {
        return `ಪ್ರಸ್ತುತ ವಾಹನದ ಲೈವ್ ವೇಗ: **${vehicleLocation.speed} km/h**.\n- GPS ಅಕ್ಷಾಂಶ: ${vehicleLocation.latitude}\n- ರೇಖಾಂಶ: ${vehicleLocation.longitude}`;
      }
      return `ಪ್ರಸ್ತುತ ವಾಹನದ ಲೈವ್ GPS ವೇಗ ಲಭ್ಯವಿಲ್ಲ (ಲೈವ್ ಟೆಲಿಮೆಟ್ರಿ ಕನೆಕ್ಟ್ ಆಗಿಲ್ಲ ಅಥವಾ ವೇಗ 0 km/h ಆಗಿದೆ).`;
    }

    if (msgLower.includes("gps") || msgLower.includes("ಟ್ರ್ಯಾಕಿಂಗ್") || msgLower.includes("ಸ್ಥಳ")) {
      return `### GPS ವಾಹನ ಟ್ರ್ಯಾಕಿಂಗ್ ವ್ಯವಸ್ಥೆ (GPS Tracking)

- **ಕಾರ್ಯವಿಧಾನ:** ಸ್ಮಾರ್ಟ್‌ಫೋನ್ / GPS ಮಾಡ್ಯೂಲ್ ಮೂಲಕ ಉಪಗ್ರಹ ಸಂಪರ್ಕ ಪಡೆದು ನೈಜ ಸಮಯದಲ್ಲಿ ವಾಹನದ ಅಕ್ಷಾಂಶ (Latitude) ಮತ್ತು ರೇಖಾಂಶವನ್ನು (Longitude) ಪಡೆಯಲಾಗುತ್ತದೆ.
- **ಮ್ಯಾಪ್ ಪ್ರದರ್ಶನ:** Leaflet ಮತ್ತು OpenStreetMap ಮೂಲಕ ವಾಹನದ ಚಲನೆಯ ಮಾರ್ಗ ಮತ್ತು ವೇಗವನ್ನು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ನೈಜ ಸಮಯದಲ್ಲಿ ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತದೆ.
- **ತುರ್ತು ಲಿಂಕ್:** ಅಪಘಾತವಾದಾಗ ತಕ್ಷಣ Google Maps ಲೈವ್ ಲಿಂಕ್ ಜನರೇಟ್ ಆಗುತ್ತದೆ.`;
    }

    if (msgLower.includes("python") || msgLower.includes("ಪೈಥಾನ್")) {
      return `**Python (ಪೈಥಾನ್)** ಒಂದು ಜನಪ್ರಿಯ, ಸುಲಭವಾಗಿ ಕಲಿಯಬಹುದಾದ ಹೈ-ಲೆವೆಲ್ ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಭಾಷೆಯಾಗಿದೆ. ಇದನ್ನು ವೆಬ್ ಡೆವಲಪ್‌ಮೆಂಟ್, ಆರ್ಟಿಫಿಶಿಯಲ್ ಇಂಟೆಲಿಜೆನ್ಸ್ (AI), ಮೆಷಿನ್ ಲರ್ನಿಂಗ್, ಮತ್ತು ಡೇಟಾ ಸೈನ್ಸ್ ಕ್ಷೇತ್ರಗಳಲ್ಲಿ ವ್ಯಾಪಕವಾಗಿ ಬಳಸಲಾಗುತ್ತದೆ.`;
    }

    return `### SmartGuard AI ಸಹಾಯಕಿ (ಕನ್ನಡ)
ನಿಮ್ಮ ಪ್ರಶ್ನೆ: **"${userMessage}"**

ವಾಹನ ಸುರಕ್ಷತೆ, MPU6500 ಸೆನ್ಸಾರ್, GPS ಟ್ರ್ಯಾಕಿಂಗ್, ಅಪಘಾತ ಪತ್ತೆ, ಅಥವಾ ಯಾವುದೇ ತಾಂತ್ರಿಕ/ಸಾಮಾನ್ಯ ವಿಷಯಗಳ ಕುರಿತು ನೀವು ಇನ್ನಷ್ಟು ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಬಹುದು.`;
  }

  // HINDI
  if (detectedLang === "hindi" || msgLower.includes("in hindi")) {
    if (msgLower.includes("accident") || msgLower.includes("दुर्घटना") || msgLower.includes("detect")) {
      return `### वाहन दुर्घटना पहचान प्रणाली (Accident Detection System)

**Smart Vehicles Connect AI** में दुर्घटना की पहचान निम्न प्रकार से होती है:

1. **MPU6500 और ESP32 सेंसर:** वाहन में लगा 6-एक्सिस MPU6500 मोशन सेंसर X, Y, Z दिशाओं में G-बल को मापता है।
2. **इम्पैक्ट थ्रेशोल्ड (Thresholds):**
   - सामान्य ड्राइविंग: $< 1.5\\text{ g}$
   - संभावित प्रभाव / चेतावनी: $\\ge 2.5\\text{ g}$
   - गंभीर टक्कर (Severe Crash): $> 4.0\\text{ g}$
3. **आपातकालीन SMS अलर्ट:** गंभीर प्रभाव का पता चलते ही वाहन का सटीक GPS लोकेशन और Google Maps लिंक आपातकालीन संपर्कों को स्वचालित रूप से भेज दिया जाता है।`;
    }

    if (msgLower.includes("mpu6500") || msgLower.includes("mpu")) {
      return `### MPU6500 सेंसर क्या है?

**MPU6500** एक 6-एक्सिस मोशन ट्रैकिंग सेंसर है जिसमें:
- **3-एक्सिस एक्सेलेरोमीटर:** वाहन के त्वरण और प्रभाव बल (G-force) को मापता है।
- **3-एक्सिस जायरोस्कोप:** वाहन के घूमने की गति को मापता है।
इसका उपयोग मुख्य रूप से अचानक ब्रेक लगाने, तेज मोड़ और वाहन दुर्घटना का पता लगाने के लिए किया जाता है।`;
    }

    if (msgLower.includes("गति") || msgLower.includes("रफ्तार") || msgLower.includes("speed")) {
      if (vehicleLocation.latitude) {
        return `वर्तमान वाहन की GPS गति: **${vehicleLocation.speed || 0} km/h** है।\n- अक्षांश: ${vehicleLocation.latitude}\n- देशांतर: ${vehicleLocation.longitude}`;
      }
      return `वर्तमान में लाइव वाहन गति उपलब्ध नहीं है (GPS टेलीमेट्री अभी कनेक्ट नहीं हुई है)।`;
    }
  }

  // -------------------------------------------------------------
  // LIVE VEHICLE STATUS & TELEMETRY QUESTIONS
  // -------------------------------------------------------------
  if (
    msgLower.includes("vehicle speed") ||
    msgLower.includes("what is the speed") ||
    msgLower.includes("how fast is the vehicle") ||
    msgLower.includes("what is my speed") ||
    msgLower.includes("what is my vehicle speed") ||
    msgLower.includes("my speed") ||
    msgLower.includes("current speed") ||
    msgLower.includes("car speed") ||
    msgLower.includes("speed of the vehicle") ||
    msgLower.includes("speed of vehicle") ||
    (resolvedTopic === "gps" && msgLower.includes("speed"))
  ) {
    if (gps.has_fix && gps.speed !== null) {
      const speed = Number(gps.speed || 0).toFixed(1);
      return `### Live Vehicle Speed & GPS Status

- **Current Speed:** **${speed} km/h**
- **GPS Coordinates:** Latitude \`${Number(gps.latitude).toFixed(6)}\`, Longitude \`${Number(gps.longitude).toFixed(6)}\`
- **GPS Accuracy:** ${gps.accuracy ? `±${gps.accuracy} m` : "Normal"}
- **Last Fix Timestamp:** ${gps.last_fix_timestamp ? new Date(gps.last_fix_timestamp).toLocaleTimeString() : "Live"}`;
    }
    return `### Live Vehicle Speed
Currently, there is **no active GPS connection** transmitting live speed data. 
- Ensure your phone or GPS transmitter is broadcasting location coordinates to \`POST /api/location\`.
- Once connected, live speed and coordinates will be reported automatically.`;
  }

  if (
    msgLower.includes("is there an impact") ||
    msgLower.includes("impact detected") ||
    msgLower.includes("any impact") ||
    msgLower.includes("impact status") ||
    msgLower.includes("has an accident occurred") ||
    msgLower.includes("is vehicle impacted")
  ) {
    const isImpact = esp32.impact || Number(esp32.total_g || 0) >= 2.5;
    if (esp32.connected && esp32.total_g !== null) {
      return `### Live Impact & Collision Status

- **Impact Detected:** ${isImpact ? "🚨 **YES — ACTIVE IMPACT DETECTED**" : "🟢 **NO — NORMAL CONDITIONS (No Impact)**"}
- **Current Total G-Force:** **\`${Number(esp32.total_g).toFixed(2)} g\`** (Threshold: Normal $<1.5g$, Impact $\\ge 2.5g$, Severe $>4.0g$)
- **Alert Active:** ${esp32.alert_active ? "🚨 Active" : "🟢 Standby"}
- **Device ID:** \`${esp32.device_id}\`
- **Last Telemetry Update:** ${esp32.last_telemetry_timestamp ? new Date(esp32.last_telemetry_timestamp).toLocaleTimeString() : "Live"}`;
    }
    return `### Live Impact Status
- **Impact Status:** 🟢 **No Impact Registered** (ESP32 telemetry is currently awaiting live hardware stream).
- **Threshold Reference:** Collision alert triggers at $\\ge 2.5\\text{ g}$, severe crash at $> 4.0\\text{ g}$.`;
  }

  if (
    msgLower.includes("current acceleration") ||
    msgLower.includes("current g-force") ||
    msgLower.includes("current g force") ||
    msgLower.includes("what is the acceleration") ||
    msgLower.includes("acceleration of vehicle") ||
    msgLower.includes("current sensor data") ||
    msgLower.includes("sensor data right now") ||
    msgLower.includes("explain my sensor data")
  ) {
    const ax = esp32.accel_x;
    const ay = esp32.accel_y;
    const az = esp32.accel_z;
    const totalG = esp32.total_g;

    if (ax !== null && ax !== undefined) {
      const isImpact = esp32.impact || Number(totalG) >= 2.5;
      return `### Live MPU6500 Sensor Telemetry

- **X-Axis Acceleration:** \`${Number(ax).toFixed(2)} g\` (Lateral / Side-to-side force)
- **Y-Axis Acceleration:** \`${Number(ay).toFixed(2)} g\` (Longitudinal / Acceleration & Braking force)
- **Z-Axis Acceleration:** \`${Number(az).toFixed(2)} g\` (Vertical force / Gravity vector)
- **Total Magnitude (Total G):** **\`${Number(totalG || 1.0).toFixed(2)} g\`**
- **Impact Status:** ${isImpact ? "🚨 **IMPACT / EMERGENCY DETECTED**" : "🟢 **NORMAL DRIVING DYNAMICS**"}
- **Device ID:** \`${esp32.device_id || "RG-001"}\`
- **Last Update:** ${esp32.last_telemetry_timestamp ? new Date(esp32.last_telemetry_timestamp).toLocaleTimeString() : "Active"}`;
    }
    return `### Live MPU6500 Telemetry Status
The ESP32 MPU6500 sensor is currently **awaiting telemetry** (no active hardware packets received on \`/api/esp32\` yet).
- To stream sensor readings, ensure your ESP32 is powered and connected to the server IP.
- Threshold Reference: Normal Driving $< 1.5\\text{ g}$, Impact Warning $\\ge 2.5\\text{ g}$, Severe Crash $> 4.0\\text{ g}$.`;
  }

  if (
    msgLower.includes("esp32 status") ||
    msgLower.includes("current esp32") ||
    msgLower.includes("is esp32 online") ||
    msgLower.includes("is my esp32 connected")
  ) {
    if (esp32.connected) {
      return `### ESP32 Telemetry Device Status

- **Status:** 🟢 **ONLINE & STREAMING**
- **Device ID:** \`${esp32.device_id || "RG-001"}\`
- **Total G-Force:** \`${Number(esp32.total_g || 1.0).toFixed(2)} g\`
- **Uptime:** ${esp32.uptime_seconds} seconds
- **Last Packet Received:** ${esp32.last_telemetry_timestamp ? new Date(esp32.last_telemetry_timestamp).toLocaleTimeString() : "Just now"}`;
    }
    return `### ESP32 Hardware Status
- **Status:** 🟡 **AWAITING CONNECTION / OFFLINE**
- **Expected Ingestion Endpoint:** \`POST http://<SERVER_IP>:5000/api/esp32\`
- **Troubleshooting:**
  1. Check that the ESP32 is powered on and connected to the same Wi-Fi network.
  2. Verify that \`BACKEND_HOST\` in the Arduino code matches your computer's local IP.
  3. Inspect serial monitor at **115200 baud**.`;
  }

  if (
    msgLower.includes("check vehicle safety") ||
    msgLower.includes("vehicle safety status") ||
    msgLower.includes("is my vehicle safe")
  ) {
    const isImpact = esp32.impact;
    const totalG = Number(esp32.total_g || 1.0);
    return `### Vehicle Safety Assessment

- **Overall Status:** ${isImpact || totalG >= 2.5 ? "🚨 **ALERT: High G-Force / Impact Detected**" : "🟢 **SAFE: Normal Operating Conditions**"}
- **Total G-Force Reading:** \`${totalG.toFixed(2)} g\` (Safe threshold is $< 2.5\\text{ g}$)
- **Emergency Alert State:** ${esp32.alert_active ? "🚨 ACTIVE ALERT" : "🟢 NORMAL"}
- **GPS Fix:** ${gps.has_fix ? `🟢 Active (${Number(gps.latitude).toFixed(4)}, ${Number(gps.longitude).toFixed(4)})` : "🟡 No GPS Fix"}
- **Safety Recommendations:**
  1. Maintain safe following distance and obey speed limits.
  2. Ensure driver camera monitoring is active to prevent drowsy driving.`;
  }

  // MPU6500 SENSOR
  if (
    msgLower.includes("what is mpu6500") ||
    msgLower.includes("what is the mpu6500") ||
    msgLower.includes("explain mpu6500") ||
    msgLower.includes("what is mpu-6500") ||
    (resolvedTopic === "mpu6500" && (msgLower.includes("what is it") || msgLower.includes("explain it")))
  ) {
    return `### MPU6500 Motion Tracking Sensor

The **MPU6500** is an integrated 6-axis MotionTracking device combining a 3-axis gyroscope and a 3-axis accelerometer in a small $3\\times 3\\times 0.9\\text{ mm}$ QFN package.

### Key Specifications:
1. **3-Axis Accelerometer:**
   - Measures linear acceleration and gravity along X, Y, and Z axes.
   - Programmable Full-Scale Ranges: $\\pm 2g, \\pm 4g, \\pm 8g, \\pm 16g$.
   - 16-bit analog-to-digital converters (ADCs) for precise G-force sensing.
2. **3-Axis Gyroscope:**
   - Measures rotational angular velocity.
   - Programmable Full-Scale Ranges: $\\pm 250, \\pm 500, \\pm 1000, \\pm 2000^\\circ/\\text{sec}$.
3. **Role in Smart Vehicles Connect AI:**
   - Calculates **Total G-Force** using $\\sqrt{a_x^2 + a_y^2 + a_z^2}$.
   - Detects severe collisions ($>4.0g$), sudden emergency braking, and vehicle rollover events to trigger automatic emergency dispatch.`;
  }

  // ACCELEROMETER VS GYROSCOPE
  if (
    msgLower.includes("accelerometer and gyroscope") ||
    msgLower.includes("difference between accelerometer and gyroscope") ||
    msgLower.includes("accelerometer vs gyroscope")
  ) {
    return `### Difference Between Accelerometer and Gyroscope

| Feature | Accelerometer | Gyroscope |
| :--- | :--- | :--- |
| **Measurement** | Linear acceleration & gravity vector ($g$ or $\\text{m/s}^2$). | Angular velocity / rate of rotation ($^\\circ/\\text{s}$ or $\\text{rad/s}$). |
| **Axes** | 3 axes: X (lateral), Y (longitudinal), Z (vertical). | 3 axes: Roll (X-axis), Pitch (Y-axis), Yaw (Z-axis). |
| **What it Detects** | Sudden braking, rapid acceleration, impacts/collisions. | Vehicle cornering, swerving, drifting, and rollovers. |
| **Reference** | Measured relative to earth's gravitational field ($1.0g$). | Measured relative to rotational motion (zero when stationary). |
| **In this Project** | Calculates collision G-force magnitude for accident alerts. | Analyzes vehicle orientation stability and sharp turns. |`;
  }

  // WHAT DOES ACCELEROMETER MEASURE
  if (
    msgLower.includes("what does the accelerometer measure") ||
    msgLower.includes("what does accelerometer measure") ||
    msgLower.includes("what does an accelerometer measure")
  ) {
    return `### What an Accelerometer Measures

An **accelerometer** measures proper acceleration (the rate of change of velocity relative to freefall):

1. **Linear Acceleration:** Measures acceleration changes when a vehicle speeds up, slows down, or swerves.
2. **Static Gravity Vector:** When stationary, it measures the Earth's gravitational pull ($1.0g = 9.81\\text{ m/s}^2$) on the Z-axis, helping determine tilt angle.
3. **Dynamic Shock & Impact:** During an impact or collision, the accelerometer registers sudden spikes in G-force (e.g. $3g - 15g+$) within milliseconds.
4. **Formula for Total G-Force:**
   $$\\text{Total G} = \\sqrt{a_x^2 + a_y^2 + a_z^2}$$`;
  }

  // TOTAL G
  if (
    msgLower.includes("what does total g mean") ||
    msgLower.includes("what is total g") ||
    msgLower.includes("total g force")
  ) {
    return `### Understanding Total G-Force

**Total G** represents the resultant vector magnitude of acceleration acting on the vehicle across all 3 spatial axes:

$$\\text{Total G} = \\sqrt{a_x^2 + a_y^2 + a_z^2}$$

### Safety Thresholds in Smart Vehicles Connect AI:
- **$1.0\\text{ g}$ (Baseline):** Stationary vehicle experiencing standard Earth gravity.
- **$< 1.5\\text{ g}$ (Normal Driving):** Smooth cruising, standard braking, and gentle turns.
- **$2.5\\text{ g} - 4.0\\text{ g}$ (Moderate Impact / Warning):** Harsh speed bumps, potholes, or heavy collision warning.
- **$> 4.0\\text{ g}$ (Severe Collision):** Severe accident event triggering immediate automated emergency SMS dispatch with GPS location.`;
  }

  // ACCIDENT DETECTION
  if (
    msgLower.includes("how does accident detection work") ||
    msgLower.includes("how does accident detection") ||
    msgLower.includes("accident detection") ||
    msgLower.includes("detect accident") ||
    msgLower.includes("detect an accident") ||
    msgLower.includes("detects accident") ||
    (msgLower.includes("accident") && msgLower.includes("detect")) ||
    (resolvedTopic === "mpu6500" && msgLower.includes("accident"))
  ) {
    return `### How Accident Detection Works in Smart Vehicles Connect AI

The accident detection pipeline operates in four coordinated stages:

1. **Continuous Telemetry Sampling:**
   - The **MPU6500** sensor samples 3-axis acceleration ($a_x, a_y, a_z$) and rotational velocity at high frequency.
   - The **ESP32** microcontroller computes the resultant G-force vector in real time.
2. **Impact Threshold Evaluation:**
   - If $\\text{Total G} \\ge 2.5\\text{ g}$, a **Moderate Impact** state is flagged.
   - If $\\text{Total G} > 4.0\\text{ g}$, a **Critical Collision** event is registered.
3. **Emergency Actuation:**
   - Local alarms (buzzer, LEDs) activate to notify the driver.
   - Hardware telemetry flags are sent via HTTP POST to the backend.
4. **Automated Emergency Dispatch:**
   - The backend captures the latest smartphone GPS coordinates.
   - An automated emergency SMS is sent via the **TextBee / MSG91** gateway to pre-configured family contacts (\`EMERGENCY_CONTACT_1\`, \`EMERGENCY_CONTACT_2\`) containing the severity, vehicle ID, timestamp, and a direct Google Maps link.`;
  }

  // GPS TRACKING
  if (
    msgLower.includes("how does gps tracking work") ||
    msgLower.includes("how does gps") ||
    msgLower.includes("what is gps") ||
    msgLower.includes("gps tracking")
  ) {
    return `### How GPS Tracking Works in Smart Vehicles Connect AI

1. **Coordinate Acquisition:**
   - The vehicle tracking interface uses the HTML5 Geolocation API (\`navigator.geolocation.watchPosition\`) or dedicated GPS hardware to capture live coordinates:
     - **Latitude & Longitude**
     - **Accuracy Radius (meters)**
     - **Speed (km/h) & Heading (degrees)**
2. **Live Backend Synchronization:**
   - Position packets stream to \`POST /api/location\` and are distributed to client dashboards in real time.
3. **Interactive Map Visualization:**
   - The frontend renders an interactive **Leaflet / OpenStreetMap** map with 3 switchable visual modes (**Cyber Dark**, **Street View**, **Satellite View**).
   - Draws a polyline breadcrumb route tracking the vehicle's entire journey.
4. **Emergency Location Sharing:**
   - During collisions or manual SOS, generates clickable Google Maps links (\`https://maps.google.com/?q=lat,lng\`) sent via SMS to emergency responders.`;
  }

  // SMS EMERGENCY ALERTS
  if (
    msgLower.includes("how does emergency sms work") ||
    msgLower.includes("sms emergency alert") ||
    msgLower.includes("emergency sms") ||
    msgLower.includes("textbee") ||
    msgLower.includes("msg91")
  ) {
    return `### How Emergency SMS Alerts Work

When an accident ($>2.5g$) or manual SOS is triggered, the automated SMS pipeline executes:

1. **Trigger Source:** MPU6500 high-G impact or manual SOS button on the dashboard.
2. **Payload Assembly:** Gathers Vehicle ID (\`RG-001\`), collision severity (\`CRITICAL\` / \`HIGH\`), G-force values, exact GPS coordinates, and Google Maps URL.
3. **SMS Dispatch Gateway:** Sends HTTP requests to the **TextBee.dev / MSG91** API gateway using backend credentials stored securely in \`.env\`.
4. **Recipients:** Dispatches SMS messages to \`EMERGENCY_CONTACT_1\` and \`EMERGENCY_CONTACT_2\`.
5. **Cooldown Deduplication:** Uses a 5-minute (\`300,000 ms\`) cooldown to prevent accidental duplicate SMS floods for a single incident.`;
  }

  // DRIVER MONITORING
  if (
    msgLower.includes("driver monitoring") ||
    msgLower.includes("drowsiness") ||
    msgLower.includes("fatigue") ||
    msgLower.includes("driver camera")
  ) {
    return `### Driver Monitoring System (DMS)

The Driver Monitoring System utilizes computer vision to identify driver impairment in real time:

1. **Facial Landmark Tracking:** OpenCV and MediaPipe track 468 3D facial landmarks.
2. **Eye Aspect Ratio (EAR):**
   $$\\text{EAR} = \\frac{||p_2 - p_6|| + ||p_3 - p_5||}{2 ||p_1 - p_4||}$$
   - When $\\text{EAR} < 0.25$ for more than $0.7\\text{ seconds}$, prolonged eye closure is detected.
3. **Metrics Monitored:**
   - **Blink Rate & PERCLOS** (percentage of eye closure over time).
   - **Yawning Detection** (Mouth Aspect Ratio MAR).
   - **Head Pose Estimation** (Pitch, Yaw, Roll to detect distraction / looking away).
   - **Fatigue Score & Drowsiness Level** (\`LOW\`, \`MEDIUM\`, \`HIGH\`, \`CRITICAL\`).
4. **Alerts:** Triggers auditory alarms when severe drowsiness or prolonged distraction occurs.`;
  }

  // ESP32 TROUBLESHOOTING
  if (
    msgLower.includes("troubleshoot esp32") ||
    msgLower.includes("why is my esp32 telemetry not updating") ||
    msgLower.includes("esp32 not updating") ||
    msgLower.includes("esp32 connection")
  ) {
    return `### ESP32 Telemetry Troubleshooting Guide

If your ESP32 telemetry is not updating on the dashboard, follow these steps:

1. **Check Wi-Fi Network & IP Configuration:**
   - Ensure the ESP32 and your computer are on the **same Wi-Fi network**.
   - Verify that \`BACKEND_HOST\` in your \`.ino\` sketch is set to your computer's local Wi-Fi IP (e.g. \`"192.168.1.100"\`), not \`"localhost"\`.
2. **Verify Server Status:**
   - Make sure your Node.js backend is running on port 5000 (\`node server.js\`).
   - Test accessibility in your browser: \`http://localhost:5000/api/esp32\`.
3. **Check MPU6500 I2C Wiring:**
   - **VCC** $\\to$ ESP32 **3.3V** (or 5V if module has regulator).
   - **GND** $\\to$ ESP32 **GND**.
   - **SDA** $\\to$ ESP32 **GPIO 21**.
   - **SCL** $\\to$ ESP32 **GPIO 22**.
4. **Inspect Serial Monitor:**
   - Open Arduino IDE Serial Monitor at **115200 baud** to check for Wi-Fi connection status and HTTP response codes (\`200 OK\`).`;
  }

  // EXPLAIN PROJECT
  if (
    msgLower.includes("explain my project") ||
    msgLower.includes("explain this project") ||
    msgLower.includes("what is smart vehicles connect ai") ||
    msgLower.includes("project overview")
  ) {
    return `### Smart Vehicles Connect AI — Platform Overview

**Smart Vehicles Connect AI** is an intelligent vehicle safety, IoT telemetry monitoring, accident detection, and emergency response ecosystem.

### Core Architectural Layers:
1. **IoT & Hardware Layer:**
   - **ESP32 Microcontroller:** High-speed sensor data aggregation and Wi-Fi streaming.
   - **MPU6500 Sensor:** 6-axis accelerometer & gyroscope measuring real-time G-force dynamics.
2. **Mobile & Vision Layer:**
   - **Smartphone GPS Transmitter:** Live high-accuracy coordinate streaming.
   - **Driver Camera Monitoring:** Computer vision detection of drowsiness, eye closure (EAR), yawning, and distraction.
3. **Backend & Risk Processing:**
   - **Risk Assessment Engine:** Multi-factor safety scoring (0-100).
   - **Automated Emergency Pipeline:** Collision detection trigger dispatches SMS alerts with GPS location via TextBee/MSG91.
4. **User & Emergency Dashboards:**
   - Interactive Leaflet tracking maps, live G-force gauges, accident history logs, and multilingual Gemini AI companion.`;
  }

  // PYTHON
  if (msgLower.includes("what is python") || (resolvedTopic === "python" && (msgLower.includes("what is it") || msgLower.includes("explain it")))) {
    return `### Python Programming Language

**Python** is a high-level, interpreted, general-purpose programming language created by **Guido van Rossum** and first released in 1991.

### Key Characteristics:
- **Readable Syntax:** Emphasizes code readability using whitespace indentation instead of curly braces.
- **Dynamically Typed & Garbage Collected:** Automatically manages data types and memory allocation.
- **Multiparadigm:** Supports Object-Oriented, Functional, and Procedural programming styles.
- **Massive Ecosystem:**
  - **AI & Data Science:** PyTorch, TensorFlow, Pandas, NumPy, Scikit-Learn.
  - **Web Development:** FastAPI, Django, Flask.
  - **Automation & Scripting:** Selenium, Requests, Beautiful Soup.

\`\`\`python
# Example: Simple Python Function
def calculate_kinetic_energy(mass_kg: float, velocity_mps: float) -> float:
    """Calculate kinetic energy: E = 0.5 * m * v^2"""
    return 0.5 * mass_kg * (velocity_mps ** 2)

print(f"Energy: {calculate_kinetic_energy(1200, 20):.2f} Joules")
\`\`\``;
  }

  // JAVA
  if (
    msgLower.includes("how do i learn java") ||
    msgLower.includes("how to learn java") ||
    msgLower.includes("learn java") ||
    msgLower.includes("what is java")
  ) {
    return `### Roadmap to Learning Java

**Java** is a robust, class-based, object-oriented programming language designed to have as few implementation dependencies as possible ("Write Once, Run Anywhere").

### Structured Learning Path:
1. **Core Fundamentals:**
   - Syntax, data types, control flow (\`if/else\`, \`switch\`, \`loops\`).
   - Methods, arrays, and string manipulation.
2. **Object-Oriented Programming (OOP):**
   - **Encapsulation:** Classes, objects, access modifiers (\`private\`, \`public\`, \`protected\`).
   - **Inheritance:** \`extends\` keyword, method overriding.
   - **Polymorphism:** Method overloading and dynamic method dispatch.
   - **Abstraction:** Abstract classes and \`interface\`.
3. **Java Collections Framework:**
   - \`List\` (\`ArrayList\`, \`LinkedList\`), \`Set\` (\`HashSet\`), \`Map\` (\`HashMap\`).
4. **Exception Handling & File I/O:**
   - \`try-catch-finally\`, custom exceptions, Streams API.
5. **Modern Frameworks:**
   - Spring Boot for backend microservices and REST APIs.

\`\`\`java
// Example: Reversing a String in Java
public class ReverseString {
    public static void main(String[] args) {
        String original = "SmartVehicles";
        String reversed = new StringBuilder(original).reverse().toString();
        System.out.println("Reversed: " + reversed);
    }
}
\`\`\``;
  }

  // GRAVITY
  if (
    msgLower.includes("what is gravity") ||
    msgLower.includes("explain gravity") ||
    (resolvedTopic === "gravity" && msgLower.includes("explain"))
  ) {
    return `### What is Gravity?

**Gravity** is a fundamental interaction in physics that causes mutual attraction between all things with mass or energy.

### 1. Classical Newtonian Mechanics:
Sir Isaac Newton formulated that every particle attracts every other particle with a force directly proportional to the product of their masses and inversely proportional to the square of the distance between their centers:
$$F = G \\frac{m_1 m_2}{r^2}$$
- **$G$:** Gravitational constant ($6.67430 \\times 10^{-11}\\text{ N}\\cdot\\text{m}^2/\\text{kg}^2$).
- **Earth's Surface Acceleration ($g$):** $\\approx 9.81\\text{ m/s}^2$ (equivalent to $1.0g$ measured on accelerometers).

### 2. Einstein's General Relativity:
Albert Einstein (1915) demonstrated that gravity is not a traditional force, but a **curvature of spacetime** caused by the uneven distribution of mass and energy. Objects move along geodesics (straightest possible paths) in this curved spacetime.`;
  }

  // PHOTOSYNTHESIS
  if (
    msgLower.includes("what is photosynthesis") ||
    msgLower.includes("explain photosynthesis") ||
    (resolvedTopic === "photosynthesis" && msgLower.includes("explain"))
  ) {
    return `### What is Photosynthesis?

**Photosynthesis** is the biological process by which green plants, algae, and certain bacteria convert solar light energy into chemical energy stored in glucose molecules.

### Overall Chemical Equation:
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Photons (Light)} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

### Two Main Stages:
1. **Light-Dependent Reactions (in Thylakoid membranes):**
   - Chlorophyll absorbs sunlight and splits water molecules ($H_2O$), releasing oxygen ($O_2$) and generating ATP and NADPH.
2. **Light-Independent Reactions / Calvin Cycle (in Stroma):**
   - Uses ATP and NADPH to fix carbon dioxide ($CO_2$) into high-energy carbohydrates (glucose).`;
  }

  if (
    msgLower.includes("who invented the telephone") ||
    msgLower.includes("inventor of telephone")
  ) {
    return `**Alexander Graham Bell** is officially credited with inventing and patenting the first practical telephone in **March 1876** (U.S. Patent 174,465). His famous first words over the device to his assistant were: *"Mr. Watson, come here, I want to see you."*`;
  }

  // Arithmetic helper
  const mathMatch = userMessage.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/xX×÷])\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let ans = 0;
    if (op === "+" ) ans = a + b;
    else if (op === "-") ans = a - b;
    else if (op === "*" || op === "x" || op === "X" || op === "×") ans = a * b;
    else if (op === "/" || op === "÷") ans = b !== 0 ? a / b : "Infinity (division by zero)";
    return `**${a} ${op} ${b} = ${ans}**`;
  }

  if (msgLower.includes("joke") || msgLower.includes("tell me a joke")) {
    return `Why do programmers always prefer dark mode?\n\nBecause light attracts bugs! 🐛😄`;
  }

  if (msgLower.includes("hello") || msgLower.includes("hi ") || msgLower === "hi" || msgLower.includes("hey")) {
    return `Hello! I am your **SmartGuard AI Companion** 🚗🛡️. 

I can assist you with:
- **Vehicle Telemetry & GPS Tracking:** Live speed, coordinates, and G-force readings.
- **Accident Detection & MPU6500:** Sensor calibration, collision thresholds, and emergency SMS alerts.
- **General Questions:** Programming (Python, Java, C++), science, mathematics, and technical explanations.

What would you like to explore today?`;
  }

  return `### Analysis & Information

Regarding your query: **"${userMessage}"**

- If this relates to **vehicle dynamics or sensors**, you can ask about live speed, MPU6500 G-forces, accident thresholds, or GPS mapping.
- If this relates to **programming or general knowledge**, feel free to specify the language or concept you would like explained in detail!`;
}
