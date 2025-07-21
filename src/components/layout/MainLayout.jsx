// src/components/layout/MainLayout.jsx

import React, { useState, useEffect } from 'react';
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

  // State to manage if the sidebar is pinned open by a click
  const [isSidebarPinned, setSidebarPinned] = useState(false);
  // State to manage if the sidebar is temporarily open due to hover
  const [isSidebarHovered, setSidebarHovered] = useState(false);

  // The sidebar is considered "open" if it's either pinned or being hovered over.
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;

  // Close sidebar on navigation for smaller screens
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setSidebarPinned(false);
    }
  }, [location.pathname]);

  // Handler for the toggle button - this now controls the "pinned" state
  const handlePinToggle = () => {
    setSidebarPinned(prev => !prev);
  };

  // Layout for users without a sidebar (e.g., tablet-only roles)
  if (user?.hideSidebar) {
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
                <img src={TojemLogo} alt="TOJEM OS Logo" className="h-8 sm:h-10 object-contain" />
                <div className="flex items-center space-x-4">
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
    );
  }

  // Main layout for users with a sidebar
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar 
        isOpen={isSidebarOpen} 
        isPinned={isSidebarPinned}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={handlePinToggle} variant="secondary" className="p-2">
               {isSidebarPinned ? <PanelLeftClose size={20}/> : <PanelRightClose size={20}/>}
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
