// src/components/layout/MainLayout.jsx (Upgraded with Smart Timer)

import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Sidebar from './Sidebar';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import TojemLogo from '../../assets/TOJEM 2024.png';
import NotificationBell from './NotificationBell';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  // --- NEW: useRef to hold the timer ID ---
  const timerRef = useRef(null);

  const startCloseTimer = () => {
    // Clear any existing timer before starting a new one
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 2000); // 2 seconds
  };

  const handleSidebarOpen = () => {
    setSidebarOpen(true);
    startCloseTimer();
  };

  // --- NEW: Handlers for mouse events ---
  const handleMouseEnter = () => {
    // When mouse enters the sidebar, clear the timer to prevent it from closing
    clearTimeout(timerRef.current);
  };

  const handleMouseLeave = () => {
    // When mouse leaves, restart the timer
    startCloseTimer();
  };
  
  // This effect is no longer needed as we handle it with the mouse leave event
  // useEffect(() => { ... }, [isSidebarOpen]);

  // Effect to auto-close sidebar on navigation for smaller screens remains useful
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* MODIFIED: The button now calls handleSidebarOpen or setSidebarOpen(false) */}
            <Button onClick={() => isSidebarOpen ? setSidebarOpen(false) : handleSidebarOpen()} variant="secondary" className="p-2">
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