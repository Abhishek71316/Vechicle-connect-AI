import { useEffect, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Crosshair, 
  Maximize2, 
  Activity, 
  AlertTriangle 
} from "lucide-react";

// Fix Leaflet default marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Directional vehicle marker icon with rotation & pulse ring
const createVehicleIcon = (heading = 0, isImpact = false) => {
  const color = isImpact ? '#ef4444' : '#3b82f6';
  const pulseColor = isImpact ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)';

  return L.divIcon({
    className: "custom-vehicle-tracking-marker",
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
          background: ${pulseColor};
          border: 2px solid ${color};
          animation: pulse ${isImpact ? '0.8s' : '2s'} infinite;
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
          <svg viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px;">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Red accident alert marker icon
const createAccidentIcon = () => {
  return L.divIcon({
    className: "custom-accident-marker",
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

// Map Tile Layers Configuration
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
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping'
  }
};

// Helper component to initialize map center once and handle explicit recenter without resetting user zoom
const MapController = ({ position, recenterTrigger, onUserInteraction }) => {
  const map = useMap();
  const hasInitializedRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Initial centering on first valid GPS fix
  useEffect(() => {
    if (!map || !position || position[0] === 0 || isNaN(position[0])) return;

    if (!hasInitializedRef.current) {
      map.setView(position, map.getZoom() || 16, { animate: false });
      hasInitializedRef.current = true;
    }
  }, [map, position]);

  // Handle explicit manual recenter button click
  useEffect(() => {
    if (recenterTrigger > 0 && position && position[0] !== 0 && !isNaN(position[0])) {
      userInteractedRef.current = false;
      map.setView(position, map.getZoom() || 16, { animate: true });
    }
  }, [recenterTrigger, map, position]);

  // Detect user zooming or panning
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

export default function VehicleMap({ 
  location: propLocation, 
  accidents = [], 
  isImpact = false,
  height = "450px" 
}) {
  const [location, setLocation] = useState(propLocation || null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [mapStyle, setMapStyle] = useState('street');
  const [autoRecenter, setAutoRecenter] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Dynamic API polling for location fallback
  const getLocation = async () => {
    const hostname = window.location.hostname || "localhost";
    const endpoints = [
      `http://${hostname}:5000/api/location`,
      `http://${hostname}:5000/api/vehicle`,
      "/api/location",
      "/api/vehicle"
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && data.latitude != null && data.longitude != null) {
            updateLocationState(data);
            return;
          }
        }
      } catch (error) {}
    }
  };

  const updateLocationState = (data) => {
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const newLoc = {
      latitude: lat,
      longitude: lng,
      speed: data.speed != null ? Number(data.speed) : 0,
      heading: data.heading != null ? Number(data.heading) : 0,
      accuracy: data.accuracy != null ? Number(data.accuracy) : null,
      timestamp: data.timestamp || new Date().toISOString()
    };

    setLocation(newLoc);

    // Append to route polyline history (limit to last 200 points)
    setRouteHistory(prev => {
      const lastPoint = prev[prev.length - 1];
      if (!lastPoint || lastPoint[0] !== lat || lastPoint[1] !== lng) {
        return [...prev.slice(-199), [lat, lng]];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (propLocation && propLocation.latitude != null && propLocation.longitude != null) {
      updateLocationState(propLocation);
    } else {
      getLocation();
    }

    const interval = setInterval(getLocation, 2000);
    return () => clearInterval(interval);
  }, [propLocation]);

  const currentLat = location?.latitude;
  const currentLng = location?.longitude;
  const hasFix = currentLat != null && currentLng != null;
  const position = hasFix ? [currentLat, currentLng] : [0, 0];

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
      {/* Map Control Bar Header */}
      <div className="p-4 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3 bg-gray-800/90">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Navigation className="text-blue-400 w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Vehicle Tracking Map
            </h2>
            <span className="text-[11px] text-gray-400 font-mono">
              {location ? `Speed: ${location.speed || 0} km/h | Heading: ${location.heading || 0}°` : 'Connecting to GPS...'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Map Layer Selector Toggles */}
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700 text-xs">
            {Object.keys(TILE_LAYERS).map(key => (
              <button
                key={key}
                onClick={() => setMapStyle(key)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  mapStyle === key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title={TILE_LAYERS[key].name}
              >
                <span className="mr-1">{TILE_LAYERS[key].icon}</span>
                <span className="hidden sm:inline">{TILE_LAYERS[key].name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Recenter Button */}
          <button
            onClick={() => {
              setAutoRecenter(true);
              setRecenterTrigger(prev => prev + 1);
            }}
            className="p-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-blue-400 transition-all border border-gray-600"
            title="Recenter Map on Vehicle"
          >
            <Crosshair size={16} />
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div style={{ height: height }} className="w-full relative">
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution={TILE_LAYERS[mapStyle].attribution}
            url={TILE_LAYERS[mapStyle].url}
          />

          <MapController
            position={position}
            recenterTrigger={recenterTrigger}
            onUserInteraction={() => setAutoRecenter(false)}
          />

          {/* Route History Polyline */}
          {routeHistory.length > 1 && (
            <Polyline
              positions={routeHistory}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
              dashArray="6, 8"
            />
          )}

          {/* Active Directional Vehicle Marker */}
          <Marker
            position={position}
            icon={createVehicleIcon(location?.heading || 0, isImpact)}
          >
            <Popup>
              <div className="text-gray-900 font-sans p-1">
                <p className="font-bold text-sm text-blue-600">Smart Vehicle (RG-001)</p>
                <div className="text-xs font-mono mt-1 space-y-0.5">
                  <p><strong>Lat:</strong> {currentLat != null ? currentLat.toFixed(6) : '---'}</p>
                  <p><strong>Lng:</strong> {currentLng != null ? currentLng.toFixed(6) : '---'}</p>
                  <p><strong>Speed:</strong> {location?.speed || 0} km/h</p>
                  <p><strong>Heading:</strong> {location?.heading || 0}°</p>
                  {location?.accuracy && <p><strong>Accuracy:</strong> ±{location.accuracy}m</p>}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Accident Event Markers */}
          {accidents.map((acc, idx) => (
            acc.latitude && acc.longitude ? (
              <Marker key={acc.id || idx} position={[acc.latitude, acc.longitude]} icon={createAccidentIcon()}>
                <Popup>
                  <div className="text-gray-900 font-sans p-1">
                    <p className="font-bold text-sm text-red-600">🚨 Accident Event #{acc.id || idx + 1}</p>
                    <div className="text-xs font-mono mt-1 space-y-0.5">
                      <p><strong>Impact:</strong> {acc.impact_magnitude || acc.impact_level || 'HIGH'} G</p>
                      <p><strong>Lat:</strong> {acc.latitude}</p>
                      <p><strong>Lng:</strong> {acc.longitude}</p>
                      <p><strong>Time:</strong> {acc.timestamp ? new Date(acc.timestamp).toLocaleTimeString() : 'Recent'}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </div>

      {/* Telemetry Strip Footer */}
      <div className="p-4 bg-gray-800/90 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700/60">
          <span className="text-xs text-gray-400 block mb-0.5">Latitude</span>
          <span className="text-sm font-mono font-bold text-white">{currentLat != null ? currentLat.toFixed(6) : 'Connecting...'}</span>
        </div>
        <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700/60">
          <span className="text-xs text-gray-400 block mb-0.5">Longitude</span>
          <span className="text-sm font-mono font-bold text-white">{currentLng != null ? currentLng.toFixed(6) : 'Connecting...'}</span>
        </div>
        <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700/60">
          <span className="text-xs text-gray-400 block mb-0.5">Speed</span>
          <span className="text-sm font-mono font-bold text-blue-400">{location?.speed || 0} km/h</span>
        </div>
        <div className="bg-gray-900/60 p-2.5 rounded-xl border border-gray-700/60">
          <span className="text-xs text-gray-400 block mb-0.5">Accuracy</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {location?.accuracy ? `±${location.accuracy}m` : 'High Precision'}
          </span>
        </div>
      </div>
    </div>
  );
}
