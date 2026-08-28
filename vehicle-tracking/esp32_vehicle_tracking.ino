#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <math.h>

// ======================================================
// WIFI & SERVER CONFIGURATION
// ======================================================

const char* WIFI_SSID     = "ESP32_TEST";
const char* WIFI_PASSWORD = "12345678";

// Replace with your actual laptop IP address from ipconfig
const char* SERVER_URL    = "http://10.179.97.141:5000/api/esp32";


// ======================================================
// PIN CONFIGURATION (STRICT REQUIREMENT - DO NOT CHANGE)
// ======================================================

#define SDA_PIN       21
#define SCL_PIN       22

#define BUZZER_PIN     5     // D5 / GPIO5 - ACTIVE LOW
#define MOTOR_PIN     17     // TX2 / GPIO17
#define LED1_PIN      27     // LED 1
#define LED2_PIN      16     // RX2 / GPIO16


// ======================================================
// MPU6500 REGISTERS & ADDRESSES
// ======================================================

uint8_t MPU_ADDR      = 0x68; // Default 0x68, auto-checked for 0x69

#define WHO_AM_I      0x75
#define PWR_MGMT_1    0x6B
#define PWR_MGMT_2    0x6C
#define ACCEL_CONFIG  0x1C
#define ACCEL_XOUT_H  0x3B


// ======================================================
// IMPACT SETTINGS
// ======================================================

const float IMPACT_THRESHOLD = 2.5;
const unsigned long ALERT_DURATION = 5000;
const unsigned long COOLDOWN_TIME = 5000;
const unsigned long SEND_INTERVAL = 300; // Send HTTP data every 300ms


// ======================================================
// VARIABLES
// ======================================================

bool alertActive = false;
unsigned long alertStartTime = 0;
unsigned long lastAlertTime = 0;
unsigned long lastSerialPrint = 0;
unsigned long lastWiFiCheck = 0;
unsigned long lastHttpSend = 0;

float ax = 0.0, ay = 0.0, az = 1.0, totalG = 1.0;


// ======================================================
// BUZZER (ACTIVE LOW: LOW = ON, HIGH = OFF)
// ======================================================

void buzzerON()  { digitalWrite(BUZZER_PIN, LOW); }
void buzzerOFF() { digitalWrite(BUZZER_PIN, HIGH); }

void outputsOFF()
{
  buzzerOFF();
  digitalWrite(MOTOR_PIN, LOW);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
}


// ======================================================
// WIFI CONNECTION
// ======================================================

void connectWiFi()
{
  Serial.println("\n================================");
  Serial.println("       ESP32 Wi-Fi");
  Serial.println("================================");
  Serial.print("Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000)
  {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("Wi-Fi CONNECTED!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("Wi-Fi connection failed. Sensor will operate offline.");
  }
}

void checkWiFi()
{
  if (millis() - lastWiFiCheck < 5000) return;
  lastWiFiCheck = millis();
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}


// ======================================================
// HTTP POST TO SERVER
// ======================================================

void sendTelemetryToServer(float curAx, float curAy, float curAz, float curTotalG, bool isImpact)
{
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["ax"] = curAx;
  doc["ay"] = curAy;
  doc["az"] = curAz;
  doc["totalG"] = curTotalG;
  doc["impact"] = isImpact;
  doc["emergency"] = isImpact;

  String jsonBody;
  serializeJson(doc, jsonBody);

  int httpCode = http.POST(jsonBody);

  if (httpCode <= 0)
  {
    Serial.printf("[HTTP ERROR] Failed to send to %s. Error: %s\n", SERVER_URL, http.errorToString(httpCode).c_str());
  }

  http.end();
}


// ======================================================
// MPU COMMUNICATIONS
// ======================================================

void writeMPU(uint8_t reg, uint8_t value)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

uint8_t readMPU(uint8_t reg)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)1);
  if (Wire.available()) return Wire.read();
  return 0xFF;
}

