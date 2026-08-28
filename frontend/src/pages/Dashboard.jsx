import { useState, useEffect } from 'react';
import { 
  Activity, 
  Eye, 
  Gauge, 
  AlertTriangle, 
  MapPin, 
  Wifi, 
  WifiOff,
  Shield,
  TrendingUp,
  Phone,
  PhoneOff,
  Bot,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useGeolocation from '../hooks/useGeolocation';
import VehicleMap from '../components/VehicleMap';
import MPU6500Live from '../components/MPU6500Live';
import useESP32Telemetry from '../hooks/useESP32Telemetry';
import EmergencyWorkflow from '../components/EmergencyWorkflow';
import DriverCamera from '../components/DriverCamera';
import apiService from '../services/api';
import websocketService from '../services/websocket';
import demoModeService from '../services/demoMode';
import firebaseService from '../services/firebaseService';
import geminiService from '../services/geminiService';

const Dashboard = () => {
  const { location, error: gpsError, loading: gpsLoading, permission, isAllowed, isDenied, startTracking, stopTracking, trackingEnabled } = useGeolocation();
  const { data: esp32, connected: esp32Connected, error: esp32Error } = useESP32Telemetry();

  console.log("SMARTGUARD DASHBOARD RENDER", Date.now(), esp32);
  const [accidents, setAccidents] = useState([]);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [sensorData, setSensorData] = useState({
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { x: 0, y: 0, z: 0 },
    impact: false,
    sudden_braking: false,
    sudden_acceleration: false,
    abnormal_rotation: false
  });
  const [accidentDetected, setAccidentDetected] = useState(null);
  const [emergencyResponse, setEmergencyResponse] = useState(null);
  const [driverStatus, setDriverStatus] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [sosActive, setSosActive] = useState(false);
  const [aiStatus, setAiStatus] = useState('checking');
  const [latestAIAnalysis, setLatestAIAnalysis] = useState(null);
  const [smsServiceStatus, setSmsServiceStatus] = useState(null);

  useEffect(() => {
    // Check backend status on mount
    apiService.getStatus()
      .then(data => {
        console.log('Backend status:', data);
        setBackendStatus('connected');
      })
      .catch(error => {
        console.error('Backend connection failed:', error);
        setBackendStatus('disconnected');
      });

    // Fetch Emergency SMS Status
    fetch('/api/emergency/sms-status')
      .then(res => res.json())
      .then(data => setSmsServiceStatus(data))
      .catch(() => {});

    // Check AI status
    checkAIStatus();

    // Connect to WebSocket
    websocketService.connect();

    // WebSocket event listeners
    websocketService.on('status', (data) => {
      setWsStatus(data.status);
    });

    // Note: WS sensor_update is disabled while debugging HTTP telemetry to keep useESP32Telemetry as single source of truth
    websocketService.on('sensor_update', (_data) => {
      // Intentionally ignored in favor of HTTP polling via useESP32Telemetry
    });

    websocketService.on('driver_status', (data) => {
      console.log('Driver status:', data);
      if (data.data) {
        setDriverStatus(data.data);
      }
    });

    websocketService.on('risk_assessment', (data) => {
      console.log('Risk assessment:', data);
      if (data.data) {
        setRiskScore(data.data.risk_score);
      }
    });

    websocketService.on('accident', (data) => {
      console.log('Accident detected:', data);
      setAccidentDetected(data.data);
    });

    websocketService.on('button_response', (data) => {
      console.log('Button response:', data);
      setEmergencyResponse(data.response);
    });

    // Demo mode sensor data simulation
    if (demoModeService.isEnabled()) {
      demoModeService.on((data) => {
        setSensorData(data);
      });
      demoModeService.startSimulation();
    }

    return () => {
      websocketService.disconnect();
      demoModeService.stopSimulation();
    };
  }, []);

  const handleEmergencyResponse = (response) => {
    setEmergencyResponse(response);
    
    // Send response to backend
    apiService.createAlert({
      timestamp: new Date().toISOString(),
      severity: 'critical',
      event_type: 'emergency_response',
      location: location ? `${location.latitude},${location.longitude}` : null,
      risk_score: 100,
      status: response === 'emergency' ? 'active' : 'resolved'
    }).catch(error => {
      console.error('Failed to record emergency response:', error);
    });
    
    // Send via WebSocket
    websocketService.send({
      type: 'emergency_response',
      response: response,
      timestamp: new Date().toISOString()
    });
  };

  // Send location to backend when available
  useEffect(() => {
    if (location && (location.latitude != null && location.longitude != null)) {
      const hostname = window.location.hostname || "localhost";
      fetch(`http://${hostname}:5000/api/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});

      apiService.sendLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.error('Failed to send location:', error);
      });
    }
  }, [location]);

  const handleSOS = async () => {
    if (!location) {
      alert('Location not available. Please enable GPS.');
      return;
    }

    setSosActive(true);
    
    try {
      const emergencyId = await firebaseService.createEmergency({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        severity: 'critical',
        description: 'SOS - Emergency assistance requested'
      });
      
      alert('Emergency alert sent! ID: ' + emergencyId);
    } catch (error) {
      console.error('Failed to send SOS:', error);
      alert('Failed to send emergency alert. Please try again.');
    } finally {
      setSosActive(false);
    }
  };

  const toggleTracking = () => {
    if (trackingEnabled) {
      stopTracking();
    } else {
      // Request permission before starting tracking
      if (isDenied) {
        // If permission was denied, reload the page to request again
        window.location.reload();
      } else {
        startTracking();
      }
    }
  };

  const checkAIStatus = async () => {
    try {
      const status = await geminiService.getStatus();
      setAiStatus(status.status);
    } catch (err) {
      setAiStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-xs sm:text-sm text-gray-400">Last updated:</span>
          <span className="text-xs sm:text-sm text-white">Just now</span>
        </div>
      </div>

      {/* AI Dashboard Section */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Bot className="text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-white font-semibold">AI Dashboard</h2>
              <p className="text-gray-400 text-sm">Powered by Google Gemini</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            aiStatus === 'operational' ? 'bg-green-500/20 text-green-400' :
            aiStatus === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            <Sparkles size={14} />
            <span className="text-xs font-medium">
              {aiStatus === 'operational' ? 'AI Online' :
               aiStatus === 'error' ? 'AI Offline' :
               'Checking...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-gray-400 text-xs mb-1">AI Status</h3>
            <p className="text-white font-medium">{aiStatus === 'operational' ? 'Operational' : 'Unavailable'}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-gray-400 text-xs mb-1">Latest Analysis</h3>
            <p className="text-white font-medium">{latestAIAnalysis ? 'Available' : 'None'}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-gray-400 text-xs mb-1">AI Features</h3>
            <p className="text-white font-medium">3 Active</p>
          </div>
        </div>

        {latestAIAnalysis && (
          <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Latest AI Analysis</h3>
            <p className="text-gray-300 text-sm">{latestAIAnalysis}</p>
          </div>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield className="text-green-500 sm:size-24" size={20} />
            </div>
            <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
              riskScore < 30 ? 'bg-green-500/20 text-green-400' :
              riskScore < 60 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {riskScore < 30 ? 'SAFE' : riskScore < 60 ? 'MODERATE' : 'HIGH RISK'}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm mb-1">Road Risk Score</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white">{riskScore}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Eye className="text-blue-500 sm:size-24" size={20} />
            </div>
            <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
              driverStatus?.drowsiness_level === 'LOW' ? 'bg-green-500/20 text-green-400' :
              driverStatus?.drowsiness_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
              driverStatus?.drowsiness_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
              driverStatus?.drowsiness_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {driverStatus?.drowsiness_level || 'UNKNOWN'}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm mb-1">Driver Status</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white">{driverStatus?.drowsiness_level || 'N/A'}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Gauge className="text-purple-500 sm:size-24" size={20} />
            </div>
            <span className="px-2 sm:px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
              {location?.speed ? 'MOVING' : 'STATIONARY'}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm mb-1">Vehicle Speed</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {location?.speed ? (location.speed * 3.6).toFixed(0) : '0'} <span className="text-base sm:text-lg">km/h</span>
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Activity className="text-orange-500 sm:size-24" size={20} />
            </div>
            <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
              driverStatus?.fatigue_score < 30 ? 'bg-green-500/20 text-green-400' :
              driverStatus?.fatigue_score < 60 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {driverStatus?.fatigue_score < 30 ? 'LOW' : driverStatus?.fatigue_score < 60 ? 'MODERATE' : 'HIGH'}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm mb-1">Fatigue Score</h3>
          <p className="text-2xl sm:text-3xl font-bold text-white">{driverStatus?.fatigue_score || 'N/A'}</p>
        </div>
      </div>

      {/* GPS Tracking Controls */}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              {trackingEnabled ? (
                <Phone className="text-green-500 sm:size-24" size={20} />
              ) : (
                <PhoneOff className="text-gray-500 sm:size-24" size={20} />
              )}
              <div>
                <p className="text-white font-medium text-sm sm:text-base">GPS Tracking</p>
                <p className={`text-xs sm:text-sm ${trackingEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {trackingEnabled ? 'Live tracking active' : 'Tracking stopped'}
                </p>
              </div>
            </div>
            {isAllowed && (
              <span className="px-2 sm:px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                GPS Permission Granted
              </span>
            )}
            {isDenied && (
              <span className="px-2 sm:px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                GPS Permission Denied
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:space-x-3 w-full sm:w-auto">
            {isDenied && (
              <button
                onClick={() => {
                  // Clear permission state and request again
                  window.location.reload();
                }}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
              >
                <AlertTriangle size={16} className="sm:size-18" />
                <span>Request Permission</span>
              </button>
            )}
            <button
              onClick={toggleTracking}
              disabled={isDenied}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                trackingEnabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } ${isDenied ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {trackingEnabled ? (
                <>
                  <PhoneOff size={16} className="sm:size-18" />
                  <span>Stop Tracking</span>
                </>
              ) : (
                <>
                  <Phone size={16} className="sm:size-18" />
                  <span>Start Tracking</span>
                </>
              )}
            </button>
            <button
              onClick={handleSOS}
              disabled={sosActive || !location}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                sosActive 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <AlertTriangle size={16} className="sm:size-18" />
              <span>{sosActive ? 'Sending...' : 'SOS'}</span>
            </button>
          </div>
        </div>
        {isDenied && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 sm:p-4">
            <p className="text-yellow-400 text-xs sm:text-sm">
              <strong>GPS Permission Required:</strong> Location permission was denied. 
              Click "Request Permission" to reload the page and allow location access, 
              or enable location services in your browser settings.
            </p>
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={() => {
                  // Alternative: Enable demo mode
                  window.location.href = '/settings';
                }}
                className="text-xs sm:text-sm text-blue-400 hover:text-blue-300"
              >
                Use Demo Mode Instead →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Driver Camera & Live AI Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-4">
          <DriverCamera onDriverStatus={(status) => setDriverStatus(status)} />
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Driver Status Analytics</h2>
              <Link
                to="/live-monitor"
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1"
              >
                Full Screen Live Monitor →
              </Link>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Eye Status</span>
                <span className={`font-medium ${
                  driverStatus?.eye_state === 'OPEN' ? 'text-green-400' :
                  driverStatus?.eye_state === 'DROWSY' ? 'text-amber-400' :
                  driverStatus?.eye_state === 'CLOSED' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {driverStatus?.eye_state || 'Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Blinks</span>
                <span className="text-white font-medium">{driverStatus?.blink_rate ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Yawning</span>
                <span className={`font-medium ${driverStatus?.yawning ? 'text-red-400' : 'text-green-400'}`}>
                  {driverStatus?.yawning ? 'YES (Detected)' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Head Direction</span>
                <span className="text-white font-medium">{driverStatus?.head_pose || 'FORWARD'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Distraction</span>
                <span className={`font-medium ${driverStatus?.distraction ? 'text-red-400' : 'text-green-400'}`}>
                  {driverStatus?.distraction ? 'YES' : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-gray-400">Fatigue Score</span>
                <span className="text-white font-bold">{driverStatus?.fatigue_score || 0} / 100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">ESP32 MPU6500 Telemetry</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              esp32Connected && esp32.hasData 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {esp32Connected && esp32.hasData ? "🟢 ONLINE" : "🔴 OFFLINE"}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">X Acceleration</span>
              <span className="text-white font-medium font-mono">
                {esp32.hasData ? `${Number(esp32.accel_x ?? 0).toFixed(2)} g` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Y Acceleration</span>
              <span className="text-white font-medium font-mono">
                {esp32.hasData ? `${Number(esp32.accel_y ?? 0).toFixed(2)} g` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Z Acceleration</span>
              <span className="text-white font-medium font-mono">
                {esp32.hasData ? `${Number(esp32.accel_z ?? 0).toFixed(2)} g` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total G-Force</span>
              <span className={`font-medium font-mono ${
                Number(esp32.total_g) > 2.5 ? 'text-red-400 font-bold' : 'text-white'
              }`}>
                {esp32.hasData ? `${Number(esp32.total_g ?? 0).toFixed(2)} g` : '--'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <span className="text-gray-400">Impact Status</span>
              <span className={`font-bold ${esp32.impact ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {esp32.impact ? '🚨 IMPACT DETECTED' : '✅ NORMAL'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Emergency Alert Status</span>
              <span className={`font-bold ${
                esp32.alert_active ? 'text-red-400 animate-pulse' : 'text-green-400'
              }`}>
                {esp32.alert_active ? '🚨 ALERT ACTIVE' : '🟢 NORMAL'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Device: {esp32.device_id || "RG-001"}</span>
              {esp32.timestamp && <span>Synced: {new Date(esp32.timestamp).toLocaleTimeString()}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            {esp32Connected ? (
              <Wifi className="text-green-500" size={24} />
            ) : (
              <WifiOff className="text-red-500" size={24} />
            )}
            <div>
              <h3 className="text-white font-medium">ESP32</h3>
              {esp32Connected ? (
                <p className="text-green-400 text-sm">Connected</p>
              ) : (
                <p className="text-red-400 text-sm">Disconnected</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            {isAllowed ? (
              <MapPin className="text-green-500" size={24} />
            ) : isDenied ? (
              <MapPin className="text-red-500" size={24} />
            ) : (
              <MapPin className="text-yellow-500" size={24} />
            )}
            <div>
              <h3 className="text-white font-medium">GPS</h3>
              {gpsLoading ? (
                <p className="text-yellow-400 text-sm">Loading...</p>
              ) : isDenied ? (
                <p className="text-red-400 text-sm">Permission Denied</p>
              ) : gpsError ? (
                <p className="text-red-400 text-sm">Error</p>
              ) : (
                <p className="text-green-400 text-sm">Active</p>
              )}
            </div>
          </div>
          {location && !gpsLoading && (
            <div className="mt-3 text-xs text-gray-400">
              <p>Lat: {location.latitude != null ? location.latitude.toFixed(6) : '---'}</p>
              <p>Lon: {location.longitude != null ? location.longitude.toFixed(6) : '---'}</p>
              {location.speed != null && <p>Speed: {location.speed.toFixed(1)} m/s</p>}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Activity className="text-green-500" size={24} />
            <div>
              <h3 className="text-white font-medium">MPU6050</h3>
              <p className="text-green-400 text-sm">Online</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <Smartphone className={smsServiceStatus?.configured ? "text-green-500" : "text-amber-500"} size={24} />
            <div>
              <h3 className="text-white font-medium">Emergency SMS</h3>
              {smsServiceStatus?.configured ? (
                <p className="text-green-400 text-sm font-bold">🟢 ONLINE</p>
              ) : (
                <p className="text-amber-400 text-sm font-bold">⚠️ UNCONFIGURED</p>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400 space-y-0.5 font-mono">
            <p>Provider: {smsServiceStatus?.provider || "TextBee.dev"}</p>
            <p>Recipients: {smsServiceStatus?.contacts_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-yellow-500" size={20} />
              <div>
                <p className="text-white text-sm">Mild driver fatigue detected</p>
                <p className="text-gray-400 text-xs">2 minutes ago</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Warning</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp className="text-blue-500" size={20} />
              <div>
                <p className="text-white text-sm">Sudden acceleration detected</p>
                <p className="text-gray-400 text-xs">15 minutes ago</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Info</span>
          </div>
        </div>
      </div>

      {/* MPU6500 Live Telemetry */}
      <MPU6500Live />

      {/* Vehicle Map */}
      <VehicleMap location={location} accidents={accidents} />

      {/* Emergency Workflow Overlay */}
      <EmergencyWorkflow 
        accidentData={accidentDetected}
        location={location}
        onResponse={handleEmergencyResponse}
      />
    </div>
  );
};

export default Dashboard;
