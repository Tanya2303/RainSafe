// App.jsx
import { useState } from 'react';
import Homepage from './components/Homepage/Homepage';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar/Sidebar';

// Page imports
import DashboardPage from './components/DashboardPage/DashboardPage';
import ReportPage from './components/ReportPage/ReportPage';
import MapPage from './components/MapPage/MapPage';
import AlertsPage from './components/AlertPage/AlertPage';
import LandingPage from './components/LandingPage';

// NEW: Risk page import
import RiskSection from './components/RiskSection/RiskSection';

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
      <div className="p-4 md:p-6 flex items-center justify-between bg-white border-b border-gray-200 lg:sticky lg:top-0 z-30">
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
