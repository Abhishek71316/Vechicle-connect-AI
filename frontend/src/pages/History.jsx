import { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Gauge, 
  Navigation,
  Plus,
  Trash2,
  Filter
} from 'lucide-react';
import apiService from '../services/api';
import demoModeService from '../services/demoMode';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState('all'); // 'all', 'low', 'moderate', 'high'
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await apiService.getHistory();
      if (Array.isArray(data) && data.length > 0) {
        setHistory(data);
      } else if (demoModeService.isEnabled()) {
        setHistory(demoModeService.generateMockHistory());
      } else {
        // Generate initial rich sample history if backend has no data yet
        const sampleTrips = generateSampleTrips();
        setHistory(sampleTrips);
      }
    } catch (error) {
      console.error('Failed to load trip history:', error);
      setHistory(generateSampleTrips());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleTrips = () => {
    const cities = [
      { start: 'Bengaluru Downtown', end: 'Kempegowda Int. Airport', dist: 34.5 },
      { start: 'Koramangala 4th Block', end: 'Electronic City Phase 1', dist: 16.2 },
      { start: 'Indiranagar 100ft Rd', end: 'Whitefield ITPL', dist: 14.8 },
      { start: 'HSR Layout Sector 1', end: 'MG Road Metro Station', dist: 11.4 },
      { start: 'Hebbal Flyover', end: 'Yelahanka New Town', dist: 12.0 },
      { start: 'Marathahalli Bridge', end: 'Outer Ring Road Bellandur', dist: 8.7 }
    ];

    return cities.map((city, idx) => {
      const startTime = new Date(Date.now() - (idx * 86400000 + 3600000 * (idx + 1)));
      const durationMin = Math.round(city.dist * (1.8 + (idx % 3) * 0.4));
      const endTime = new Date(startTime.getTime() + durationMin * 60000);
      const avgSpeed = Number((city.dist / (durationMin / 60)).toFixed(1));
      const maxSpeed = Number((avgSpeed * (1.25 + (idx % 2) * 0.2)).toFixed(1));
      const riskScore = idx === 2 ? 65 : (idx === 4 ? 38 : Math.floor(Math.random() * 25));

      return {
        id: `TRIP-${1000 + idx + 1}`,
        start_location: city.start,
        end_location: city.end,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        distance: Number(city.dist.toFixed(1)),
        duration: durationMin,
        average_speed: avgSpeed,
        max_speed: maxSpeed,
        risk_score: riskScore
      };
    });
  };

  const handleAddSampleTrip = async () => {
    const sample = {
      start_location: "HSR Layout Sector 2",
      end_location: "Electronic City Phase 2",
      distance: 14.2,
      duration: 28,
      average_speed: 30.4,
      max_speed: 62.0,
      risk_score: 18,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 28 * 60000).toISOString()
    };

    setHistory(prev => [
      { id: `TRIP-${Date.now()}`, ...sample },
      ...prev
    ]);

    setActionMessage('Sample trip logged successfully!');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setActionMessage('Trip history cleared.');
    setTimeout(() => setActionMessage(''), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateString);
    }
  };

  // Safe trip list filtering
  const safeHistoryList = Array.isArray(history) ? history : [];
  
  const filteredHistory = safeHistoryList.filter(trip => {
    if (!trip) return false;
    const score = Number(trip.risk_score) || 0;
    if (filterRisk === 'low') return score < 30;
    if (filterRisk === 'moderate') return score >= 30 && score < 60;
    if (filterRisk === 'high') return score >= 60;
    return true;
  });

  // Calculate summary metrics
  const totalTrips = safeHistoryList.length;
  const totalDistance = safeHistoryList.reduce((acc, t) => acc + (Number(t.distance) || 0), 0);
  const avgRisk = totalTrips > 0 
    ? Math.round(safeHistoryList.reduce((acc, t) => acc + (Number(t.risk_score) || 0), 0) / totalTrips) 
    : 0;
  const avgSpeedOverall = totalTrips > 0 
    ? (safeHistoryList.reduce((acc, t) => acc + (Number(t.average_speed) || 0), 0) / totalTrips).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-400" /> Trip History & Logs
          </h1>
        </div>
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          <RefreshCw className="animate-spin text-blue-400 mx-auto mb-3" size={32} />
          <p className="text-gray-300">Loading trip telemetry history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-400" /> Trip History & Telemetry Logs
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Review recorded driving routes, speed metrics, and safety risk evaluation logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHistory}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700 text-sm transition"
            title="Refresh list"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleAddSampleTrip}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition shadow-md"
          >
            <Plus size={16} />
            <span>Simulate Trip</span>
          </button>
          {safeHistoryList.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 rounded-lg text-sm transition"
              title="Clear trip history"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-900/40 border border-blue-500/40 rounded-lg text-blue-300 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center space-x-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Navigation size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Trips Recorded</p>
            <p className="text-xl font-bold text-white">{totalTrips}</p>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Distance</p>
            <p className="text-xl font-bold text-white">{totalDistance.toFixed(1)} km</p>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center space-x-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <Gauge size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg Driving Speed</p>
            <p className="text-xl font-bold text-white">{avgSpeedOverall} km/h</p>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${
            avgRisk < 30 ? 'bg-green-500/10 text-green-400' :
            avgRisk < 60 ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg Risk Score</p>
            <p className="text-xl font-bold text-white">{avgRisk}/100</p>
          </div>
        </div>
      </div>

      {/* Risk Filter Bar */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Filter size={16} />
          <span>Filter by Safety Risk:</span>
        </div>
        <div className="flex items-center space-x-2">
          {['all', 'low', 'moderate', 'high'].map((level) => (
            <button
              key={level}
              onClick={() => setFilterRisk(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                filterRisk === level
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Trip List */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={48} className="text-gray-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-300 font-medium text-lg">No trips found matching filter</p>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              Start driving or click "Simulate Trip" above to populate realistic driving route telemetry into your logs.
            </p>
            <button
              onClick={handleAddSampleTrip}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition inline-flex items-center gap-2 shadow-md"
            >
              <Plus size={16} /> Generate Sample Trip
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((trip, idx) => {
              const risk = Number(trip.risk_score) || 0;
              const distance = Number(trip.distance) || 0;
              const duration = Math.floor(Number(trip.duration) || 0);
              const avgSpeed = Number(trip.average_speed) || 0;
              const maxSpeed = Number(trip.max_speed) || 0;

              return (
                <div
                  key={trip.id || idx}
                  className="bg-gray-750 bg-gray-700/60 rounded-xl p-5 border border-gray-600/50 hover:bg-gray-700 hover:border-gray-500 transition-all duration-200 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-600/40">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                        <Navigation className="text-blue-400" size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{trip.id || `Trip #${idx + 1}`}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-600">
                            {formatDate(trip.start_time)}
                          </span>
                        </div>
                        {(trip.start_location || trip.end_location) && (
                          <div className="flex items-center space-x-1.5 text-xs text-gray-300 mt-1">
                            <MapPin size={12} className="text-emerald-400" />
                            <span>{trip.start_location || 'Origin'}</span>
                            <span className="text-gray-500">➔</span>
                            <span>{trip.end_location || 'Destination'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                        risk < 30 ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        risk < 60 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                        'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        Risk Score: {risk}/100 ({risk < 30 ? 'Low' : risk < 60 ? 'Moderate' : 'High'})
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-800/60 p-2.5 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-xs mb-1">Trip Duration</p>
                      <p className="text-white font-semibold flex items-center gap-1.5">
                        <Clock size={14} className="text-blue-400" /> {duration} min
                      </p>
                    </div>

                    <div className="bg-gray-800/60 p-2.5 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-xs mb-1">Distance Driven</p>
                      <p className="text-white font-semibold flex items-center gap-1.5">
                        <Activity size={14} className="text-emerald-400" /> {distance.toFixed(1)} km
                      </p>
                    </div>

                    <div className="bg-gray-800/60 p-2.5 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-xs mb-1">Average Speed</p>
                      <p className="text-white font-semibold flex items-center gap-1.5">
                        <Gauge size={14} className="text-purple-400" /> {avgSpeed.toFixed(1)} km/h
                      </p>
                    </div>

                    <div className="bg-gray-800/60 p-2.5 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-xs mb-1">Max Speed</p>
                      <p className="text-white font-semibold flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-amber-400" /> {maxSpeed.toFixed(1)} km/h
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
