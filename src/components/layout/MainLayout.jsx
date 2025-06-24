// src/components/layout/MainLayout.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Sidebar from './Sidebar';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import TojemLogo from '../../assets/TOJEM 2024.png';
import NotificationBell from './NotificationBell';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const linkClass = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const activeLinkClass = "bg-blue-600 text-white";
  const inactiveLinkClass = "text-gray-400 hover:bg-gray-700 hover:text-white";
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50">
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
              <Button onClick={signOut} variant="secondary" className="mt-1 py-1 px-3 text-xs">
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <nav className="flex justify-center bg-gray-800/20 p-2 shadow-lg border-b border-gray-700">
          <div className="flex flex-wrap justify-center gap-2">
            <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Dashboard</NavLink>
            <NavLink to="/stock" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Stock Control</NavLink>
            <NavLink to="/creator" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Job Creator</NavLink>
            <NavLink to="/tracking" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Tracking</NavLink>
            <NavLink to="/scan" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Scanner</NavLink>
            <NavLink to="/qc" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>QC</NavLink>
            <NavLink to="/issues" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Issues</NavLink>
            <NavLink to="/performance" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Performance</NavLink>
            <NavLink to="/profitability" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Profitability</NavLink>
            <NavLink to="/payroll" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Payroll</NavLink>
            <NavLink to="/valuation" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Valuation</NavLink>
            <NavLink to="/calendar" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Calendar</NavLink>
            <NavLink to="/settings" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Settings</NavLink>
          </div>
        </nav>
        <main className="flex-1 overflow-y-auto p-4 sm:p-8"> {/* REMOVED RED BORDER */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
