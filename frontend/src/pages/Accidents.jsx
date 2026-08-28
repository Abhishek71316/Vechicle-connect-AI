import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Shield, 
  Navigation, 
  RefreshCw, 
  Zap, 
  Trash2, 
  CheckCircle2,
  Activity,
  Wifi
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useESP32Telemetry from '../hooks/useESP32Telemetry';
import usePhoneGPS from '../hooks/usePhoneGPS';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Red pulsing accident marker icon for Leaflet map
const createAccidentMarker = () => {
  return L.divIcon({
    className: 'custom-accident-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ef4444;
        border-radius: 50%;
        border: 3px solid #ffffff;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
        animation: pulse 1s infinite;
      ">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="width: 22px; height: 22px;">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const Accidents = () => {
  const [accidents, setAccidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const { data: esp32Data, connected: esp32Connected } = useESP32Telemetry();
  const { location: phoneLocation } = usePhoneGPS(true);

  // Sync phone GPS location to backend on port 5000
  useEffect(() => {
    if (phoneLocation && phoneLocation.latitude != null && phoneLocation.longitude != null) {
      const hostname = window.location.hostname || "localhost";
      fetch(`http://${hostname}:5000/api/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: phoneLocation.latitude,
          longitude: phoneLocation.longitude,
          accuracy: phoneLocation.accuracy,
          speed: phoneLocation.speed,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    }
  }, [phoneLocation]);

  // Fetch live accidents from backend server (port 5000 / relative /api/accidents)
  const fetchAccidents = useCallback(async () => {
    const hostname = window.location.hostname || "localhost";
    const targetUrls = [
      `http://${hostname}:5000/api/accidents`,
      `/api/accidents`,
      `http://${hostname}:8000/api/accidents`
    ];

    for (const url of targetUrls) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const list = data?.accidents || (Array.isArray(data) ? data : []);
          setAccidents(list);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  // Continuous real-time polling every 1.5 seconds
  useEffect(() => {
    fetchAccidents();
    const interval = setInterval(fetchAccidents, 1500);
    return () => clearInterval(interval);
  }, [fetchAccidents]);

  // Real-time trigger when MPU6500 detects live hardware impact
  useEffect(() => {
    if (esp32Data && (esp32Data.impact || esp32Data.total_g >= 2.5)) {
      fetchAccidents();
    }
  }, [esp32Data.impact, esp32Data.total_g, fetchAccidents]);

  // Trigger simulated MPU6500 accident event for instant testing
  const triggerSimulatedAccident = async () => {
    setSimulating(true);
    const hostname = window.location.hostname || "localhost";
    const targetUrl = `http://${hostname}:5000/api/accident`;

    const lat = phoneLocation.latitude;
    const lng = phoneLocation.longitude;

    try {
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          impact_magnitude: 3.82,
          speed: 54,
          heading: 85
        })
      });
      await fetchAccidents();
    } catch (e) {
      console.error('Failed to trigger simulated accident:', e);
    } finally {
      setTimeout(() => setSimulating(false), 800);
    }
  };

  // Clear accident history logs
  const clearAccidents = async () => {
    const hostname = window.location.hostname || "localhost";
    const targetUrl = `http://${hostname}:5000/api/accidents/clear`;
    try {
      await fetch(targetUrl, { method: 'POST' });
      setAccidents([]);
      setSelectedAccident(null);
    } catch (e) {
      console.error('Failed to clear accidents:', e);
    }
  };

  const getSeverityColor = (severity) => {
    const sev = (severity || 'HIGH').toString().toUpperCase();
    switch (sev) {
      case 'SEVERE': return 'text-red-400 bg-red-500/20 border-red-500/40';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
      case 'MODERATE': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'LOW': return 'text-green-400 bg-green-500/20 border-green-500/40';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
    }
  };

  const getStatusColor = (status) => {
    const st = (status || 'ACTIVE').toString().toUpperCase();
    switch (st) {
      case 'RESOLVED': return 'text-green-400';
      case 'ACTIVE': return 'text-red-400 animate-pulse';
      case 'INVESTIGATING': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (loading && accidents.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Accident History & Logs</h1>
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <p className="text-gray-400 animate-pulse">Loading accident detection logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/90 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-red-400 w-8 h-8" />
            Accident History & Real-Time Detection Logs
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time MPU6500 sensor impact detection, emergency GPS coordinates, and TextBee SMS family alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MPU6500 Live Sensor Connection Badge */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-bold">
            <Wifi size={14} className="animate-pulse" />
            <span>MPU6500 Monitor: LIVE POLLING (1.5s)</span>
          </div>

          {/* Simulate MPU6500 Accident Event Button */}
          <button
            onClick={triggerSimulatedAccident}
            disabled={simulating}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {simulating ? <RefreshCw className="animate-spin w-4 h-4" /> : <Zap size={15} />}
            <span>{simulating ? 'Processing Impact...' : 'Simulate MPU6500 Accident'}</span>
          </button>

          {/* Clear Logs Button */}
          {accidents.length > 0 && (
            <button
              onClick={clearAccidents}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl border border-gray-600 transition-all"
              title="Clear Accident History"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Accident Detail / List Display */}
      {selectedAccident ? (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-6 shadow-2xl">
          <button
            onClick={() => setSelectedAccident(null)}
            className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1"
          >
            ← Back to all accident logs ({accidents.length} total)
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-red-400" /> Incident Report #{selectedAccident.id || 1}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs font-medium">Timestamp</p>
                  <p className="text-white font-mono font-bold text-sm mt-1">
                    {selectedAccident.timestamp ? new Date(selectedAccident.timestamp).toLocaleString() : 'Just now'}
                  </p>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs font-medium">Impact Level</p>
                  <p className={`font-mono font-bold text-sm mt-1 ${getSeverityColor(selectedAccident.impact_level)}`}>
                    {selectedAccident.impact_level || 'HIGH'}
                  </p>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs font-medium">MPU6500 Force</p>
                  <p className="text-rose-400 font-mono font-black text-lg mt-0.5">
                    {selectedAccident.impact_magnitude ? `${Number(selectedAccident.impact_magnitude).toFixed(2)} G` : '3.82 G'}
                  </p>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-400 text-xs font-medium">Event Status</p>
                  <p className={`font-mono font-bold text-sm mt-1 ${getStatusColor(selectedAccident.event_status)}`}>
                    {selectedAccident.event_status || 'ACTIVE'}
                  </p>
                </div>
              </div>

              {/* Location Coordinates Card */}
              <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <MapPin size={16} className="text-red-400" />
                  <span className="text-xs font-semibold uppercase">Incident Coordinates</span>
                </div>
                <p className="text-white font-mono text-base font-bold">
                  {selectedAccident.latitude != null ? selectedAccident.latitude.toFixed(6) : 'N/A'}, {selectedAccident.longitude != null ? selectedAccident.longitude.toFixed(6) : 'N/A'}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${selectedAccident.latitude},${selectedAccident.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline inline-block mt-2"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </div>

            {/* Incident Leaflet Map */}
            <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 h-[280px] lg:h-full min-h-[250px]">
              <MapContainer
                center={[selectedAccident.latitude || 0, selectedAccident.longitude || 0]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={[selectedAccident.latitude || 0, selectedAccident.longitude || 0]}
                  icon={createAccidentMarker()}
                >
                  <Popup>
                    <div className="text-slate-900 font-sans p-1">
                      <h4 className="font-bold text-rose-600">Accident Incident Location</h4>
                      <p className="text-xs font-mono">{selectedAccident.latitude?.toFixed(5)}, {selectedAccident.longitude?.toFixed(5)}</p>
                      <p className="text-xs font-mono">Force: {selectedAccident.impact_magnitude || 3.82} G</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Detected Accident Events ({accidents.length})
            </h2>
            <span className="text-xs text-gray-400 font-mono">Auto-Refreshing Live Feed</span>
          </div>

          {accidents.length === 0 ? (
            <div className="text-center py-14">
              <Shield size={52} className="text-emerald-500/60 mx-auto mb-3 animate-pulse" />
              <h3 className="text-lg font-bold text-gray-200">No Accident Events Detected</h3>
              <p className="text-gray-400 text-sm mt-1 mb-4">Smart Guard AI is actively monitoring vehicle sensors for collision hazards.</p>
              
              <button
                onClick={triggerSimulatedAccident}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold inline-flex items-center space-x-2 transition-all"
              >
                <Zap size={14} />
                <span>Simulate MPU6500 Collision Event</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {accidents.map((accident, index) => (
                <div
                  key={accident.id || index}
                  onClick={() => setSelectedAccident(accident)}
                  className="bg-gray-900/80 hover:bg-gray-900 border border-gray-700/80 rounded-xl p-5 cursor-pointer transition-all hover:border-red-500/50 shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                        <AlertTriangle size={22} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-bold text-base">Impact Event #{accident.id || accidents.length - index}</span>
                          <span className="text-xs text-gray-400 font-mono">({accident.device_id || 'RG-001'})</span>
                        </div>
                        <span className="text-xs text-slate-400 block font-mono mt-0.5">
                          MPU6500 Force: <strong className="text-rose-400">{accident.impact_magnitude ? `${Number(accident.impact_magnitude).toFixed(2)} G` : '3.82 G'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getSeverityColor(accident.impact_level)}`}>
                        {accident.impact_level || 'HIGH'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-800 gap-2">
                    <div className="flex items-center space-x-1 font-mono">
                      <Clock size={14} className="text-indigo-400" />
                      <span>{accident.timestamp ? new Date(accident.timestamp).toLocaleString() : 'Just now'}</span>
                    </div>
                    <div className="flex items-center space-x-1 font-mono">
                      <MapPin size={14} className="text-rose-400" />
                      <span>{accident.latitude != null ? accident.latitude.toFixed(4) : 'N/A'}, {accident.longitude != null ? accident.longitude.toFixed(4) : 'N/A'}</span>
                    </div>
                    <span className={`font-mono font-bold ${getStatusColor(accident.event_status)}`}>
                      {accident.event_status || 'ACTIVE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Accidents;
