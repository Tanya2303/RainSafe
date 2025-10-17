// App.jsx
import { useState } from 'react';
// FIX: Added .jsx extension to all component imports to resolve module resolution errors
import Homepage from './components/Homepage/Homepage.jsx';
import AuthPage from './components/AuthPage.jsx';
import Sidebar from './components/Sidebar/Sidebar.jsx';

// Page imports
import DashboardPage from './components/DashboardPage/DashboardPage.jsx';
import ReportPage from './components/ReportPage/ReportPage.jsx';
import MapPage from './components/MapPage/MapPage.jsx';
import AlertsPage from './components/AlertPage/AlertPage.jsx';
import LandingPage from './components/LandingPage.jsx';

// NEW: Risk page import
import RiskSection from './components/RiskSection/RiskSection.jsx';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('ProductLanding');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigate = (pageId) => {
    if (pageId === 'AuthPage') {
      setIsAuthenticated(false);
      setCurrentPage('AuthPage');
    } else if (pageId === 'Homepage') {
      setCurrentPage(pageId);
    } else if (pageId === 'ProductLanding') {
      setCurrentPage(pageId);
    } else {
      setCurrentPage(pageId);
    }
  };

  const showSidebar = currentPage !== 'ProductLanding' && isAuthenticated;

  const renderPageContent = (Title, PageComponent) => (
    <>
      {/* Preserved: Background color set to #FFFAED */}
      <div 
        className="p-4 md:p-6 flex items-center justify-between border-b border-gray-200 lg:sticky lg:top-0 z-30"
        style={{ backgroundColor: '#FFFAED' }}
      >
        <h1 className="text-xl font-bold" style={{ color: '#333333' }}>{Title}</h1>
      </div>
      <PageComponent />
    </>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'ProductLanding':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'Homepage':
        return <Homepage toggleMenu={toggleMenu} />;
      case 'DashboardPage':
        return renderPageContent('Dashboard', DashboardPage);
      case 'ReportPage':
        return renderPageContent('Reports', ReportPage);
      case 'MapPage':
        return renderPageContent('Map', MapPage);
      case 'AlertsPage':
        return renderPageContent('Alerts', AlertsPage);
      case 'RiskPage': // <-- new mapping
        return renderPageContent('Risk Assessment', RiskSection);
      default:
        return isAuthenticated ? <Homepage toggleMenu={toggleMenu} /> : <LandingPage onNavigate={handleNavigate} />;
    }
  };

  if (currentPage === 'AuthPage' && !isAuthenticated) {
    return (
      <AuthPage
        onAuthSuccess={() => {
          setIsAuthenticated(true);
          setCurrentPage('Homepage');
        }}
      />
    );
  }

  if (!isAuthenticated && currentPage !== 'ProductLanding' && currentPage !== 'AuthPage') {
    return (
      <AuthPage
        onAuthSuccess={() => {
          setIsAuthenticated(true);
          setCurrentPage('Homepage');
        }}
      />
    );
  }

  return (
    <div className={showSidebar ? "flex min-h-screen" : "min-h-screen"} style={{ backgroundColor: '#F5F7FA' }}>
      {showSidebar && (
        <Sidebar
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      )}

      <div className={showSidebar ? "flex-1 flex flex-col overflow-x-hidden bg-[#FFFAED]" : "w-full"}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
