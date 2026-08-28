// Smart Vehicles connect AI - Demo Mode Service
// Simulates sensor data when hardware is not available

class DemoModeService {
  constructor() {
    this.enabled = false;
    this.interval = null;
    this.listeners = [];
  }

  enable() {
    this.enabled = true;
    console.log('Demo mode enabled');
  }

  disable() {
    this.enabled = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('Demo mode disabled');
  }

  isEnabled() {
    return this.enabled;
  }

  startSimulation() {
    if (!this.enabled) return;

    this.interval = setInterval(() => {
      this.generateSensorData();
    }, 100); // Generate data every 100ms
  }

  stopSimulation() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  generateSensorData() {
    if (!this.enabled) return;

    // Simulate realistic sensor data
    const accelerometer = {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5,
      z: 1 + (Math.random() - 0.5) * 0.2
    };

    const gyroscope = {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10
    };

    // Randomly trigger events for demo
    const impact = Math.random() < 0.01; // 1% chance
    const suddenBraking = Math.random() < 0.02; // 2% chance
    const suddenAcceleration = Math.random() < 0.02; // 2% chance
    const abnormalRotation = Math.random() < 0.01; // 1% chance

    const sensorData = {
      accelerometer,
      gyroscope,
      impact,
      sudden_braking: suddenBraking,
      sudden_acceleration: suddenAcceleration,
      abnormal_rotation: abnormalRotation,
      timestamp: new Date().toISOString()
    };

    this.notifyListeners(sensorData);
  }

  on(listener) {
    this.listeners.push(listener);
  }

  off(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners(data) {
    this.listeners.forEach(listener => listener(data));
  }

  generateMockDriverStatus() {
    const drowsinessLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const eyeStates = ['OPEN', 'CLOSED'];
    const headPoses = ['FORWARD', 'LEFT', 'RIGHT', 'UP', 'DOWN'];

    return {
      drowsiness_level: drowsinessLevels[Math.floor(Math.random() * drowsinessLevels.length)],
      eye_state: eyeStates[Math.floor(Math.random() * eyeStates.length)],
      blink_rate: Math.floor(Math.random() * 30),
      yawning: Math.random() < 0.1,
      head_pose: headPoses[Math.floor(Math.random() * headPoses.length)],
      fatigue_score: Math.floor(Math.random() * 100),
      distraction: Math.random() < 0.15,
      timestamp: new Date().toISOString()
    };
  }

  generateMockLocation() {
    // Do not generate random location - use real GPS from device
    // Demo mode only simulates sensor data, not location
    return null;
  }

  generateMockAnalytics() {
    return {
      total_trips: Math.floor(Math.random() * 50) + 1,
      drowsiness_events: Math.floor(Math.random() * 20),
      distraction_events: Math.floor(Math.random() * 15),
      high_risk_events: Math.floor(Math.random() * 10),
      possible_accidents: Math.floor(Math.random() * 5),
      average_risk_score: Math.floor(Math.random() * 60) + 20,
      average_speed: Math.floor(Math.random() * 40) + 30
    };
  }

  generateMockAlerts() {
    const severities = ['critical', 'high', 'medium', 'low', 'info'];
    const statuses = ['active', 'resolved', 'acknowledged'];
    const eventTypes = ['Drowsiness Detected', 'High Risk', 'Possible Accident', 'Distraction', 'Speed Warning'];
    
    const alerts = [];
    const numAlerts = Math.floor(Math.random() * 10) + 1;
    
    for (let i = 0; i < numAlerts; i++) {
      alerts.push({
        event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        risk_score: Math.floor(Math.random() * 100),
        location: `${(40.7128 + (Math.random() - 0.5) * 0.01).toFixed(4)}, ${(-74.0060 + (Math.random() - 0.5) * 0.01).toFixed(4)}`
      });
    }
    
    return alerts;
  }

  generateMockAccidents() {
    const severities = ['low', 'moderate', 'high', 'severe'];
    const statuses = ['active', 'resolved', 'investigating'];
    const responses = ['ok', 'emergency', 'unresponded'];
    
    const accidents = [];
    const numAccidents = Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numAccidents; i++) {
      accidents.push({
        latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
        impact_level: severities[Math.floor(Math.random() * severities.length)],
        event_status: statuses[Math.floor(Math.random() * statuses.length)],
        driver_response: responses[Math.floor(Math.random() * responses.length)],
        risk_score: Math.floor(Math.random() * 100),
        speed: Math.random() * 60,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
      });
    }
    
    return accidents;
  }

  generateMockHistory() {
    const history = [];
    const numTrips = Math.floor(Math.random() * 20) + 1;
    
    for (let i = 0; i < numTrips; i++) {
      history.push({
        id: i + 1,
        start_time: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        end_time: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
        distance: Math.random() * 100,
        duration: Math.random() * 120,
        average_speed: Math.random() * 60,
        max_speed: Math.random() * 80,
        risk_score: Math.floor(Math.random() * 100)
      });
    }
    
    return history;
  }
}

const demoModeService = new DemoModeService();
export default demoModeService;
