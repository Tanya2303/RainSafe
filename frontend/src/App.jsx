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


function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Start on the Landing Page and unauthenticated for a public view
  const [currentPage, setCurrentPage] = useState('ProductLanding'); 
  const [isAuthenticated, setIsAuthenticated] = useState(false); 

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Navigation handler that manages page state AND authentication state
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

  // Check if we should render the sidebar
  const showSidebar = currentPage !== 'ProductLanding' && isAuthenticated;

  // A mapping function to render the correct page content
  const renderPage = () => {
    // Shared Header styles for non-Homepage views
    const renderPageContent = (Title, PageComponent) => (
        <>
            <div className="p-4 md:p-6 flex items-center justify-between bg-white border-b border-gray-200 lg:sticky lg:top-0 z-30">
                {/* Simplified placeholder header for non-home pages */}
                <h1 className="text-xl font-bold" style={{ color: '#333333' }}>{Title}</h1>
            </div>
            <PageComponent />
        </>
    );

    switch (currentPage) {
      case 'ProductLanding':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'Homepage':
        return <Homepage toggleMenu={toggleMenu} />; // Homepage contains its own header
      case 'DashboardPage':
        return renderPageContent('Dashboard', DashboardPage);
      case 'ReportPage':
        return renderPageContent('Reports', ReportPage);
      case 'MapPage':
        return renderPageContent('Map', MapPage);
      case 'AlertsPage':
        return renderPageContent('Alerts', AlertsPage);
      default:
        // Default based on authentication status
        return isAuthenticated ? <Homepage toggleMenu={toggleMenu} /> : <LandingPage onNavigate={handleNavigate} />;
    }
  };

  // AuthPage is a full-screen standalone experience
  if (currentPage === 'AuthPage' && !isAuthenticated) {
    return (
      <AuthPage 
        onAuthSuccess={() => { 
          setIsAuthenticated(true); 
          setCurrentPage('Homepage'); // *** ENSURED REDIRECTION TO HOMEPAGE ***
        }} 
      />
    );
  }

  // If trying to access a secure page without auth, redirect to AuthPage (or LandingPage)
  if (!isAuthenticated && currentPage !== 'ProductLanding' && currentPage !== 'AuthPage') {
    // Automatically redirect unauthenticated access of secure paths to the Auth page
    return (
        <AuthPage 
            onAuthSuccess={() => { 
              setIsAuthenticated(true); 
              setCurrentPage('Homepage'); // *** ENSURED REDIRECTION TO HOMEPAGE ***
            }} 
        />
    );
  }


  return (
    // If not showing the sidebar, the root container doesn't need 'flex' styling
    <div className={showSidebar ? "flex min-h-screen" : "min-h-screen"} style={{ backgroundColor: '#F5F7FA' }}>
      
      {/* Sidebar is only rendered if showSidebar is true */}
      {showSidebar && (
        <Sidebar 
          isMenuOpen={isMenuOpen} 
          toggleMenu={toggleMenu}
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      )}

      {/* Main Content Area: uses flex-1 only if sidebar is present */}
      <div className={showSidebar ? "flex-1 flex flex-col overflow-x-hidden" : "w-full"}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;