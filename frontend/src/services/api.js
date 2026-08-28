// Smart Vehicles connect AI - API Service
// Service for communicating with FastAPI backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  async get(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async post(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async put(endpoint, data) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('PUT request failed:', error);
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }

  // Status check
  async getStatus() {
    return this.get('/api/status');
  }

  // Location endpoints
  async sendLocation(locationData) {
    return this.post('/api/location/', locationData);
  }

  // Driver status endpoints
  async sendDriverStatus(driverStatus) {
    return this.post('/api/driver-status/', driverStatus);
  }

  // Sensor data endpoints
  async sendSensorData(sensorData) {
    return this.post('/api/sensor-data/', sensorData);
  }

  // Alerts endpoints
  async getAlerts() {
    return this.get('/api/alerts/');
  }

  async createAlert(alertData) {
    return this.post('/api/alerts/', alertData);
  }

  // Accidents endpoints
  async getAccidents() {
    return this.get('/api/accidents');
  }

  async createAccident(accidentData) {
    return this.post('/api/accidents/', accidentData);
  }

  // Analytics endpoints
  async getAnalytics() {
    const hostname = window.location.hostname || 'localhost';
    const targetUrls = [
      `http://${hostname}:5000/api/analytics`,
      `/api/analytics`,
      `http://${hostname}:8000/api/analytics/`,
      `/api/analytics/`
    ];

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data === 'object') return data;
        }
      } catch (e) {}
    }
    return null;
  }

  // History endpoints
  async getHistory() {
    const hostname = window.location.hostname || 'localhost';
    const targetUrls = [
      `http://${hostname}:5000/api/history`,
      `/api/history`,
      `http://${hostname}:8000/api/history/`
    ];

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) return data;
          if (data && Array.isArray(data.trips)) return data.trips;
          if (data && Array.isArray(data.history)) return data.history;
        }
      } catch (e) {}
    }
    return [];
  }

  // AI endpoints
  async analyzeFrame(frameData) {
    return this.post('/api/ai/analyze-frame', frameData);
  }

  async resetAIState() {
    return this.post('/api/ai/reset-state', {});
  }

  async resetDriverState() {
    return this.post('/api/ai/reset-state', {});
  }
}

const apiService = new ApiService();
export default apiService;
