import { useState, useEffect } from 'react';
import usePhoneGPS from '../hooks/usePhoneGPS';
import useESP32Telemetry from '../hooks/useESP32Telemetry';
import VehicleMap from '../components/VehicleMap';
import { 
  Car, 
  Navigation, 
  ShieldAlert, 
  Cpu, 
  Zap, 
  Wifi,
  WifiOff,
  BatteryCharging,
  Clock,
  CheckCircle2
} from 'lucide-react';

const Vehicle = () => {
  const { location, isTracking } = usePhoneGPS(true);
  const { data: esp32Data, connected: esp32Connected } = useESP32Telemetry();

  // Local simulated telemetry overlay state (for interactive impact testing)
  const [simulatedImpact, setSimulatedImpact] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);

  // Active sensor telemetry values (merging live ESP32 data with simulated impact if triggered)
  const activeAccelX = simulatedImpact ? simulatedImpact.accel_x : (esp32Data.accel_x || 0.04);
  const activeAccelY = simulatedImpact ? simulatedImpact.accel_y : (esp32Data.accel_y || -0.02);
  const activeAccelZ = simulatedImpact ? simulatedImpact.accel_z : (esp32Data.accel_z || 0.98);
  
  const rawTotalG = simulatedImpact 
    ? simulatedImpact.total_g 
    : (esp32Data.total_g || Math.sqrt(activeAccelX ** 2 + activeAccelY ** 2 + activeAccelZ ** 2));
  const activeTotalG = Number(rawTotalG.toFixed(2));

  const isImpactDetected = simulatedImpact ? true : (esp32Data.impact || activeTotalG >= 2.5);
  const isEmergencyActive = simulatedImpact ? true : (esp32Data.alert_active || isImpactDetected);

  // Trigger test simulated impact event
  const triggerImpactSimulation = () => {
    const simData = {
      accel_x: 2.15,
      accel_y: 1.84,
      accel_z: 2.60,
      total_g: 3.82,
      impact: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setSimulatedImpact(simData);

    // Log event
    setEventLogs(prev => [
      {
        id: Date.now(),
        type: 'CRITICAL',
        title: 'Simulated Impact Event Triggered',
        detail: `MPU6500 Total G: 3.82g (Threshold Exceeded)`,
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);

    // Clear simulation after 6 seconds
    setTimeout(() => {
      setSimulatedImpact(null);
      setEventLogs(prev => [
        {
          id: Date.now(),
          type: 'INFO',
          title: 'Impact Simulation Ended',
          detail: 'Sensor state reset to live telemetry feed',
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
    }, 6000);
  };

  // Add event log when live impact is received from ESP32
  useEffect(() => {
    if (esp32Data.impact) {
      setEventLogs(prev => [
        {
          id: Date.now(),
          type: 'CRITICAL',
          title: 'ESP32 Hardware MPU6500 Impact Detected!',
          detail: `Force: ${esp32Data.total_g != null ? esp32Data.total_g.toFixed(2) : '1.00'}g | Device: ${esp32Data.device_id || 'RG-001'}`,
          time: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 19)
      ]);
    }
  }, [esp32Data.impact, esp32Data.total_g, esp32Data.device_id]);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Car className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Vehicle Status & MPU6500 Sensor Telemetry
            </h1>
            <p className="text-sm text-gray-400">
              Real-time vehicle dynamics, location mapping, and MPU6500 impact force monitoring
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MPU6500 Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            esp32Connected || simulatedImpact
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {esp32Connected || simulatedImpact ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>MPU6500 Sensor: {simulatedImpact ? 'SIMULATED' : (esp32Connected ? 'ONLINE' : 'STANDBY')}</span>
          </div>

          {/* GPS Tracking Status */}
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            location.latitude !== null
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-gray-700 text-gray-400 border-gray-600'
          }`}>
            <Navigation size={14} className={isTracking ? 'animate-spin' : ''} />
            <span>GPS: {location.latitude !== null ? 'LOCKED' : 'SEARCHING'}</span>
          </div>
        </div>
      </div>

      {/* Impact Alert Emergency Banner */}
      {isEmergencyActive && (
        <div className="bg-red-950/80 border-2 border-red-500 rounded-2xl p-4 md:p-6 shadow-2xl shadow-red-900/50 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="text-white w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase">
                ⚠️ CRITICAL VEHICLE IMPACT DETECTED
              </h3>
              <p className="text-sm text-red-200">
                MPU6500 Accelerometer total force reached <span className="font-bold">{activeTotalG}g</span> (Threshold: 2.50g). Emergency alert protocol active.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg text-sm tracking-wide">
              IMPACT FORCE: {activeTotalG}G
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Left Map + Right MPU6500 Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Shared Vehicle Tracking Map Component (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <VehicleMap 
            location={location} 
            isImpact={isImpactDetected} 
            height="460px"
          />
        </div>

        {/* Right Column: MPU6500 Sensor Dynamics & Impact Telemetry (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main MPU6500 Impact Gauge Card */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="text-purple-400 w-5 h-5" />
                <h2 className="text-lg font-bold text-white">MPU6500 Impact Sensor</h2>
              </div>
              <span className="text-xs text-gray-400 font-mono">ID: {esp32Data.device_id || 'RG-001'}</span>
            </div>

            {/* Total G-Force Visual Meter */}
            <div className="bg-gray-900/80 rounded-xl p-5 border border-gray-700 mb-5 text-center relative">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                Total Acceleration (G-Force)
              </span>
              <div className="text-4xl md:text-5xl font-extrabold font-mono text-white tracking-tight my-2">
                <span className={activeTotalG >= 2.5 ? 'text-red-400 animate-pulse' : (activeTotalG >= 1.5 ? 'text-amber-400' : 'text-blue-400')}>
                  {activeTotalG.toFixed(2)}
                </span>
                <span className="text-xl text-gray-500 ml-1">g</span>
              </div>

              {/* Progress Bar for Total G */}
              <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden mt-3 p-0.5 border border-gray-700">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeTotalG >= 2.5 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50' 
                      : (activeTotalG >= 1.5 ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-emerald-400')
                  }`}
                  style={{ width: `${Math.min(100, (activeTotalG / 4.0) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                <span>0.0g (Rest)</span>
                <span>1.5g (Caution)</span>
                <span>2.5g+ (Impact)</span>
              </div>
            </div>

            {/* 3-Axis Accelerometer Visualizers (X, Y, Z) */}
            <div className="space-y-3.5 mb-5">
              <h3 className="text-xs uppercase font-semibold text-gray-400 tracking-wider">
                3-Axis Accelerometer Telemetry
              </h3>

              {/* X Axis */}
              <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-700/60">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-gray-300">X-Axis (Lateral / Roll)</span>
                  <span className="font-mono font-bold text-blue-400">{activeAccelX.toFixed(2)}g</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.abs(activeAccelX) * 40)}%` }}
                  />
                </div>
              </div>

              {/* Y Axis */}
              <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-700/60">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-gray-300">Y-Axis (Longitudinal / Pitch)</span>
                  <span className="font-mono font-bold text-purple-400">{activeAccelY.toFixed(2)}g</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.abs(activeAccelY) * 40)}%` }}
                  />
                </div>
              </div>

              {/* Z Axis */}
              <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-700/60">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-gray-300">Z-Axis (Vertical / Gravity)</span>
                  <span className="font-mono font-bold text-emerald-400">{activeAccelZ.toFixed(2)}g</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.abs(activeAccelZ) * 40)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="pt-2">
              <button
                onClick={triggerImpactSimulation}
                disabled={Boolean(simulatedImpact)}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center space-x-2 ${
                  simulatedImpact
                    ? 'bg-red-600 text-white opacity-80 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-red-600/20 active:scale-[0.98]'
                }`}
              >
                <Zap size={16} />
                <span>{simulatedImpact ? 'Simulating Impact (3.82g)...' : 'Test Simulate MPU6500 Impact'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Vehicle Diagnostics & Telemetry Event Log */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: System Health */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="font-bold text-white text-base">Vehicle System Health</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Engine Status</span>
              <span className="text-emerald-400 font-semibold">Operational</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">MPU6500 Sampling</span>
              <span className="text-white font-mono">300ms / 3.3Hz</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Impact Sensitivity</span>
              <span className="text-amber-400 font-mono">2.50 G Threshold</span>
            </div>
          </div>
        </div>

        {/* Card 2: Power & Diagnostics */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <BatteryCharging size={20} />
            </div>
            <h3 className="font-bold text-white text-base">Power & Diagnostics</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Hardware Supply</span>
              <span className="text-white font-mono">5.0V USB / Li-Po</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Heading Compass</span>
              <span className="text-blue-400 font-mono">{location.heading || 0}°</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">GPS Signal Lock</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Card 3: Telemetry Activity Log */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Clock size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Sensor Event Log</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1 font-mono text-xs">
            {eventLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-4 italic">
                No emergency impact events logged. System monitoring live telemetry...
              </div>
            ) : (
              eventLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-2 rounded-lg border ${
                    log.type === 'CRITICAL' 
                      ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                      : 'bg-gray-700/50 border-gray-600 text-gray-300'
                  }`}
                >
                  <div className="flex justify-between font-bold">
                    <span>{log.title}</span>
                    <span className="text-gray-400">{log.time}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{log.detail}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Vehicle;
