import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  Home, 
  Eye, 
  Map, 
  Car, 
  AlertTriangle, 
  Bell, 
  History, 
  BarChart3, 
  Settings,
  Shield,
  LogOut,
  Bot,
  FileText,
  Phone,
  Menu,
  X,
  MapPin
} from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/vehicle-tracking', icon: Map, label: 'Vehicle Tracking' },
    { path: '/live-monitor', icon: Eye, label: 'Live Monitor' },
    { path: '/vehicle', icon: Car, label: 'Vehicle Status' },
    { path: '/accidents', icon: AlertTriangle, label: 'Accidents' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const aiNavItems = [
    { path: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
    { path: '/accident-analysis', icon: FileText, label: 'Accident Analysis' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-800 border-b border-gray-700 shadow-lg sticky top-0 z-50">
      <div className="max-w-full mx-auto px-1 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Shield className="text-white sm:size-18" size={14} />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white whitespace-nowrap">Smart Vehicles Connect AI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-0.5">
            {/* Main Navigation */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-2 py-2 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline text-sm">{item.label}</span>
                </Link>
              );
            })}

            {/* AI Features Divider */}
            <div className="h-6 w-px bg-gray-600 mx-1" />

            {/* AI Navigation */}
            {aiNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-2 py-2 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline text-sm">{item.label}</span>
                </Link>
              );
            })}
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-2 py-2 rounded-lg text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-all ml-1"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden md:inline text-sm">Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-700 bg-gray-800 shadow-xl">
          <div className="px-3 sm:px-4 py-4 space-y-2 max-h-[80vh] overflow-y-auto">
            {/* Main Navigation */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Main</p>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-base">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* AI Navigation */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">AI Features</p>
              {aiNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-base">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-all w-full"
            >
              <LogOut size={20} />
              <span className="text-base">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;