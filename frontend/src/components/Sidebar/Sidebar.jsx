import React from 'react';
import {
  MapPin,
  AlertTriangle,
  X,
  Plus,
  Grid,
  Map,
  Layers, 
  User, // Added User icon for Login/Sign Up
} from 'lucide-react';

// --- Configuration & Constants ---

const COLORS = {
  bg: '#F5F7FA',
  sidebar: '#FFFFFF',
  textDark: '#333333',
  textMuted: '#888888',
  accentBlue: '#6A96FF',
};

// IDs should map to the logic/component names
const MENU_ITEMS = [
  { id: 'Homepage', name: 'Home', icon: Grid },
  { id: 'DashboardPage', name: 'Dashboard', icon: Layers }, 
  { id: 'ReportPage', name: 'Reports', icon: Plus }, 
  { id: 'MapPage', name: 'Map', icon: Map },
  { id: 'AlertsPage', name: 'Alerts', icon: AlertTriangle },
];

const AUTH_ITEM = { id: 'AuthPage', name: 'Login/Sign Up', icon: User };


// --- Sidebar Component ---

const Sidebar = ({ isMenuOpen, toggleMenu, currentPage, onNavigate }) => {

  const handleNavigation = (id) => {
    onNavigate(id); // Use generic onNavigate function passed from App.jsx
    if (isMenuOpen) {
      toggleMenu(); // Close menu on mobile after click
    }
  };

  const renderNavItem = (item) => {
    const isActive = currentPage === item.id;
    // Set 'Home' as active if no other page is explicitly selected after AuthPage navigation
    const isAuthActive = item.id === 'AuthPage' && !isActive && currentPage === 'AuthPage';
    
    return (
      <button
        key={item.id}
        onClick={() => handleNavigation(item.id)}
        className={`w-full flex items-center space-x-3 p-3 rounded-xl font-medium transition-colors duration-150 ${
          isActive || isAuthActive
            ? 'text-white shadow-md'
            : 'hover:bg-gray-50'
        }`}
        style={{
          backgroundColor: isActive || isAuthActive ? COLORS.accentBlue : COLORS.sidebar,
          color: isActive || isAuthActive ? 'white' : COLORS.textMuted,
        }}
      >
        <item.icon size={20} className={isActive || isAuthActive ? 'text-white' : 'text-gray-500'} />
        <span className="text-base">{item.name}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden ${isMenuOpen ? 'block' : 'hidden'}`}
        onClick={toggleMenu}
      ></div>

      {/* Sidebar Content */}
      <div 
        className={`fixed inset-y-0 left-0 w-64 shadow-xl lg:shadow-none lg:translate-x-0 transform transition-transform duration-300 z-50 flex flex-col ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:flex-shrink-0`}
        style={{ backgroundColor: COLORS.sidebar, color: COLORS.textDark }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="text-3xl" style={{ color: COLORS.accentBlue }} />
            <span className="text-xl font-bold">RainSafe</span>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={toggleMenu}>
            <X size={24} />
          </button>
        </div>

        {/* Report Button */}
        <div className="p-6 pb-4">
           {MENU_ITEMS.find(item => item.id === 'ReportPage') && (
                <button
                    onClick={() => handleNavigation('ReportPage')}
                    className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl font-semibold transition-all duration-200 hover:opacity-90 active:scale-[.98]"
                    style={{ backgroundColor: COLORS.accentBlue, color: 'white', boxShadow: `0 4px 14px 0 ${COLORS.accentBlue}40` }}
                >
                    <Plus size={20} />
                    <span>Report +</span>
                </button>
           )}
        </div>

        {/* Navigation - Renders all items except ReportPage */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {MENU_ITEMS.filter(item => item.id !== 'ReportPage').map(renderNavItem)}
        </nav>
        
        {/* Auth Link added to the bottom/footer area */}
        <nav className="px-4 py-2 space-y-1 mt-auto border-t border-gray-100">
            {renderNavItem(AUTH_ITEM)}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;