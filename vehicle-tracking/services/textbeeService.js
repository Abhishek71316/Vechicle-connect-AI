// vehicle-tracking/services/textbeeService.js
// Node.js Backend Service for TextBee.dev Emergency SMS Notifications

const TEXTBEE_URL = "https://api.textbee.dev/api/v1/gateway/send-sms";

/**
 * Format phone number to E.164 international format (+91XXXXXXXXXX for India)
 */
function formatPhone(phone) {
  if (!phone) return "";
  let str = String(phone).trim();
  let cleanDigits = str.replace(/\D/g, "");
  
  if (cleanDigits.length === 10) {
    return "+91" + cleanDigits;
  }
  if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
    return "+" + cleanDigits;
  }
  if (str.startsWith("+")) {
    return "+" + cleanDigits;
  }
  return cleanDigits ? "+" + cleanDigits : "";
}

/**
 * Validate phone number (E.164 format, minimum 10 digits)
 */
function validatePhone(phone) {
  if (!phone) return false;
  const formatted = formatPhone(phone);
  return /^\+\d{10,15}$/.test(formatted);
}

/**
 * Safely mask phone number for privacy in logs
 */
function maskPhone(phone) {
  if (!phone) return "****";
  const formatted = formatPhone(phone);
  if (formatted.length < 5) return "****";
  return `${formatted.slice(0, 3)}********${formatted.slice(-4)}`;
}

/**
 * Build standardized accident emergency SMS message
 */
function buildAccidentSMSMessage({
  vehicleId = "RG-001",
  severity = "CRITICAL",
  timestamp,
  latitude = 12.908011,
  longitude = 76.380341,
  accel_x = 2.41,
  accel_y = 1.83,
  accel_z = 0.72,
  total_g = 3.08,
  gyro_x = 185,
  gyro_y = 241,
  gyro_z = 96
}) {
  const latNum = (Number(latitude) || 12.908011).toFixed(6);
  const lngNum = (Number(longitude) || 76.380341).toFixed(6);
  const mapsUrl = `https://www.google.com/maps?q=${latNum},${lngNum}`;
  
  let formattedTimestamp = timestamp;
  if (!formattedTimestamp) {
    formattedTimestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  const ax = (Number(accel_x) || 0).toFixed(2);
  const ay = (Number(accel_y) || 0).toFixed(2);
  const az = (Number(accel_z) || 1.0).toFixed(2);
  const tg = (Number(total_g) || 1.0).toFixed(2);
  const gx = Math.round(Number(gyro_x) || 0);
  const gy = Math.round(Number(gyro_y) || 0);
  const gz = Math.round(Number(gyro_z) || 0);

  return `🚨 SMART VEHICLES CONNECT AI – ACCIDENT ALERT

A possible accident has been detected.

Vehicle: ${vehicleId}
Severity: ${severity}
Time: ${formattedTimestamp}

📍 LOCATION
Lat: ${latNum}
Lon: ${lngNum}
Map: ${mapsUrl}

📡 SENSOR DATA
Acceleration:
X: ${ax} g | Y: ${ay} g | Z: ${az} g
Total G-Force: ${tg} g

Gyroscope:
X: ${gx} °/s
Y: ${gy} °/s
Z: ${gz} °/s

⚠️ Emergency assistance may be required.
Please contact the driver immediately and arrange emergency assistance if necessary.`;
}

/**
 * Send an individual accident SMS via TextBee.dev API
 */
async function sendAccidentSMS({
  recipient,
  latitude,
  longitude,
  timestamp,
  severity = "CRITICAL",
  vehicleId = "RG-001",
  driverName = "Driver",
  accel_x,
  accel_y,
  accel_z,
  total_g,
  gyro_x,
  gyro_y,
  gyro_z
}) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey) {
    throw new Error("TEXTBEE_API_KEY is not configured in environment variables");
  }

  const cleanRecipient = formatPhone(recipient);

  if (!validatePhone(cleanRecipient)) {
    throw new Error(`Invalid recipient phone number: ${maskPhone(recipient)}. Expected E.164 format (e.g. +91XXXXXXXXXX)`);
  }

  const latNum = Number(latitude != null ? latitude : 12.908011);
  const lngNum = Number(longitude != null ? longitude : 76.380341);

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error("Valid numerical GPS latitude and longitude are required");
  }

  const formattedTimestamp = timestamp || new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const customSMSMessage = buildAccidentSMSMessage({
    vehicleId,
    severity,
    timestamp: formattedTimestamp,
    latitude: latNum,
    longitude: lngNum,
    accel_x,
    accel_y,
    accel_z,
    total_g,
    gyro_x,
    gyro_y,
    gyro_z
  });

  const payload = {
    recipients: [cleanRecipient],
    message: customSMSMessage
  };

  if (deviceId && deviceId.trim() !== "") {
    payload.deviceId = deviceId.trim();
  }

  console.log(`[SMS] Sending emergency accident SMS via TextBee.dev to ${maskPhone(cleanRecipient)}...`);

  try {
    const response = await fetch(TEXTBEE_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`[SMS] TextBee HTTP request failed [Status ${response.status}]:`, data);
      return {
        success: false,
        recipient: maskPhone(cleanRecipient),
        status: response.status,
        error: data.message || data.error || `TextBee API error status ${response.status}`,
        details: data
      };
    }

    console.log(`[SMS] TextBee SMS dispatch request successful for ${maskPhone(cleanRecipient)}`);
    return {
      success: true,
      recipient: maskPhone(cleanRecipient),
      provider: "TextBee.dev",
      response: data
    };
  } catch (err) {
    console.error(`[SMS] Network/system error sending SMS to ${maskPhone(cleanRecipient)}:`, err.message);
    return {
      success: false,
      recipient: maskPhone(cleanRecipient),
      error: err.message
    };
  }
}

