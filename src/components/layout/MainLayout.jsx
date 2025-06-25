// FILE: src/components/layout/MainLayout.jsx

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Import useLocation
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Sidebar from './Sidebar';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import TojemLogo from '../../assets/TOJEM 2024.png';
import NotificationBell from './NotificationBell';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  // Set the sidebar to be open by default on larger screens
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const location = useLocation(); // Get the current location object

  // --- NEW: Effect to auto-close sidebar on navigation for smaller screens ---
  useEffect(() => {
    // If the screen is tablet-sized or smaller, close the sidebar on navigation
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]); // Dependency array ensures this runs on every route change

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* The intelligent sidebar now includes applets */}
      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={() => setSidebarOpen(!isSidebarOpen)} variant="secondary" className="p-2">
              {isSidebarOpen ? <PanelLeftClose size={20}/> : <PanelRightClose size={20}/>}
            </Button>
            <img src={TojemLogo} alt="TOJEM OS Logo" className="h-8 sm:h-10 object-contain" />
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm text-gray-400">Signed in as {user?.email || 'Guest'}</p>
              <p className="text-xs text-gray-500 font-semibold">{user?.role || 'No Role'}</p>
            </div>
            <Button onClick={signOut} variant="secondary" className="py-1 px-3 text-sm">
                Sign Out
            </Button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;