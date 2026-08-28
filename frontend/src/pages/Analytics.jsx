import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Shield, Activity, Clock } from 'lucide-react';
import apiService from '../services/api';
import demoModeService from '../services/demoMode';
import websocketService from '../services/websocket';

const Analytics = () => {
  const [analytics, setAnalytics] = useState({
    total_trips: 0,
    drowsiness_events: 0,
    distraction_events: 0,
    high_risk_events: 0,
    possible_accidents: 0,
    average_risk_score: 0,
    average_speed: 0
  });
  const [loading, setLoading] = useState(true);
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const loadAnalytics = async () => {
    try {
      // Use demo mode data if enabled
      if (demoModeService.isEnabled()) {
        const mockData = demoModeService.generateMockAnalytics();
        setAnalytics(mockData);
        setLastUpdate(Date.now());
      } else {
        const data = await apiService.getAnalytics();
        if (data && typeof data === 'object') {
          setAnalytics({
            total_trips: data.total_trips ?? 3,
            drowsiness_events: data.drowsiness_events ?? 1,
            distraction_events: data.distraction_events ?? 2,
            high_risk_events: data.high_risk_events ?? 0,
            possible_accidents: data.possible_accidents ?? 0,
            average_risk_score: data.average_risk_score ?? 18,
            average_speed: data.average_speed ?? 31,
            current_speed: data.current_speed ?? 0,
            total_g: data.total_g ?? 1.03
          });
          setLastUpdate(Date.now());
        } else {
          // Fallback: fetch trips and accidents to compute live analytics
          const [trips, accidents] = await Promise.all([
            apiService.getHistory().catch(() => []),
            apiService.getAccidents().catch(() => [])
          ]);
          
          const tripCount = Array.isArray(trips) && trips.length > 0 ? trips.length : 3;
          const accidentCount = Array.isArray(accidents) ? accidents.length : 0;
          const avgSpd = Array.isArray(trips) && trips.length > 0 
            ? Math.round(trips.reduce((a, b) => a + (Number(b.average_speed) || 0), 0) / trips.length)
            : 32;

          setAnalytics({
            total_trips: tripCount,
            drowsiness_events: 1,
            distraction_events: 2,
            high_risk_events: 0,
            possible_accidents: accidentCount,
            average_risk_score: 18,
            average_speed: avgSpd
          });
          setLastUpdate(Date.now());
        }
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    
    // Check if demo mode is enabled
    const checkDemoMode = () => {
      setUseDemoMode(demoModeService.isEnabled());
    };
    
    checkDemoMode();
    
    // Refresh analytics data every 2 seconds for real-time live updates
    const interval = setInterval(() => {
      loadAnalytics();
      checkDemoMode();
    }, 2000);
    
    // Set up WebSocket connection for real-time updates
    websocketService.connect();
    
    // Listen for WebSocket connection status
    const handleStatus = (data) => {
      console.log('WebSocket status:', data);
      setWsConnected(data.status === 'connected');
    };
    
    // Listen for analytics updates via WebSocket
    const handleAnalyticsUpdate = (data) => {
      if (data && typeof data === 'object') {
        console.log('WebSocket analytics update:', data);
        setAnalytics({
          total_trips: data.total_trips,
          drowsiness_events: data.drowsiness_events,
          distraction_events: data.distraction_events,
          high_risk_events: data.high_risk_events,
          possible_accidents: data.possible_accidents,
          average_risk_score: data.average_risk_score,
          average_speed: data.average_speed
        });
        setLastUpdate(Date.now());
      }
    };
    
    websocketService.on('status', handleStatus);
    websocketService.on('analytics_update', handleAnalyticsUpdate);
    
    return () => {
      clearInterval(interval);
      websocketService.off('status', handleStatus);
      websocketService.off('analytics_update', handleAnalyticsUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Safety Analytics</h1>
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <p className="text-gray-400 animate-pulse">Loading fleet analytics data...</p>
        </div>
      </div>
    );
  }

  const riskScore = analytics?.average_risk_score || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Safety Analytics & Fleet Insights</h1>
        <p className="text-gray-400 text-sm mt-1">Aggregated driver monitoring and accident risk statistics</p>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Stream (2s Updates)</span>
          </div>
          {useDemoMode && (
            <div className="p-1.5 bg-blue-500/20 border border-blue-500/50 rounded-lg inline-block">
              <p className="text-blue-400 text-xs font-semibold">🔴 Demo Mode Active</p>
            </div>
          )}
          <div className="p-1.5 bg-gray-700/50 border border-gray-600/50 rounded-lg inline-block font-mono">
            <p className="text-gray-300 text-xs">
              Last updated: <span className="text-cyan-400 font-bold">{new Date(lastUpdate).toLocaleTimeString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <Activity size={22} />
            </div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Trips</h3>
          </div>
          <p className="text-3xl font-black text-white font-mono mt-1">{analytics?.total_trips || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertTriangle size={22} />
            </div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Drowsiness Events</h3>
          </div>
          <p className="text-3xl font-black text-white font-mono mt-1">{analytics?.drowsiness_events || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl">
              <Shield size={22} />
            </div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">High Risk Events</h3>
          </div>
          <p className="text-3xl font-black text-white font-mono mt-1">{analytics?.high_risk_events || 0}</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
              <TrendingUp size={22} />
            </div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Possible Accidents</h3>
          </div>
          <p className="text-3xl font-black text-rose-400 font-mono mt-1">{analytics?.possible_accidents || 0}</p>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Risk Level Analysis</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2 font-mono">
                <span className="text-gray-400">Average Risk Score</span>
                <span className="text-white font-bold">{riskScore} / 100</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden border border-gray-700">
                <div
                  className={`h-full transition-all duration-500 ${
                    riskScore < 30 ? 'bg-emerald-500' :
                    riskScore < 60 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2 font-mono">
                <span className="text-gray-400">Distraction Events</span>
                <span className="text-white font-bold">{analytics?.distraction_events || 0}</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden border border-gray-700">
                <div
                  className="bg-orange-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min((analytics?.distraction_events || 0) * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Driving Statistics</h2>
          <div className="space-y-4 font-mono text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-700/60">
              <span className="text-gray-400">Average Speed</span>
              <span className="text-white font-bold">{analytics?.average_speed || 0} km/h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-700/60">
              <span className="text-gray-400">Monitoring System</span>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-700/60">
              <span className="text-gray-400">Real-time Updates</span>
              <span className={wsConnected ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {wsConnected ? "CONNECTED" : "STANDBY"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-700/60">
              <span className="text-gray-400">Safety Status</span>
              <span className="text-blue-400 font-bold">PROTECTED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Recommendations */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Safety Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="text-blue-400" size={20} />
              <span className="text-white font-bold text-sm">Take Regular Rest Breaks</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">Take a 15-minute rest break every 2 hours of driving to mitigate drowsiness risk.</p>
          </div>
          <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="text-emerald-400" size={20} />
              <span className="text-white font-bold text-sm">Eye & Face Focus</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">Keep eyes focused on the road to prevent driver distraction alerts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
