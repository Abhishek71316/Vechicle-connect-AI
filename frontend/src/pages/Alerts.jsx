import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Filter, 
  MapPin, 
  Send, 
  PhoneCall, 
  ShieldAlert, 
  Phone, 
  MessageSquare, 
  ExternalLink,
  Wifi,
  Check,
  XCircle,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import apiService from '../services/api';
import usePhoneGPS from '../hooks/usePhoneGPS';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const { location: phoneLocation } = usePhoneGPS(true);

  // MSG91 SMS API state
  const [smsStatus, setSmsStatus] = useState(null);
  const [smsLoading, setSmsLoading] = useState(true);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadAlerts();
    loadSmsStatus();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      let list = [];
      try {
        const data = await apiService.getAlerts();
        list = Array.isArray(data) ? data : (data?.alerts || []);
      } catch (e) {
        list = [];
      }

      if (list.length === 0) {
        const hostname = window.location.hostname || "localhost";
        const res = await fetch(`http://${hostname}:5000/api/accidents`).catch(() => null);
        if (res && res.ok) {
          const accData = await res.json();
          list = accData?.accidents || [];
        }
      }
      setAlerts(list);
    } catch (error) {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSmsStatus = async () => {
    setSmsLoading(true);
    const hostname = window.location.hostname || "localhost";
    const targetUrls = [
      `http://${hostname}:5000/api/emergency/sms-status`,
      `/api/emergency/sms-status`
    ];

    for (const url of targetUrls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSmsStatus(data);
          setSmsLoading(false);
          return;
        }
      } catch (e) {}
    }
    setSmsLoading(false);
  };

  const handleSendTestSMS = async () => {
    setSendingTest(true);
    setTestResult(null);
    const hostname = window.location.hostname || "localhost";
    const targetUrl = `http://${hostname}:5000/api/emergency/test-sms`;

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: testRecipient || undefined,
          latitude: phoneLocation.latitude || undefined,
          longitude: phoneLocation.longitude || undefined
        })
      });
      const data = await res.json();
      setTestResult(data);
      loadSmsStatus();
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const getSeverityColor = (severity) => {
    const sev = (severity || 'info').toString().toLowerCase();
    switch (sev) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'info': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!alert) return false;
    const st = (alert.status || '').toLowerCase();
    const sev = (alert.severity || '').toLowerCase();
    if (filter === 'all') return true;
    if (filter === 'active') return st === 'active';
    if (filter === 'resolved') return st === 'resolved';
    if (filter === 'critical') return sev === 'critical';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800/90 backdrop-blur-md p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Bell className="text-blue-400 w-8 h-8" />
            Safety Alerts & TextBee Emergency SMS Dispatch
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time vehicle crash notifications, driver safety alerts, and automatic TextBee SMS family messaging
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-900 p-1.5 rounded-xl border border-gray-700">
          <Filter size={18} className="text-blue-400 ml-2" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="all">All Alerts</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved</option>
            <option value="critical">Critical Only</option>
          </select>
        </div>
      </div>

      {/* MSG91 SMS Emergency Alert Center Card */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Card Header & Status Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Smartphone className="text-blue-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                TextBee Emergency SMS Alert Center
              </h2>
              <p className="text-xs text-gray-400">
                Backend TextBee API (`send-sms`) automatically dispatches live accident GPS links & alerts to family contacts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
              smsStatus?.configured 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
            }`}>
              <Wifi size={14} />
              <span>
                SMS Service: {
                  smsStatus?.configured 
                    ? '🟢 ONLINE (TEXTBEE ACTIVE)' 
                    : '⚠️ CONFIGURATION PENDING'
                }
              </span>
            </span>
          </div>
        </div>

        {/* Registered Family Contacts & Test Alert Dispatch Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-900/60 p-5 rounded-2xl border border-gray-700/60">
          
          {/* Registered Family Contacts Display */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5">
              <PhoneCall size={14} className="text-emerald-400" />
              Configured Emergency Family Contacts
            </h3>

            {smsStatus?.emergency_contact_1 || smsStatus?.emergency_contact_2 ? (
              <div className="space-y-2">
                {smsStatus.emergency_contact_1 && (
                  <div className="flex items-center justify-between bg-gray-800 p-2.5 rounded-xl border border-gray-700 text-xs font-mono">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Phone size={14} />
                      <span className="font-bold">{smsStatus.emergency_contact_1}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-700/60 px-2 py-0.5 rounded">Emergency Contact #1</span>
                  </div>
                )}
                {smsStatus.emergency_contact_2 && (
                  <div className="flex items-center justify-between bg-gray-800 p-2.5 rounded-xl border border-gray-700 text-xs font-mono">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Phone size={14} />
                      <span className="font-bold">{smsStatus.emergency_contact_2}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-700/60 px-2 py-0.5 rounded">Emergency Contact #2</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                Emergency family phone numbers are set in backend `.env` (`EMERGENCY_CONTACT_1`, `EMERGENCY_CONTACT_2`).
              </div>
            )}
          </div>

          {/* Test MSG91 SMS Alert Controls */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5">
              <Send size={14} className="text-blue-400" />
              Test Emergency SMS Dispatch Pipeline
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="Optional recipient (e.g. 919876543210)"
                className="w-full bg-gray-800 text-white text-xs font-mono px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500"
              />

              <button
                onClick={handleSendTestSMS}
                disabled={sendingTest}
                className="w-full sm:w-auto shrink-0 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {sendingTest ? <RefreshCw className="animate-spin w-4 h-4" /> : <Send size={15} />}
                <span>{sendingTest ? 'Dispatching...' : 'Send Test SMS'}</span>
              </button>
            </div>

            {/* Test Result Feedback Box */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                testResult.success 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                  : 'bg-red-950/60 border-red-500/50 text-red-300'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>{testResult.success ? '✅ TextBee Test SMS Dispatched' : '🔴 SMS FAILED'}</span>
                  <span className="text-[10px]">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="text-[11px] space-y-1">
                  <div>{testResult.error || testResult.result?.error || testResult.message || "Unable to send emergency SMS."}</div>
                  {!testResult.success && (testResult.error?.includes("device") || testResult.result?.error?.includes("device")) && (
                    <div className="text-[10px] text-amber-300 font-sans italic border-t border-red-500/30 pt-1 mt-1">
                      💡 <strong>TextBee Setup Required:</strong> Download & open the <strong>TextBee Gateway App</strong> on your Android phone, or set <code>TEXTBEE_DEVICE_ID=your_device_id</code> in backend <code>.env</code>.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TextBee SMS Dispatch History Logs */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400 flex items-center gap-1.5">
            <Clock size={14} className="text-purple-400" />
            TextBee Accident SMS Dispatch History
          </h3>

          {smsStatus?.recent_logs && smsStatus.recent_logs.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {smsStatus.recent_logs.map((log) => (
                <div key={log.id} className="bg-gray-900/80 p-3 rounded-xl border border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      log.status === 'SENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}>
                      {log.status}
                    </span>
                    <span className="text-white font-bold">{log.vehicleId || 'RG-001'}</span>
                    <span className="text-amber-400">Severity: {log.severity || 'CRITICAL'}</span>
                  </div>

                  <div className="flex items-center space-x-4 text-gray-400 text-[11px]">
                    <a
                      href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
                    >
                      <MapPin size={12} />
                      <span>{log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}</span>
                      <ExternalLink size={10} />
                    </a>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900/40 p-4 rounded-xl text-center text-xs text-gray-500 italic border border-gray-700/50">
              No emergency SMS dispatches logged yet. Trigger a test SMS or simulate hardware impact to log live alerts.
            </div>
          )}
        </div>

      </div>

      {/* System Safety Warnings Feed */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Driver Monitoring & Vehicle Telemetry Warnings</h2>
        
        {loading ? (
          <p className="text-gray-400 animate-pulse py-6 text-center text-sm">Loading safety alerts...</p>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-10">
            <Bell size={48} className="text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-gray-300">No Active Safety Warnings</h3>
            <p className="text-gray-500 text-xs mt-1">The system is actively monitoring driver attention and MPU6500 vehicle dynamics.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert, index) => (
              <div
                key={alert.id || index}
                className={`rounded-xl p-4 border transition-all ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle size={20} className="flex-shrink-0" />
                    <span className="text-white font-bold text-sm">{alert.event_type || 'Safety Warning'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${getSeverityColor(alert.severity)}`}>
                      {alert.severity || 'INFO'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center space-x-4 text-xs text-gray-400 mt-2 font-mono gap-2">
                  <div className="flex items-center space-x-1">
                    <Clock size={14} className="text-indigo-400" />
                    <span>{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Recent'}</span>
                  </div>
                  {alert.risk_score != null && (
                    <span className="text-amber-400">Risk Score: {alert.risk_score}/100</span>
                  )}
                  {alert.location && (
                    <div className="flex items-center space-x-1 text-slate-300">
                      <MapPin size={14} className="text-red-400" />
                      <span>{alert.location}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Alerts;
