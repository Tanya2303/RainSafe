// App.jsx
import { useState, useEffect } from 'react';
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

// [NEW] Import Firebase Auth Listener and Logout Function
// NOTE: Ensure you've created and configured frontend/src/firebase.js
import { auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 

const getUserDetails = (user) => {
  if (!user) return null;

  // Prefer Firebase displayName, fallback to email prefix
  const rawDisplayName = user.displayName?.trim() || user.email?.split('@')[0] || "User";

  // Extract first name:
  // If it's an email-like string (no spaces), use it directly.
  // If it's a full name, take only the first word.
  const firstName = rawDisplayName.includes(' ')
    ? rawDisplayName.split(' ')[0]
    : rawDisplayName;

  // Generate initials
  const initials = rawDisplayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    uid: user.uid,
    name: rawDisplayName,  // full name or fallback
    firstName: firstName,  // <-- what WelcomeBanner uses
    initials: initials,
    email: user.email,
  };
};

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('ProductLanding');
  // [MODIFIED] Use currentUser object instead of boolean isAuthenticated
  const [currentUser, setCurrentUser] = useState(null); 
  const isAuthenticated = !!currentUser;
  
  // [NEW] Logout Handler
  const handleLogout = async () => {
      try {
          await signOut(auth);
      } catch (error) {
          console.error("Logout failed:", error);
      }
  };

  // ---------- Updated useEffect to reliably load displayName ----------
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Use an async helper so we can await reload safely
      const handleUser = async (u) => {
        if (!mounted) return;

        if (u) {
          // Attempt to reload the user profile from backend to ensure displayName is populated
          // (Some providers / flows populate displayName only after a refresh)
          try {
            // user.reload updates the user object in-place
            if (typeof u.reload === 'function') {
              await u.reload();
            }
          } catch (reloadErr) {
            // Non-fatal — continue with best available data
            console.warn("User.reload() failed (non-fatal):", reloadErr);
          }

          // Look for displayName on providerData if top-level displayName is missing
          let resolvedDisplayName = u.displayName;
          if (!resolvedDisplayName && Array.isArray(u.providerData) && u.providerData.length > 0) {
            const pd = u.providerData.find(p => p && p.displayName);
            if (pd && pd.displayName) resolvedDisplayName = pd.displayName;
          }

          // Build a lightweight effective user object for getUserDetails
          const effectiveUser = {
            uid: u.uid,
            email: u.email,
            displayName: resolvedDisplayName ?? u.displayName ?? null,
          };

          // Set current user using the processed object
          setCurrentUser(getUserDetails(effectiveUser));
        } else {
          setCurrentUser(null);
        }

        // Redirect logic based on auth state (kept as original)
        if (u && (currentPage === 'AuthPage' || currentPage === 'ProductLanding')) {
          setCurrentPage('Homepage');
        } else if (!u && currentPage !== 'ProductLanding' && currentPage !== 'AuthPage') {
          setCurrentPage('ProductLanding');
        }
      };

      // Fire-and-forget (we handle errors inside handleUser)
      handleUser(user);
    });

    return () => {
      mounted = false;
      try { unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [currentPage]);
  // ------------------------------------------------------------------

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleNavigate = (pageId) => {
    // Navigate to AuthPage for both login and signup
    if (pageId === 'AuthPage') {
      setCurrentPage('AuthPage');
    } else if (pageId === 'Homepage') {
      setCurrentPage(pageId);
    } else if (pageId === 'ProductLanding') {
      setCurrentPage(pageId);
    } else {
      // For all other pages, simply navigate
      setCurrentPage(pageId);
    }
    
    // Close the mobile menu after navigation
    if (isMenuOpen) toggleMenu();
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
      <PageComponent currentUser={currentUser} /> 
    </>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'ProductLanding':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'Homepage':
        // [MODIFIED] Pass currentUser to Homepage
        return <Homepage toggleMenu={toggleMenu} currentUser={currentUser} />; 
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
        return isAuthenticated ? <Homepage toggleMenu={toggleMenu} currentUser={currentUser} /> : <LandingPage onNavigate={handleNavigate} />;
    }
  };

  // [MODIFIED] If on AuthPage, render AuthPage and pass required props
  if (currentPage === 'AuthPage') {
    return (
      <AuthPage
        onAuthSuccess={(user) => { 
          // This callback is triggered by AuthPage on successful sign-in
          // onAuthStateChanged above handles the state update and redirection
        }}
        // [NEW] Pass the necessary helper functions and state setters
        setCurrentUser={setCurrentUser} 
        getUserDetails={getUserDetails} 
      />
    );
  }

  // Fallback if not authenticated and not on Auth/Landing is handled by useEffect listener
  if (!isAuthenticated && currentPage !== 'ProductLanding' && currentPage !== 'AuthPage') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  return (
    <div className={showSidebar ? "flex min-h-screen" : "min-h-screen"} style={{ backgroundColor: '#F5F7FA' }}>
      {showSidebar && (
        <Sidebar
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          // [NEW PROPS] Pass authentication state and logout handler
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />
      )}

      <div className={showSidebar ? "flex-1 flex flex-col overflow-x-hidden bg-[#FFFAED]" : "w-full"}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
