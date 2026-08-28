import useESP32Telemetry from "../hooks/useESP32Telemetry";

export default function MPU6500Live() {
    const { data, connected } = useESP32Telemetry();

    // Show Waiting state if offline or no data received yet
    if (!connected || !data || data.hasData === false) {
        return (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white max-w-xl mx-auto shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                        <span>⚡</span> ESP32 MPU6500 Telemetry
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        🔴 ESP32 OFFLINE
                    </span>
                </div>
                <hr className="border-slate-800" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">X Axis</span>
                        <p className="text-lg font-bold text-slate-500 font-mono mt-0.5">--</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Y Axis</span>
                        <p className="text-lg font-bold text-slate-500 font-mono mt-0.5">--</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Z Axis</span>
                        <p className="text-lg font-bold text-slate-500 font-mono mt-0.5">--</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Total G</span>
                        <p className="text-lg font-bold text-slate-500 font-mono mt-0.5">--</p>
                    </div>
                </div>
                <p className="text-amber-400 text-xs font-mono animate-pulse">
                    Status: Waiting for ESP32 telemetry connection...
                </p>
            </div>
        );
    }

    const isEmergency = data.impact || data.alert_active;

    return (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white max-w-xl mx-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
                    <span>⚡</span> ESP32 MPU6500 Telemetry
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🟢 ESP32 ONLINE
                </span>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">3-Axis Acceleration</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">X Acceleration</span>
                        <p className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                            {Number(data.accel_x).toFixed(2)} g
                        </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Y Acceleration</span>
                        <p className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                            {Number(data.accel_y).toFixed(2)} g
                        </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Z Acceleration</span>
                        <p className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                            {Number(data.accel_z).toFixed(2)} g
                        </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Total G-Force</span>
                        <p className={`text-lg font-bold font-mono mt-0.5 ${
                            Number(data.total_g) > 2.5 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
                        }`}>
                            {Number(data.total_g).toFixed(2)} g
                        </p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Vehicle Safety</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className={`p-3 rounded-xl border ${
                        data.impact 
                            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse' 
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}>
                        <span className="text-xs text-slate-400 font-medium">Impact Status:</span>
                        <p className="font-bold font-mono text-base mt-0.5">
                            {data.impact ? "🚨 IMPACT DETECTED" : "✅ NORMAL"}
                        </p>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                        isEmergency 
                            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse' 
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}>
                        <span className="text-xs text-slate-400 font-medium">Emergency Status:</span>
                        <p className="font-bold font-mono text-base mt-0.5">
                            {isEmergency ? "🚨 IMPACT DETECTED" : "🟢 NORMAL"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-mono">
                    <span>Device: {data.device_id || "RG-001"}</span>
                    {data.timestamp && <span>Last updated: {new Date(data.timestamp).toLocaleTimeString()}</span>}
                </div>
            </div>
        </div>
    );
}
