import { useState } from 'react';
import DriverCamera from '../components/DriverCamera';
import { AlertTriangle, ShieldCheck, Activity, Eye, Zap, Compass, AlertOctagon } from 'lucide-react';

const LiveMonitor = () => {
  const [driverStatus, setDriverStatus] = useState(null);

  const handleDriverStatus = (status) => {
    setDriverStatus(status);
  };

  const statusText = (driverStatus?.status_text || '').toUpperCase();
  const isSleeping = statusText.includes('SLEEP') || driverStatus?.drowsiness_level === 'CRITICAL' || driverStatus?.eye_state === 'CLOSED';
  const isDrowsy = !isSleeping && (statusText.includes('DROWSY') || driverStatus?.drowsiness_level === 'HIGH' || driverStatus?.drowsiness_level === 'MEDIUM' || driverStatus?.eye_state === 'DROWSY');
  const isAwake = !isSleeping && !isDrowsy && (statusText.includes('ACTIVE') || statusText.includes('NORMAL') || driverStatus?.eye_state === 'OPEN');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Live Driver Monitor</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time drowsiness detection powered by <span className="text-blue-400 font-semibold">dlib 68-landmark AI model</span>
          </p>
        </div>

        {/* System Status Pill */}
        <div className="flex items-center space-x-2 bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl">
          <Activity size={18} className="text-green-400 animate-pulse" />
          <span className="text-sm font-medium text-gray-200">AI Safety System Active</span>
        </div>
      </div>

      {/* Critical Alert Banners */}
      {isSleeping && (
        <div className="bg-red-950/80 border-2 border-red-600 rounded-xl p-5 shadow-2xl animate-pulse flex items-center space-x-4">
          <div className="bg-red-600 p-3 rounded-full text-white">
            <AlertOctagon size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-red-200 tracking-wide">DANGER: DRIVER SLEEPING DETECTED!</h3>
            <p className="text-red-300 font-medium text-sm mt-0.5">
              Continuous eye closure detected (&gt; 6 frames). Immediate audio alarm active!
            </p>
          </div>
        </div>
      )}

      {isDrowsy && !isSleeping && (
        <div className="bg-amber-950/80 border-2 border-amber-500 rounded-xl p-5 shadow-xl flex items-center space-x-4">
          <div className="bg-amber-500 p-3 rounded-full text-white">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-amber-200">WARNING: DRIVER DROWSINESS DETECTED</h3>
            <p className="text-amber-300 font-medium text-sm mt-0.5">
              Reduced eye aspect ratio and drowsiness threshold triggered. Please stay alert or pull over safely.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Camera Feed (Spans 2 columns) */}
        <div className="lg:col-span-2">
          <DriverCamera onDriverStatus={handleDriverStatus} />
        </div>

        {/* Live Metrics & Analytics Sidebar */}
        <div className="space-y-6">
          {/* Main Status Badge Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-base font-semibold text-gray-300 mb-3 uppercase tracking-wider text-xs">
              Current AI Status
            </h2>
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isSleeping ? 'bg-red-900/40 border-red-500 text-red-300 shadow-lg shadow-red-500/20' :
              isDrowsy ? 'bg-amber-900/40 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/20' :
              isAwake ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20' :
              driverStatus ? 'bg-blue-900/30 border-blue-500 text-blue-300' :
              'bg-gray-900 border-gray-700 text-gray-400'
            }`}>
              <div className="flex items-center space-x-3">
                {isSleeping ? <AlertOctagon size={32} className="text-red-400 animate-bounce" /> :
                 isDrowsy ? <AlertTriangle size={32} className="text-amber-400 animate-pulse" /> :
                 isAwake ? <ShieldCheck size={32} className="text-emerald-400" /> :
                 <ShieldCheck size={28} className="text-gray-500" />}
                <div>
                  <p className="text-xs text-gray-400 font-medium">Detection State</p>
                  <p className="text-xl font-black">
                    {isSleeping ? 'SLEEPING !!!' :
                     isDrowsy ? 'DROWSY !' :
                     isAwake ? (driverStatus?.status_text || 'AWAKE / ACTIVE') :
                     (driverStatus?.status_text || 'Waiting for Camera...')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Severity</p>
                <p className={`text-sm font-extrabold uppercase ${
                  isSleeping ? 'text-red-400' :
                  isDrowsy ? 'text-amber-400' :
                  isAwake ? 'text-emerald-400' : 'text-gray-400'
                }`}>
                  {driverStatus?.drowsiness_level || (driverStatus ? 'LOW' : 'OFFLINE')}
                </p>
              </div>
            </div>
          </div>

          {/* Analysis Results Card */}
          {driverStatus && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-white">Landmark Analysis Metrics</h2>

              {/* Fatigue Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Zap size={15} className="text-yellow-400" /> Fatigue Score
                  </span>
                  <span className="font-bold text-white">{driverStatus.fatigue_score || 0} / 100</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden border border-gray-700">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (driverStatus.fatigue_score || 0) < 30 ? 'bg-green-500' :
                      (driverStatus.fatigue_score || 0) < 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, driverStatus.fatigue_score || 0)}%` }}
                  ></div>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700/60">
                  <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    <Eye size={14} className="text-blue-400" /> Eye State
                  </span>
                  <p className={`text-lg font-bold ${
                    driverStatus.eye_state === 'OPEN' ? 'text-green-400' :
                    driverStatus.eye_state === 'DROWSY' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {driverStatus.eye_state}
                  </p>
                </div>

                <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700/60">
                  <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    <Activity size={14} className="text-purple-400" /> Total Blinks
                  </span>
                  <p className="text-lg font-bold text-white">
                    {driverStatus.blink_rate}
                  </p>
                </div>

                <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700/60">
                  <span className="text-xs text-gray-400 mb-1 block">Yawning</span>
                  <p className={`text-base font-bold ${driverStatus.yawning ? 'text-red-400' : 'text-green-400'}`}>
                    {driverStatus.yawning ? 'YES (Detected)' : 'No'}
                  </p>
                </div>

                <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-700/60">
                  <span className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                    <Compass size={14} className="text-teal-400" /> Head Direction
                  </span>
                  <p className="text-base font-bold text-white">
                    {driverStatus.head_pose}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
