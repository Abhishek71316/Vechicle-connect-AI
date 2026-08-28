import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Smartphone } from 'lucide-react';

const EmergencyWorkflow = ({ accidentData, location, onResponse, smsStatus }) => {
  const [countdown, setCountdown] = useState(30);
  const [driverResponse, setDriverResponse] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (accidentData && !driverResponse) {
      setCountdown(30);
      setIsExpired(false);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsExpired(true);
            if (onResponse) {
              onResponse('unresponded');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [accidentData, driverResponse, onResponse]);

  const handleOk = () => {
    setDriverResponse('ok');
    if (onResponse) {
      onResponse('ok');
    }
  };

  const handleEmergency = () => {
    setDriverResponse('emergency');
    if (onResponse) {
      onResponse('emergency');
    }
  };

  if (!accidentData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-red-500 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">
            🚨 ACCIDENT DETECTED
          </h2>
          <p className="text-gray-300">Severe impact detected. Are you safe?</p>
        </div>

        {/* SMS Alert Status Indicator */}
        <div className="mb-6 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between bg-gray-900/80 border-gray-700">
          <div className="flex items-center space-x-2 text-gray-300">
            <Smartphone size={16} className="text-blue-400" />
            <span>SMS Notification:</span>
          </div>
          {smsStatus === 'failed' ? (
            <span className="text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1 font-bold">
              🔴 FAILED
            </span>
          ) : (
            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1 font-bold">
              🟢 FAMILY ALERT SENT
            </span>
          )}
        </div>

        {!driverResponse && !isExpired && (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 text-yellow-400">
              <Clock size={20} />
              <span className="text-3xl font-bold">{countdown}</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">seconds remaining</p>
          </div>
        )}

        {isExpired && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-center font-medium">
              No response received. Emergency assistance requested.
            </p>
          </div>
        )}

        {driverResponse === 'ok' && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <CheckCircle size={20} />
              <span className="font-medium">Driver confirmed safe</span>
            </div>
          </div>
        )}

        {driverResponse === 'emergency' && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-red-400">
              <XCircle size={20} />
              <span className="font-medium">Emergency assistance requested</span>
            </div>
          </div>
        )}

        {!driverResponse && !isExpired && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleOk}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
            >
              <CheckCircle size={24} />
              <span>I'M OK</span>
            </button>
            <button
              onClick={handleEmergency}
              className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
            >
              <AlertTriangle size={24} />
              <span>EMERGENCY</span>
            </button>
          </div>
        )}

        {location && (
          <div className="mt-6 bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Accident Location</h3>
            <div className="text-sm text-gray-400 space-y-1 font-mono">
              <p>Latitude: {location.latitude.toFixed(6)}</p>
              <p>Longitude: {location.longitude.toFixed(6)}</p>
              <p>Time: {new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyWorkflow;
