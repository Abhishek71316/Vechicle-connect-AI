// Smart Vehicles connect AI - Main App Component
// This is the root component of the React application

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveMonitor from './pages/LiveMonitor';
import Vehicle from './pages/Vehicle';
import Accidents from './pages/Accidents';
import Alerts from './pages/Alerts';
import History from './pages/History';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant';
import AccidentAnalysis from './pages/AccidentAnalysis';
import Settings from './pages/Settings';
import VehicleTracking from './pages/VehicleTracking';

import SmartGuardChatbot from './components/SmartGuardChatbot';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white relative">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live-monitor" element={<LiveMonitor />} />
            <Route path="/vehicle" element={<Vehicle />} />
            <Route path="/accidents" element={<Accidents />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/history" element={<History />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/accident-analysis" element={<AccidentAnalysis />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/vehicle-tracking" element={<VehicleTracking />} />
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </div>
        {/* Floating Multilingual SmartGuard AI Chatbot matching Lovable AI */}
        <SmartGuardChatbot mode="floating" />
      </div>
    </Router>
  );
}

export default App;
