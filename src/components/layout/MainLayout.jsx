import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();

  const linkClass = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
  const activeLinkClass = "bg-blue-600 text-white";
  const inactiveLinkClass = "text-gray-400 hover:bg-gray-700 hover:text-white";

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <header className="flex justify-between items-center mb-6">
          <div className="text-left">
            <h1 className="text-3xl font-extrabold text-blue-400">TOJEM OS</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Signed in as {user.email}</p>
            <Button onClick={signOut} variant="secondary" className="mt-2 py-1 px-3 text-xs">
              Sign Out
            </Button>
          </div>
        </header>

        <nav className="mb-8 flex justify-center bg-gray-800 p-2 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex flex-wrap justify-center gap-2">
            <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              Dashboard
            </NavLink>
            <NavLink to="/stock" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              Stock Control
            </NavLink>
            <NavLink to="/creator" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              Job Creator
            </NavLink>
            <NavLink to="/tracking" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              Tracking
            </NavLink>
            <NavLink to="/scan" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              Scanner
            </NavLink>
            <NavLink to="/qc" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              QC
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
              Settings
            </NavLink>
          </div>
        </nav>

        <main>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;