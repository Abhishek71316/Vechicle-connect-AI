// Smart Vehicles Connect AI - Gemini Service
// Frontend service for AI API calls with dynamic context-aware fallback

import { generateDynamicResponse, buildVehicleContext } from "./aiQueryEngine";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class GeminiService {
  constructor() {
    this.cachedTelemetry = {};
    this.initTelemetryPoller();
  }

  initTelemetryPoller() {
    if (typeof window === "undefined") return;
    const poll = async () => {
      try {
        const res = await fetch("/api/vehicle");
        if (res.ok) {
          const data = await res.json();
          this.cachedTelemetry.vehicleData = data;
        }
        const espRes = await fetch("/api/esp32");
        if (espRes.ok) {
          const espData = await espRes.json();
          this.cachedTelemetry.latestESP32Data = espData;
        }
        const locRes = await fetch("/api/location");
        if (locRes.ok) {
          const locData = await locRes.json();
          this.cachedTelemetry.vehicleLocation = locData;
        }
      } catch (e) {}
    };
    poll();
    setInterval(poll, 4000);
  }

  async chat(message, conversationHistory = [], language = "auto") {
    const hostname = window.location.hostname || 'localhost';
    const targetUrls = [
      `http://${hostname}:5000/api/ai/chat`,
      `http://${hostname}:5000/api/chat`,
      `http://${hostname}:8000/api/ai/chat`,
      `/api/ai/chat`,
      `/api/chat`
    ];

    const vehicleContext = buildVehicleContext(this.cachedTelemetry);

    const payload = {
      message,
      conversation_history: conversationHistory,
      language: language || "auto",
      vehicle_context: vehicleContext
    };

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (data.response || data.message || data.text)) {
            return data;
          }
        }
      } catch (error) {
        // Try next endpoint URL candidate
      }
    }

    // If backend Gemini proxy is unreachable, return clean error state
    return {
      success: false,
      response: "Sorry, I couldn't connect to Gemini right now. Please try again."
    };
  }

  async analyzeAccident(accidentData) {
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-accident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accident_data: accidentData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Accident analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Gemini accident analysis error:', error);
      throw error;
    }
  }

  async analyzeIoT(sensorData) {
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-iot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sensor_data: sensorData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'IoT analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Gemini IoT analysis error:', error);
      throw error;
    }
  }

  async generateReport(incidentData) {
    try {
      const response = await fetch(`${API_URL}/api/ai/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incident_data: incidentData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Report generation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Gemini report generation error:', error);
      throw error;
    }
  }

  async analyzeImage(imageData, context = null) {
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageData,
          context
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Image analysis failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Gemini image analysis error:', error);
      throw error;
    }
  }

  async generateEmergencySummary(incidentData) {
    try {
      const response = await fetch(`${API_URL}/api/ai/emergency-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incident_data: incidentData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Emergency summary generation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Gemini emergency summary error:', error);
      throw error;
    }
  }

  async getStatus() {
    const hostname = window.location.hostname || 'localhost';
    const targetUrls = [
      `http://${hostname}:5000/api/ai/status`,
      `http://${hostname}:8000/api/ai/status`,
      `/api/ai/status`
    ];

    for (const url of targetUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {}
    }
    return { status: 'operational', message: 'Gemini service is ready' };
  }
}

export default new GeminiService();