void setupMPU6500()
{
  Serial.println("Scanning I2C for MPU6500 (SDA:21, SCL:22)...");

  // Check 0x68 first
  Wire.beginTransmission(0x68);
  if (Wire.endTransmission() == 0) {
    MPU_ADDR = 0x68;
    Serial.println("Found MPU6500 at I2C address 0x68");
  } else {
    // Check 0x69
    Wire.beginTransmission(0x69);
    if (Wire.endTransmission() == 0) {
      MPU_ADDR = 0x69;
      Serial.println("Found MPU6500 at I2C address 0x69");
    } else {
      Serial.println("⚠️ MPU6500 not responding at 0x68 or 0x69! Check VCC/GND/SDA/SCL wiring.");
    }
  }

  uint8_t id = readMPU(WHO_AM_I);
  Serial.printf("MPU WHO_AM_I = 0x%02X\n", id);

  // Clear Sleep Mode (register 0x6B = 0x00) & internal clock source
  writeMPU(PWR_MGMT_1, 0x00);
  delay(50);
  writeMPU(PWR_MGMT_2, 0x00);
  delay(50);

  // Set ±2g scale range (register 0x1C = 0x00)
  writeMPU(ACCEL_CONFIG, 0x00);
  delay(50);
}

bool readAcceleration(float &outAx, float &outAy, float &outAz)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom(MPU_ADDR, (uint8_t)6);
  if (Wire.available() < 6) return false;

  int16_t rawAX = (Wire.read() << 8) | Wire.read();
  int16_t rawAY = (Wire.read() << 8) | Wire.read();
  int16_t rawAZ = (Wire.read() << 8) | Wire.read();

  // Convert raw 16-bit to g-force (±2g range sensitivity = 16384 LSB/g)
  outAx = rawAX / 16384.0;
  outAy = rawAY / 16384.0;
  outAz = rawAZ / 16384.0;

  return true;
}


// ======================================================
// EMERGENCY ALARM LOGIC
// ======================================================

void emergencyON(float curAx, float curAy, float curAz, float curTotalG)
{
  Serial.println("\n================================");
  Serial.println("  !!! IMPACT DETECTED !!!");
  Serial.println("================================");

  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(MOTOR_PIN, HIGH);
  buzzerON();

  alertActive = true;
  alertStartTime = millis();
  lastAlertTime = millis();

  sendTelemetryToServer(curAx, curAy, curAz, curTotalG, true);
}

void emergencyOFF()
{
  outputsOFF();
  alertActive = false;
  Serial.println("Emergency alert OFF\n");
}


// ======================================================
// SETUP
// ======================================================

void setup()
{
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n======================================");
  Serial.println("   SMART VEHICLE SAFETY SYSTEM");
  Serial.println("======================================");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MOTOR_PIN, OUTPUT);
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  outputsOFF();

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  delay(100);

  setupMPU6500();
  connectWiFi();

  Serial.println("======================================");
  Serial.println("          SYSTEM READY");
  Serial.println("======================================\n");
}


// ======================================================
// MAIN LOOP
// ======================================================

void loop()
{
  checkWiFi();

  float rawX = 0, rawY = 0, rawZ = 0;
  if (readAcceleration(rawX, rawY, rawZ))
  {
    ax = rawX;
    ay = rawY;
    az = rawZ;
    totalG = sqrt(ax * ax + ay * ay + az * az);
  }

  // Serial Monitor Output
  if (millis() - lastSerialPrint >= 200)
  {
    lastSerialPrint = millis();

    Serial.printf("X: %.2f g | Y: %.2f g | Z: %.2f g | TOTAL: %.2f g | WiFi: %s\n",
                  ax, ay, az, totalG,
                  (WiFi.status() == WL_CONNECTED ? "OK" : "OFF"));
  }

  // Send Telemetry HTTP POST every 300 ms
  if (millis() - lastHttpSend >= SEND_INTERVAL)
  {
    lastHttpSend = millis();
    sendTelemetryToServer(ax, ay, az, totalG, alertActive);
  }

  // Alert Timer Check
  if (alertActive && (millis() - alertStartTime >= ALERT_DURATION))
  {
    emergencyOFF();
  }

  // Immediate Impact Detection
  if (totalG >= IMPACT_THRESHOLD && (millis() - lastAlertTime >= COOLDOWN_TIME))
  {
    emergencyON(ax, ay, az, totalG);
  }
}
