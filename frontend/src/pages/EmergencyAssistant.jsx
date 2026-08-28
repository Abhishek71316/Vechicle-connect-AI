import { useState, useEffect } from 'react';
import { Phone, AlertTriangle, FileText, MapPin, Clock, Activity, Users, Send, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import geminiService from '../services/geminiService';

const EmergencyAssistant = () => {
  const [incidentData, setIncidentData] = useState({
    incident_id: '',
    event_type: '',
    location: '',
    latitude: '',
    longitude: '',
    impact_detected: false,
    speed: '',
    driver_status: '',
    risk_score: '',
    datetime: ''
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [aiStatus, setAiStatus] = useState('checking');

  useEffect(() => {
    checkAIStatus();
    generateIncidentId();
    setIncidentData(prev => ({
      ...prev,
      datetime: new Date().toISOString()
    }));
  }, []);

  const checkAIStatus = async () => {
    try {
      const status = await geminiService.getStatus();
      setAiStatus(status.status);
    } catch (err) {
      setAiStatus('error');
    }
  };

  const generateIncidentId = () => {
    const id = 'INC-' + Date.now().toString(36).toUpperCase();
    setIncidentData(prev => ({ ...prev, incident_id: id }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIncidentData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGenerateSummary = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const data = {
        ...incidentData,
        speed: parseFloat(incidentData.speed) || 0,
        risk_score: parseFloat(incidentData.risk_score) || 0,
        latitude: parseFloat(incidentData.latitude) || 0,
        longitude: parseFloat(incidentData.longitude) || 0
      };

      const response = await geminiService.generateEmergencySummary(data);
      setSummary(response.summary);
    } catch (err) {
      setError(err.message || 'Failed to generate emergency summary');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIncidentData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
        },
        (err) => {
          setError('Unable to get current location. Please enter manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Emergency Response Assistant</h1>
          <p className="text-gray-400 mt-1">AI-assisted emergency incident summary and response preparation</p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
          aiStatus === 'operational' ? 'bg-green-500/20 text-green-400' :
          aiStatus === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          <Phone size={16} />
          <span className="text-sm font-medium">
            {aiStatus === 'operational' ? 'AI Online' :
             aiStatus === 'error' ? 'AI Offline' :
             'Checking...'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="text-red-400 mt-0.5" size={20} />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Input Form */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <AlertTriangle size={20} />
            <span>Incident Information</span>
          </h2>
          
          <form onSubmit={handleGenerateSummary} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Incident ID</label>
              <input
                type="text"
                name="incident_id"
                value={incidentData.incident_id}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Event Type</label>
              <select
                name="event_type"
                value={incidentData.event_type}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select event type...</option>
                <option value="accident">Accident</option>
                <option value="collision">Collision</option>
                <option value="breakdown">Vehicle Breakdown</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={incidentData.location}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Highway 101, Mile Marker 45"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
                  <MapPin size={16} />
                  <span>Latitude</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={incidentData.latitude}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 12.9716"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center space-x-2">
                  <MapPin size={16} />
                  <span>Longitude</span>
                </label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={incidentData.longitude}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 77.5946"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={getCurrentLocation}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Use current location
            </button>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="impact_detected"
                id="impact_detected"
                checked={incidentData.impact_detected}
                onChange={handleChange}
                className="w-5 h-5 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="impact_detected" className="text-gray-300 text-sm font-medium">
                Impact Detected
              </label>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Vehicle Speed (km/h)</label>
              <input
                type="number"
                name="speed"
                value={incidentData.speed}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 60"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Driver Status</label>
              <select
                name="driver_status"
                value={incidentData.driver_status}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select status...</option>
                <option value="normal">Normal</option>
                <option value="drowsy">Drowsy</option>
                <option value="distacted">Distracted</option>
                <option value="unresponsive">Unresponsive</option>
                <option value="injured">Injured</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Risk Score (0-100)</label>
              <input
                type="number"
                name="risk_score"
                value={incidentData.risk_score}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 75"
              />
            </div>

            <button
              type="submit"
              disabled={loading || aiStatus !== 'operational'}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Generate Emergency Summary</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Emergency Summary Output */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <FileText size={20} />
              <span>Emergency Summary</span>
            </h2>
            {summary && (
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300"
              >
                {copied ? (
                  <>
                    <CheckCircle size={16} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          {summary ? (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-400 font-medium mb-2 flex items-center space-x-2">
                  <AlertTriangle size={16} />
                  <span>Emergency Summary for First Responders</span>
                </h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{summary}</p>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Incident Details</h3>
                <div className="text-gray-300 text-sm space-y-1">
                  <p><strong>Incident ID:</strong> {incidentData.incident_id}</p>
                  <p><strong>Event Type:</strong> {incidentData.event_type || 'N/A'}</p>
                  <p><strong>Location:</strong> {incidentData.location || 'N/A'}</p>
                  <p><strong>Coordinates:</strong> {incidentData.latitude}, {incidentData.longitude}</p>
                  <p><strong>Impact:</strong> {incidentData.impact_detected ? 'Yes' : 'No'}</p>
                  <p><strong>Speed:</strong> {incidentData.speed || 'N/A'} km/h</p>
                  <p><strong>Driver Status:</strong> {incidentData.driver_status || 'N/A'}</p>
                  <p><strong>Risk Score:</strong> {incidentData.risk_score || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-400 font-medium mb-2">Recommended Actions</h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Contact emergency services immediately (911 or local number)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Provide the incident ID and location to dispatchers</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Share this summary with first responders upon arrival</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Follow all instructions from emergency personnel</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Phone className="text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-400">Enter incident details to generate AI-assisted emergency summary</p>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-400 text-sm">
          <strong>Emergency Warning:</strong> This is an AI-assisted tool to help organize incident information. 
          In a real emergency, always contact professional emergency services immediately. 
          Do not rely solely on AI-generated information for critical emergency decisions.
        </p>
      </div>
    </div>
  );
};

export default EmergencyAssistant;