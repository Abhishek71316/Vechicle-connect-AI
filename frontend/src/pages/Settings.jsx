import { useState } from 'react';
import { Wifi, Shield, Bell, Monitor } from 'lucide-react';
import demoModeService from '../services/demoMode';

const Settings = () => {
  const [demoMode, setDemoMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoWarnings, setAutoWarnings] = useState(true);

  const toggleDemoMode = () => {
    const newMode = !demoMode;
    setDemoMode(newMode);
    
    if (newMode) {
      demoModeService.enable();
      demoModeService.startSimulation();
    } else {
      demoModeService.disable();
      demoModeService.stopSimulation();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Demo Mode */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Monitor className="text-blue-500" size={24} />
          <h2 className="text-lg font-semibold text-white">Demo Mode</h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Enable demo mode to simulate sensor data when hardware is not available.
          This will generate mock GPS, accelerometer, gyroscope, and driver status data.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white">Demo Mode</span>
          <button
            onClick={toggleDemoMode}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              demoMode ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transition-transform ${
                demoMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>
        {demoMode && (
          <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <p className="text-blue-400 text-sm">Demo mode is active. Mock data is being generated.</p>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Bell className="text-yellow-500" size={24} />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white">Push Notifications</span>
              <p className="text-gray-400 text-sm">Receive alerts on your device</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white">Sound Alerts</span>
              <p className="text-gray-400 text-sm">Play sound for critical alerts</p>
            </div>
            <button
              onClick={() => setAutoWarnings(!autoWarnings)}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                autoWarnings ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  autoWarnings ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Wifi className="text-green-500" size={24} />
          <h2 className="text-lg font-semibold text-white">Connection Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Backend URL</label>
            <input
              type="text"
              defaultValue="http://localhost:8000"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2"
              placeholder="Backend API URL"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">WebSocket URL</label>
            <input
              type="text"
              defaultValue="ws://localhost:8000/ws"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2"
              placeholder="WebSocket URL"
            />
          </div>
        </div>
      </div>

      {/* Safety Settings */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="text-red-500" size={24} />
          <h2 className="text-lg font-semibold text-white">Safety Settings</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-2">Emergency Contact</label>
            <input
              type="text"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2"
              placeholder="Emergency contact number"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">Emergency Response Time (seconds)</label>
            <input
              type="number"
              defaultValue="30"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2"
              placeholder="Response time"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
