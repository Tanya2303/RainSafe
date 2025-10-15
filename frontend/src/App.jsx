import { useState } from 'react';
import Homepage from './components/Homepage/Homepage';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar/Sidebar';

// Page imports
import DashboardPage from './components/DashboardPage/DashboardPage';
import ReportPage from './components/ReportPage/ReportPage';
import MapPage from './components/MapPage/MapPage';
import AlertsPage from './components/AlertPage/AlertPage';


function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('Homepage'); // Default to Homepage
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Start as authenticated to show homepage

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Navigation handler that manages page state AND authentication state
  const handleNavigate = (pageId) => {
    if (pageId === 'AuthPage') {
      // If the user clicks the Auth link (Login/Sign Up), log them out (set isAuthenticated to false)
      setIsAuthenticated(false);
      setCurrentPage('AuthPage');
    } else {
      setCurrentPage(pageId);
    }
  };

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
        // Default to Homepage if page not found
        return <Homepage toggleMenu={toggleMenu} />;
    }
  };

  if (!isAuthenticated) {
    // If not authenticated, always render AuthPage. On successful auth, set authenticated to true and go to Homepage.
    return <AuthPage onAuthSuccess={() => { setIsAuthenticated(true); setCurrentPage('Homepage'); }} />;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      
      {/* Sidebar - uses the new general navigation handler */}
      <Sidebar 
        isMenuOpen={isMenuOpen} 
        toggleMenu={toggleMenu}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area - renders the selected page */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;