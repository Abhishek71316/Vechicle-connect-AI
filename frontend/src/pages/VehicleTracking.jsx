import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import usePhoneGPS from '../hooks/usePhoneGPS';
import useESP32Telemetry from '../hooks/useESP32Telemetry';
import { 
  MapPin, 
  Navigation, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  Gauge,
  Compass,
  Radio,
  ShieldAlert,
  Smartphone,
  Cpu,
  Layers,
  Play,
  Square,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Zap,
  TrendingUp,
  Maximize2
} from 'lucide-react';

// Fix default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom vehicle marker icon (directional blue arrow with pulse outer ring)
const createVehicleIcon = (heading = 0) => {
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.25);
          border: 2px solid rgba(59, 130, 246, 0.6);
          animation: pulse 2s infinite;
        "></div>
        <div style="
          transform: rotate(${heading}deg);
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
          transition: transform 0.3s ease-out;
        ">
          <svg viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Accident marker icon (glowing red hazard octagonal alert)
const createAccidentIcon = () => {
  return L.divIcon({
    className: 'custom-accident-marker',
    html: `
      <div style="
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ef4444;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
        animation: pulse 1.2s infinite;
      ">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

// Helper component to initialize Leaflet map center once and handle explicit recenter without resetting user zoom
const MapController = ({ position, recenterCount, onUserInteraction }) => {
  const map = useMap();
  const hasInitializedRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Initial centering only once on first valid GPS fix
  useEffect(() => {
    if (!map || !position || !position.lat || !position.lng || isNaN(position.lat)) return;

    if (!hasInitializedRef.current) {
      map.setView([position.lat, position.lng], map.getZoom() || 16, { animate: false });
      hasInitializedRef.current = true;
    }
  }, [map, position]);

  // Handle explicit manual recenter button click
  useEffect(() => {
    if (recenterCount > 0 && position && position.lat && position.lng) {
      userInteractedRef.current = false;
      map.setView([position.lat, position.lng], map.getZoom() || 16, { animate: true });
    }
  }, [recenterCount, map, position]);

  // Detect user zooming, dragging, or panning
  useEffect(() => {
    if (!map) return;

    const handleInteraction = () => {
      userInteractedRef.current = true;
      if (onUserInteraction) onUserInteraction();
    };

    map.on("zoomstart", handleInteraction);
    map.on("dragstart", handleInteraction);
    map.on("movestart", handleInteraction);

    return () => {
      map.off("zoomstart", handleInteraction);
      map.off("dragstart", handleInteraction);
      map.off("movestart", handleInteraction);
    };
  }, [map, onUserInteraction]);

  return null;
};

// Map Tile Layers Config
const TILE_LAYERS = {
  dark: {
    name: 'Cyber Dark',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  street: {
    name: 'Street View',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  satellite: {
    name: 'Satellite View',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

// Predefined route simulation coordinates (Bangalore Ring Road Loop)
const SIMULATION_PATH = [
  { lat: 12.9716, lng: 77.5946, speed: 42, heading: 45 },
  { lat: 12.9735, lng: 77.5970, speed: 48, heading: 50 },
  { lat: 12.9760, lng: 77.6010, speed: 55, heading: 60 },
  { lat: 12.9790, lng: 77.6060, speed: 62, heading: 70 },
  { lat: 12.9820, lng: 77.6120, speed: 68, heading: 80 },
  { lat: 12.9840, lng: 77.6180, speed: 74, heading: 95 },
  { lat: 12.9830, lng: 77.6240, speed: 70, heading: 110 },
  { lat: 12.9800, lng: 77.6290, speed: 65, heading: 130 },
  { lat: 12.9750, lng: 77.6330, speed: 58, heading: 155 },
  { lat: 12.9700, lng: 77.6350, speed: 52, heading: 180 },
  { lat: 12.9640, lng: 77.6340, speed: 46, heading: 205 },
  { lat: 12.9590, lng: 77.6300, speed: 40, heading: 225 },
  { lat: 12.9550, lng: 77.6230, speed: 45, heading: 250 },
  { lat: 12.9540, lng: 77.6150, speed: 52, heading: 270 },
  { lat: 12.9560, lng: 77.6070, speed: 58, heading: 295 },
  { lat: 12.9610, lng: 77.6000, speed: 50, heading: 320 },
  { lat: 12.9660, lng: 77.5960, speed: 44, heading: 345 }
];

const VehicleTracking = () => {
  const {
    location: phoneLocation,
    error: gpsError,
    loading: gpsLoading,
    permissionStatus,
    isTracking,
    startTracking,
    stopTracking
  } = usePhoneGPS(false);

  // Core States
  const [liveLocation, setLiveLocation] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [mapStyle, setMapStyle] = useState('street');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recenterCount, setRecenterCount] = useState(0);

  // ESP32 Telemetry State
  const [esp32Data, setEsp32Data] = useState({
    ax: 0.0,
    ay: 0.0,
    az: 1.0,
    totalG: 1.0,
    impact: false,
    emergency: false
  });

  const [accidents, setAccidents] = useState([]);
  const [dbAccidentCount, setDbAccidentCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [wsPhoneStatus, setWsPhoneStatus] = useState('disconnected');
  const [wsDashStatus, setWsDashStatus] = useState('disconnected');

  // Simulator States
  const [isSimulating, setIsSimulating] = useState(false);
  const simTimerRef = useRef(null);
  const simStateRef = useRef(null);

  const phoneWsRef = useRef(null);
  const dashWsRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Dynamic API & WS URLs pointing to FastAPI (Port 8000) or Node (Port 5000)
  const getWsUrl = (path) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = '8000';
    return `${protocol}//${host}:${port}${path}`;
  };

  const getApiUrl = (path) => {
    const protocol = window.location.protocol;
    const host = window.location.hostname || 'localhost';
    const port = '8000';
    return `${protocol}//${host}:${port}${path}`;
  };

  // Synthesize Warning Beep Tone on High Impact / Accident
  const triggerAudioAlert = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }, [soundEnabled]);

  // 1. Fetch telemetry & WebSockets from FastAPI / Express
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connectDashboardWs = () => {
      setWsDashStatus('connecting');
      try {
        ws = new WebSocket(getWsUrl('/ws/dashboard'));
        dashWsRef.current = ws;

        ws.onopen = () => {
          setWsDashStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'location_update' && message.data) {
              const loc = message.data;
              setLiveLocation(loc);
              setLastUpdateTime(new Date().toLocaleTimeString());
              if (loc.latitude && loc.longitude) {
                setRouteHistory(prev => {
                  const last = prev[prev.length - 1];
                  if (!last || last[0] !== loc.latitude || last[1] !== loc.longitude) {
                    return [...prev.slice(-300), [loc.latitude, loc.longitude]];
                  }
                  return prev;
                });
              }
            } else if (message.type === 'esp32_update' && message.data) {
              setEsp32Data(message.data);
            } else if (message.type === 'accident_report' && message.data) {
              setAccidents(prev => [message.data, ...prev.filter(a => a.id !== message.data.id)]);
              triggerAudioAlert();
            }
          } catch (e) {
            console.error('Dashboard WS message parse error:', e);
          }
        };

        ws.onerror = () => {
          setWsDashStatus('disconnected');
        };

        ws.onclose = () => {
          setWsDashStatus('disconnected');
          reconnectTimeout = setTimeout(connectDashboardWs, 3000);
        };
      } catch (err) {
        setWsDashStatus('disconnected');
        reconnectTimeout = setTimeout(connectDashboardWs, 3000);
      }
    };

    connectDashboardWs();

    // Multi-server polling loop (FastAPI port 8000 & Node port 5000)
    const pollInterval = setInterval(() => {
      if (isSimulating) return; // Skip polling when simulator is active

      const hostname = window.location.hostname || "localhost";
      const targetUrls = [
        getApiUrl('/api/vehicle'),
        `http://${hostname}:5000/api/vehicle`,
        `http://${hostname}:5000/api/location`
      ];

      for (const targetUrl of targetUrls) {
        fetch(targetUrl)
          .then(res => res.json())
          .then(data => {
            if (data && data.latitude != null && data.longitude != null) {
              const loc = {
                latitude: Number(data.latitude),
                longitude: Number(data.longitude),
                accuracy: data.accuracy || 5,
                speed: data.speed || 0,
                heading: data.heading || 0
              };
              setLiveLocation(loc);
              if (data.ax !== undefined || data.totalG !== undefined) {
                setEsp32Data({
                  ax: data.ax || 0.0,
                  ay: data.ay || 0.0,
                  az: data.az || 1.0,
                  totalG: data.totalG || 1.0,
                  impact: !!data.impact,
                  emergency: !!data.emergency
                });
              }
              setLastUpdateTime(new Date().toLocaleTimeString());
              setRouteHistory(prev => {
                const last = prev[prev.length - 1];
                if (!last || last[0] !== loc.latitude || last[1] !== loc.longitude) {
                  return [...prev.slice(-300), [loc.latitude, loc.longitude]];
                }
                return prev;
              });
            }
          })
          .catch(() => {});
      }

      // Fetch accidents count from FastAPI / Express
      fetch(getApiUrl('/api/accidents'))
        .then(res => res.json())
        .then(data => {
          if (data) {
            const cnt = data.count !== undefined ? data.count : (Array.isArray(data.accidents) ? data.accidents.length : (Array.isArray(data) ? data.length : 0));
            setDbAccidentCount(cnt);
          }
        })
        .catch(() => {
          fetch(`http://${hostname}:5000/api/accidents`)
            .then(res => res.json())
            .then(data => {
              const cnt = data.count !== undefined ? data.count : (Array.isArray(data.accidents) ? data.accidents.length : 0);
              setDbAccidentCount(cnt);
            })
            .catch(() => {});
        });
    }, 1000);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, [triggerAudioAlert, isSimulating]);

  // 2. Phone WebSocket Connection (for Phone GPS or Simulator stream)
  useEffect(() => {
    if (!isTracking && !isSimulating) {
      if (phoneWsRef.current) {
        phoneWsRef.current.close();
        phoneWsRef.current = null;
      }
      setWsPhoneStatus('standby');
      return;
    }

    let ws;
    setWsPhoneStatus('connecting');

    try {
      ws = new WebSocket(getWsUrl('/ws/phone'));
      phoneWsRef.current = ws;

      ws.onopen = () => {
        setWsPhoneStatus('connected');
      };

      ws.onerror = () => {
        setWsPhoneStatus('disconnected');
      };

      ws.onclose = () => {
        setWsPhoneStatus('disconnected');
      };
    } catch (err) {
      setWsPhoneStatus('disconnected');
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isTracking, isSimulating]);

  // 3. Sync Phone GPS Location to live state & backend
  useEffect(() => {
    if (isTracking && phoneLocation.latitude) {
      const payload = {
        latitude: phoneLocation.latitude,
        longitude: phoneLocation.longitude,
        accuracy: phoneLocation.accuracy,
        speed: phoneLocation.speed,
        heading: phoneLocation.heading,
        timestamp: phoneLocation.timestamp || new Date().toISOString(),
        vehicle_id: 'vehicle-1'
      };

      if (phoneWsRef.current && phoneWsRef.current.readyState === WebSocket.OPEN) {
        phoneWsRef.current.send(JSON.stringify(payload));
      }

      fetch(getApiUrl('/api/location'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});

      setLiveLocation(payload);
      setLastUpdateTime(new Date().toLocaleTimeString());
      setRouteHistory(prev => [...prev.slice(-300), [payload.latitude, payload.longitude]]);
    }
  }, [phoneLocation, isTracking]);

  // ESP32 Hook Integration
  const { data: esp32Hook, connected: esp32HookConnected } = useESP32Telemetry();

  const displayLocation = (isTracking && phoneLocation.latitude) 
    ? phoneLocation 
    : liveLocation;

  const activeTelemetry = esp32HookConnected && esp32Hook.hasData ? {
    ax: esp32Hook.accel_x,
    ay: esp32Hook.accel_y,
    az: esp32Hook.accel_z,
    totalG: esp32Hook.total_g,
    impact: esp32Hook.impact,
    emergency: esp32Hook.impact || esp32Hook.alert_active
  } : esp32Data;

  const isEmergency = activeTelemetry.impact || activeTelemetry.emergency;

  // Auto sound alert & auto record on high G-force
  useEffect(() => {
    if (activeTelemetry.impact || activeTelemetry.totalG > 2.5) {
      triggerAudioAlert();
      const lat = displayLocation?.latitude;
      const lng = displayLocation?.longitude;
      const nowStr = new Date().toISOString();
      const magnitude = Number((activeTelemetry.totalG || 3.2).toFixed(2));

      setAccidents(prev => {
        const lastAccident = prev[0];
        if (lastAccident && (Date.now() - new Date(lastAccident.timestamp).getTime()) < 5000) {
          return prev;
        }
        const autoRecord = {
          id: prev.length + 1,
          latitude: lat,
          longitude: lng,
          impact_magnitude: magnitude,
          timestamp: nowStr,
          created_at: nowStr,
          impact_level: magnitude > 4.0 ? 'SEVERE' : 'HIGH',
          event_status: 'ACTIVE',
          risk_score: Math.min(100, Math.round(magnitude * 20))
        };
        return [autoRecord, ...prev];
      });
    }
  }, [activeTelemetry.impact, activeTelemetry.totalG, displayLocation, triggerAudioAlert]);

  // Live Driving Route Simulator logic (starts from CURRENT map location)
  useEffect(() => {
    if (isSimulating) {
      // Initialize starting position from current display location or fallback to current position
      const startLat = displayLocation?.latitude;
      const startLng = displayLocation?.longitude;
      const startHeading = displayLocation?.heading || 45;

      simStateRef.current = {
        lat: startLat,
        lng: startLng,
        heading: startHeading,
        speed: displayLocation?.speed && displayLocation.speed > 10 ? displayLocation.speed : 45
      };

      simTimerRef.current = setInterval(() => {
        if (!simStateRef.current) return;

        let { lat, lng, heading, speed } = simStateRef.current;

        // Smoothly vary speed (35 km/h to 75 km/h)
        speed = Math.min(85, Math.max(30, speed + (Math.random() - 0.48) * 4));

        // Gently turn heading over time (simulates realistic road curves)
        heading = (heading + (Math.random() - 0.48) * 8 + 360) % 360;

        // Calculate latitude and longitude delta from current position
        const distKmPerSec = (speed / 3600); // km traveled in 1s
        const latDelta = (distKmPerSec / 111.32) * Math.cos(heading * Math.PI / 180);
        const lngDelta = (distKmPerSec / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(heading * Math.PI / 180);

        const newLat = Number((lat + latDelta).toFixed(6));
        const newLng = Number((lng + lngDelta).toFixed(6));
        const newHeading = Math.round(heading);
        const newSpeed = Math.round(speed);

        simStateRef.current = {
          lat: newLat,
          lng: newLng,
          heading: newHeading,
          speed: newSpeed
        };

        const simPayload = {
          latitude: newLat,
          longitude: newLng,
          accuracy: 4.0,
          speed: newSpeed,
          heading: newHeading,
          timestamp: new Date().toISOString()
        };

        setLiveLocation(simPayload);
        setLastUpdateTime(new Date().toLocaleTimeString());
        setRouteHistory(prevHistory => [...prevHistory.slice(-400), [newLat, newLng]]);

        // MPU6500 fluctuations
        const randAx = (Math.random() - 0.5) * 0.35;
        const randAy = (Math.random() - 0.5) * 0.35;
        const randAz = 0.96 + (Math.random() - 0.5) * 0.1;
        const totalG = Number(Math.sqrt(randAx*randAx + randAy*randAy + randAz*randAz).toFixed(2));

        setEsp32Data({
          ax: Number(randAx.toFixed(2)),
          ay: Number(randAy.toFixed(2)),
          az: Number(randAz.toFixed(2)),
          totalG,
          impact: false,
          emergency: false
        });

        // Send over WebSocket if connected
        if (phoneWsRef.current && phoneWsRef.current.readyState === WebSocket.OPEN) {
          phoneWsRef.current.send(JSON.stringify(simPayload));
        }

        // Post to backends so other viewers see live motion
        fetch(getApiUrl('/api/location'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(simPayload)
        }).catch(() => {});

      }, 1000);
    } else {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
      simStateRef.current = null;
    }

    return () => {
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
      }
    };
  }, [isSimulating]);

  // Simulate Crash Event
  const handleSimulateAccident = async () => {
    triggerAudioAlert();
    const lat = displayLocation?.latitude;
    const lng = displayLocation?.longitude;
    const magnitude = Number((3.5 + Math.random() * 2.2).toFixed(2));
    const nowStr = new Date().toISOString();

    const newAccident = {
      id: accidents.length + 1,
      latitude: lat,
      longitude: lng,
      impact_magnitude: magnitude,
      timestamp: nowStr,
      created_at: nowStr,
      impact_level: magnitude > 4.0 ? 'SEVERE' : 'HIGH',
      event_status: 'ACTIVE',
      risk_score: Math.min(100, Math.round(magnitude * 20))
    };

    setAccidents(prev => [newAccident, ...prev.filter(a => a.id !== newAccident.id)]);
    setEsp32Data(prev => ({
      ...prev,
      impact: true,
      emergency: true,
      totalG: magnitude
    }));
    setLastUpdateTime(new Date().toLocaleTimeString());

    try {
      await fetch(getApiUrl('/api/accident'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccident)
      });
    } catch (e) {}

    try {
      await fetch('/api/accident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccident)
      });
    } catch (e) {}
  };

  // Export GPS Route Logs as JSON
  const handleExportRoute = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      exportTime: new Date().toISOString(),
      routeHistory,
      accidentsCount: accidents.length,
      accidents
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `smartguard_gps_route_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Clear Route History
  const handleClearRoute = () => {
    setRouteHistory([]);
  };

  // Clear Crash Markers
  const handleClearAccidents = async () => {
    setAccidents([]);
    setDbAccidentCount(0);
    try {
      await fetch(getApiUrl('/api/accidents'), { method: 'DELETE' });
    } catch (e) {}
    try {
      await fetch('/api/accidents', { method: 'DELETE' });
    } catch (e) {}
  };

  // Recenter Map
  const handleRecenter = () => {
    setRecenterCount(prev => prev + 1);
  };

  // Cardinal direction label helper
  const getCardinalDirection = (deg = 0) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return directions[index];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-3 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-900/30">
              <Navigation className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Real-Time Vehicle Tracking
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  LIVE V2.0
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                AI Fleet Telemetry, Smartphone GPS & ESP32 MPU6500 Multi-Sensor Guardian System
              </p>
            </div>
          </div>

          {/* Quick Action Top Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                soundEnabled 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                  : 'bg-rose-950/40 border-rose-800 text-rose-400'
              }`}
              title="Toggle Audio Alarm Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>

            <button
              onClick={handleRecenter}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
              title="Recenter Map View"
            >
              <Maximize2 className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Recenter Map</span>
            </button>

            <button
              onClick={handleExportRoute}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
              title="Export Recorded Track Points"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Export GPS Track</span>
            </button>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        {isEmergency && (
          <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-5 flex items-center justify-between text-rose-200 animate-pulse shadow-2xl shadow-rose-950/80">
            <div className="flex items-center space-x-4">
              <ShieldAlert className="w-9 h-9 text-rose-400 animate-bounce flex-shrink-0" />
              <div>
                <h3 className="text-lg font-extrabold text-rose-100 uppercase tracking-wide">
                  🚨 CRITICAL IMPACT / EMERGENCY DETECTED!
                </h3>
                <p className="text-xs text-rose-300 mt-0.5">
                  ESP32 MPU6500 accelerometer measured total impact: <strong>{Number(activeTelemetry.totalG).toFixed(2)} G</strong>. Active hazard beacons triggered!
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow">
              HAZARD HIGH
            </span>
          </div>
        )}

        {/* HUD Widgets: Speedometer, Compass & Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Speedometer Arc Gauge HUD */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Vehicle Speed
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {displayLocation?.speed != null ? Math.round(displayLocation.speed) : 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold uppercase">km/h</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {displayLocation?.speed > 100 ? '⚠️ High Speed Zone' : 'Standard Cruise Speed'}
              </p>
            </div>

            {/* Circular Speed Arc visual */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800 stroke-current"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 stroke-current transition-all duration-500"
                  strokeDasharray={`${Math.min(100, Math.round(((displayLocation?.speed || 0) / 160) * 100))}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Gauge className="w-6 h-6 text-emerald-400 absolute" />
            </div>
          </div>

          {/* Directional Heading Compass HUD */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Heading / Direction
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black font-mono text-indigo-400">
                  {displayLocation?.heading != null ? `${Math.round(displayLocation.heading)}°` : '0°'}
                </span>
                <span className="text-xs text-indigo-300 font-bold uppercase">
                  {getCardinalDirection(displayLocation?.heading || 0)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Gyroscope Bearings Lock
              </p>
            </div>

            {/* Rotating Compass Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center bg-slate-950/80 rounded-full border border-slate-700">
              <div 
                className="w-12 h-12 flex items-center justify-center transition-transform duration-300"
                style={{ transform: `rotate(${displayLocation?.heading || 0}deg)` }}
              >
                <polygon points="12 2 17 20 12 16 7 20 12 2" fill="#818cf8" />
              </div>
              <span className="text-[9px] font-black text-slate-400 absolute top-1">N</span>
            </div>
          </div>

          {/* WebSocket & GPS Feed Status Card */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                WebSocket Streams
              </span>
              <Activity className={`w-5 h-5 ${wsDashStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div className="space-y-1.5 mt-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">Dashboard (/ws/dashboard):</span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                  wsDashStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {wsDashStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">Phone (/ws/phone):</span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                  wsPhoneStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  wsPhoneStatus === 'standby' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {wsPhoneStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Recorded Accidents Card */}
          {(() => {
            const totalAccidentCount = Math.max(accidents.length, dbAccidentCount);
            return (
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Accidents Detected
                  </span>
                  <ShieldAlert className={`w-5 h-5 ${totalAccidentCount > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
                </div>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-black font-mono text-rose-400">
                    {totalAccidentCount}
                  </span>
                  <span className="text-xs text-slate-400">logged events</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Syncing with FastAPI & SQLite</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live Database Sync Active"></span>
                </p>
              </div>
            );
          })()}

        </div>

        {/* ESP32 Telemetry Bar Strip */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" /> ESP32 MPU6500 3-Axis Accelerometer Telemetry
            </h2>
            <span className="text-xs text-purple-400 font-mono font-semibold">
              Total G: {Number(activeTelemetry.totalG || 1.0).toFixed(2)} g
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">X-Axis Force</span>
              <p className="text-base font-bold text-purple-400 font-mono mt-0.5">
                {Number(activeTelemetry.ax || 0).toFixed(2)} g
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Y-Axis Force</span>
              <p className="text-base font-bold text-purple-400 font-mono mt-0.5">
                {Number(activeTelemetry.ay || 0).toFixed(2)} g
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Z-Axis Force</span>
              <p className="text-base font-bold text-purple-400 font-mono mt-0.5">
                {Number(activeTelemetry.az || 1.0).toFixed(2)} g
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Impact Hazard</span>
              <p className={`text-sm font-bold font-mono mt-0.5 ${isEmergency ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {isEmergency ? '🚨 IMPACT ALERT' : '🟢 STABLE'}
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-4 lg:col-span-1">
              <span className="text-[11px] text-slate-400">Breadcrumb Waypoints</span>
              <p className="text-base font-bold text-blue-400 font-mono mt-0.5">
                {routeHistory.length} <span className="text-xs text-slate-500 font-normal">points</span>
              </p>
            </div>
          </div>
        </div>

        {/* Dedicated Accessible Map Style Selector Bar */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">Map Style View</h3>
              <p className="text-xs text-slate-400">Select interactive tile mode for live map rendering</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(TILE_LAYERS).map(layerKey => {
              const layer = TILE_LAYERS[layerKey];
              const isActive = mapStyle === layerKey;
              return (
                <button
                  key={layerKey}
                  onClick={() => setMapStyle(layerKey)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 border shadow-md cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-blue-900/40 ring-2 ring-blue-500/50 scale-105'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base">{layer.icon}</span>
                  <span>{layer.name}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1 animate-pulse"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leaflet Map Card */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
          
          {/* Top Live Stats Overlay Pill */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono font-semibold text-slate-300 shadow-xl flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{lastUpdateTime || 'Live Stream Active'}</span>
              </span>
              {routeHistory.length > 0 && (
                <span className="text-blue-400 font-bold border-l border-slate-800 pl-3">
                  Trail: {routeHistory.length} pts
                </span>
              )}
            </div>
          </div>

          {/* Leaflet Map Rendering Area */}
          <div className="h-[480px] sm:h-[580px] w-full z-0">
            {displayLocation?.latitude && displayLocation?.longitude ? (
              <MapContainer
                center={[displayLocation.latitude, displayLocation.longitude]}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution={TILE_LAYERS[mapStyle].attribution}
                  url={TILE_LAYERS[mapStyle].url}
                />

                {/* Route History Polyline Trail */}
                {routeHistory.length > 1 && (
                  <Polyline
                    positions={routeHistory}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: 5,
                      opacity: 0.85,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}
                
                {/* Live Vehicle Marker */}
                <Marker
                  position={[displayLocation.latitude, displayLocation.longitude]}
                  icon={createVehicleIcon(displayLocation.heading || 0)}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 text-slate-900 font-sans min-w-[180px]">
                      <h4 className="font-extrabold text-blue-600 flex items-center gap-1 text-sm">
                        <Navigation className="w-4 h-4" /> Live Smart Vehicle
                      </h4>
                      <div className="text-xs space-y-1 mt-2 font-mono text-slate-700">
                        <p><strong>Lat:</strong> {displayLocation.latitude}</p>
                        <p><strong>Lng:</strong> {displayLocation.longitude}</p>
                        <p><strong>Speed:</strong> {displayLocation.speed || 0} km/h</p>
                        <p><strong>Heading:</strong> {displayLocation.heading || 0}° ({getCardinalDirection(displayLocation.heading)})</p>
                        <p><strong>Total G:</strong> {activeTelemetry.totalG} g</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Map Controller (centers once on initial load, keeps zoom on GPS updates) */}
                <MapController
                  position={{ lat: displayLocation.latitude, lng: displayLocation.longitude }}
                  recenterCount={recenterCount}
                />

                {/* Red Accident Event Markers */}
                {accidents.map((acc) => (
                  <Marker
                    key={acc.id}
                    position={[acc.latitude, acc.longitude]}
                    icon={createAccidentIcon()}
                  >
                    <Popup>
                      <div className="p-2 text-slate-900 font-sans">
                        <h4 className="font-extrabold text-rose-600 flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4 text-rose-600" /> ACCIDENT EVENT #{acc.id}
                        </h4>
                        <div className="text-xs space-y-1 mt-2 font-mono">
                          <p><strong>Impact Magnitude:</strong> <span className="text-rose-600 font-bold">{acc.impact_magnitude} G</span></p>
                          <p><strong>Latitude:</strong> {acc.latitude}</p>
                          <p><strong>Longitude:</strong> {acc.longitude}</p>
                          <p><strong>Timestamp:</strong> {acc.timestamp || acc.created_at}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-950/95 text-slate-400 p-6 text-center space-y-4">
                <MapPin className="w-14 h-14 text-slate-600 animate-bounce" />
                <h3 className="text-xl font-bold text-slate-200">
                  {gpsLoading ? 'Acquiring GPS Signal Lock...' : 'Vehicle Location Standby'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Click <strong>"Start Live Drive Simulator"</strong> to test real-time vehicle movement route tracking, or start your phone's GPS transmitter.
                </p>
                <button
                  onClick={() => setIsSimulating(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-indigo-500 transition"
                >
                  Start Live Drive Simulator Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Action Control Panel */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-200">Vehicle Telemetry Control Center</h3>
            <p className="text-xs text-slate-400 mt-1">
              Toggle live simulation modes, phone GPS broadcasts, impact test events, and log exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            
            {/* Live Drive Simulator Toggle */}
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-5 py-3 font-bold rounded-xl shadow-lg transition flex items-center space-x-2 text-sm ${
                isSimulating 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30 border border-amber-400/40 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Driving Simulator</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Live Drive Simulator</span>
                </>
              )}
            </button>

            {/* Phone GPS Transmitter Toggle */}
            {!isTracking ? (
              <button
                onClick={startTracking}
                className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-900/30 transition flex items-center space-x-2"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Start Phone GPS</span>
              </button>
            ) : (
              <button
                onClick={stopTracking}
                className="px-5 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm shadow-lg transition flex items-center space-x-2 border border-slate-600"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Stop Phone GPS</span>
              </button>
            )}

            {/* Simulate Impact / Crash Event */}
            <button
              onClick={handleSimulateAccident}
              className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-900/30 transition flex items-center space-x-2 border border-rose-500/40"
            >
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>Simulate Crash Event</span>
            </button>

            {/* Clear Crash Markers */}
            {(accidents.length > 0 || dbAccidentCount > 0) && (
              <button
                onClick={handleClearAccidents}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 font-bold rounded-xl text-xs border border-slate-700 transition flex items-center space-x-2 shadow"
                title="Remove crash markers from map and reset database event count"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Clear Crash Events ({Math.max(accidents.length, dbAccidentCount)})</span>
              </button>
            )}

            {/* Clear Route History */}
            {routeHistory.length > 0 && (
              <button
                onClick={handleClearRoute}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition"
                title="Clear Breadcrumb Polyline History"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default VehicleTracking;