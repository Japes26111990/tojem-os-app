// src/components/layout/MainLayout.jsx

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import TopNavBar from './TopNavBar'; // <-- IMPORT THE NEW TOPNAVBAR
import NotificationBell from './NotificationBell';
import TojemLogo from '../../assets/TOJEM 2024.png';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();

  // This layout is for users who have the sidebar hidden by their role
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

  // This is the new main layout with the top navigation bar
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* HEADER: Updated for better alignment and spacing */}
      <header className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
        {/* Left section for navigation */}
        <div className="flex-grow">
            <TopNavBar />
        </div>

        {/* Right section for user info and actions */}
        <div className="flex items-center space-x-4 pr-2">
            <div className="w-px h-8 bg-gray-700"></div> {/* Vertical separator */}
            <NotificationBell />
            <div className="text-right">
               <p className="text-sm text-gray-400 truncate max-w-[150px]">{user?.email || 'Guest'}</p>
              <p className="text-xs text-gray-500 font-semibold">{user?.role || 'No Role'}</p>
            </div>
            <Button onClick={signOut} variant="secondary" className="py-1 px-3 text-sm">
                Sign Out
            </Button>
        </div>
      </header>
      
      <main className="flex-1 p-4 sm:p-8 flex flex-col overflow-y-auto">
         {children}
      </main>
    </div>
  );
};

export default MainLayout;