/**
 * Dispatch emergency SMS to all configured family contact numbers
 */
async function sendEmergencySMS({
  accidentId,
  latitude,
  longitude,
  timestamp,
  severity = "CRITICAL",
  vehicleId = "RG-001",
  driverName = "Driver",
  accel_x,
  accel_y,
  accel_z,
  total_g,
  gyro_x,
  gyro_y,
  gyro_z
}) {
  const contacts = [
    process.env.EMERGENCY_CONTACT_1,
    process.env.EMERGENCY_CONTACT_2
  ].filter(Boolean);

  console.log(`[SMS] Initiating emergency SMS dispatch for accident ${accidentId || 'N/A'} to ${contacts.length} recipient(s)`);

  if (contacts.length === 0) {
    console.warn("[SMS] No emergency contacts configured (EMERGENCY_CONTACT_1, EMERGENCY_CONTACT_2 missing in .env)");
    return {
      success: false,
      accidentId,
      error: "NO_EMERGENCY_CONTACTS_CONFIGURED",
      recipients: []
    };
  }

  const results = [];
  for (const contact of contacts) {
    try {
      const res = await sendAccidentSMS({
        recipient: contact,
        latitude,
        longitude,
        timestamp,
        severity,
        vehicleId,
        driverName,
        accel_x,
        accel_y,
        accel_z,
        total_g,
        gyro_x,
        gyro_y,
        gyro_z
      });
      results.push({
        phone: maskPhone(contact),
        status: res.success ? "sent" : "failed",
        details: res
      });
    } catch (err) {
      results.push({
        phone: maskPhone(contact),
        status: "failed",
        error: err.message
      });
    }
  }

  const anySuccess = results.some(r => r.status === "sent");
  return {
    success: anySuccess,
    accidentId: accidentId || `ACC-${Date.now()}`,
    recipients: results,
    timestamp: timestamp || new Date().toISOString()
  };
}

module.exports = {
  sendAccidentSMS,
  sendEmergencySMS,
  validatePhone,
  maskPhone,
  formatPhone,
  buildAccidentSMSMessage
};
