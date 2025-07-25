// src/components/layout/TopNavBar.jsx

import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  LayoutDashboard, HardHat, Package, Truck, BarChart3,
  FileText, CheckSquare, AlertTriangle, ScanLine,
  Calendar as CalendarIcon, SlidersHorizontal, ChevronDown,
  Briefcase, Banknote, BrainCircuit, DollarSign,
  Megaphone, ShoppingCart, ClipboardList, Cpu,
  LayoutGrid, PackageSearch, UserCheck, Map, Clock, BarChart,
  Aperture, NotebookText, Sun, Calculator, Factory
} from 'lucide-react';
import TojemLogo from '../../assets/TOJEM 2024.png';

// Import the applet components
import NotesApplet from '../features/sidebar/NotesApplet.jsx';
import WeatherApplet from '../features/sidebar/WeatherApplet.jsx';
import CalendarApplet from '../features/sidebar/CalendarApplet.jsx';
import CalculatorApplet from '../features/sidebar/CalculatorApplet.jsx';

const NavLinkItem = ({ to, icon, text }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center w-full px-4 py-2 text-sm text-gray-200 rounded-md hover:bg-blue-600 hover:text-white transition-colors ${
        isActive ? 'bg-blue-700 text-white' : ''
      }`
    }
  >
    {icon}
    <span className="ml-3">{text}</span>
  </NavLink>
);

const NavGroup = ({ title, icon, children, dropdownWidth = 'w-64' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null); // Ref to hold the timeout ID

  // Add a delay on mouse leave to prevent premature closing
  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current); // Clear any pending close timer
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Set a timer to close the menu after a short delay (e.g., 150ms)
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center px-4 py-2 text-sm font-semibold text-gray-300 rounded-md hover:bg-gray-700 transition-colors">
        {icon}
        <span className="ml-2">{title}</span>
        <ChevronDown size={16} className={`ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`absolute top-full left-0 mt-1 ${dropdownWidth} bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-2 animate-fade-in-fast transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          {children}
      </div>
    </div>
  );
};

const TopNavBar = () => {
  const { user } = useAuth();
  const canSee = (permission) => !!user?.permissions?.[permission];

  return (
    <nav className="flex items-center">
      <div className="flex items-center gap-6">
        <img src={TojemLogo} alt="TOJEM OS Logo" className="h-8 object-contain" />
        
        {canSee('dashboard') && (
            <NavGroup title="Dashboards" icon={<LayoutDashboard size={18} />}>
                <NavLinkItem to="/dashboard" icon={<LayoutDashboard size={16} />} text="Mission Control" />
                <NavLinkItem to="/kpi-dashboard" icon={<BarChart size={16} />} text="KPI Dashboard" />
            </NavGroup>
        )}

        {(canSee('quotes') || canSee('marketing')) && (
          <NavGroup title="Sales" icon={<Megaphone size={18} />}>
            {canSee('quotes') && <NavLinkItem to="/quotes" icon={<DollarSign size={16} />} text="Sales Quotes" />}
            {canSee('marketing') && <NavLinkItem to="/marketing" icon={<BarChart3 size={16} />} text="Marketing" />}
          </NavGroup>
        )}

        {(canSee('orders') || canSee('purchasing') || canSee('stockTake')) && (
          <NavGroup title="Inventory" icon={<Package size={18} />}>
            {canSee('orders') && <NavLinkItem to="/orders" icon={<ShoppingCart size={16} />} text="Sales Orders" />}
            {canSee('purchasing') && <NavLinkItem to="/stock-hub" icon={<Package size={16} />} text="Stock Hub" />}
            {canSee('stockTake') && <NavLinkItem to="/stock-take" icon={<ClipboardList size={16} />} text="Stock Take App" />}
            {canSee('settings') && <NavLinkItem to="/product-catalog" icon={<Factory size={16} />} text="Product Catalog" />}
          </NavGroup>
        )}

        {(canSee('tracking') || canSee('scanner') || canSee('calendar') || canSee('kanban') || canSee('picking') || canSee('floorplan')) && (
          <NavGroup title="Workshop" icon={<HardHat size={18} />}>
            {canSee('tracking') && <NavLinkItem to="/tracking" icon={<BarChart3 size={16} />} text="Live Tracking" />}
            {canSee('kanban') && <NavLinkItem to="/kanban" icon={<LayoutGrid size={16} />} text="Kanban Board" />}
            {canSee('floorplan') && <NavLinkItem to="/floorplan" icon={<Map size={16} />} text="Floor Plan" />}
            {canSee('picking') && <NavLinkItem to="/picking-queue" icon={<PackageSearch size={16} />} text="Picking Queue" />}
            {canSee('scanner') && <NavLinkItem to="/scan" icon={<ScanLine size={16} />} text="Scanner" />}
            {canSee('calendar') && <NavLinkItem to="/calendar" icon={<CalendarIcon size={16} />} text="Calendar" />}
          </NavGroup>
        )}

        {(canSee('jobCreator') || canSee('qc') || canSee('issues') || canSee('adjustment')) && (
          <NavGroup title="Production" icon={<FileText size={18} />}>
            {canSee('jobCreator') && <NavLinkItem to="/creator" icon={<FileText size={16} />} text="Job Creator" />}
            {canSee('qc') && <NavLinkItem to="/qc" icon={<CheckSquare size={16} />} text="Quality Control" />}
            {canSee('issues') && <NavLinkItem to="/issues" icon={<AlertTriangle size={16} />} text="Issues" />}
            {canSee('adjustment') && <NavLinkItem to="/adjustment" icon={<SlidersHorizontal size={16} />} text="Job Adjustment" />}
          </NavGroup>
        )}

        {(canSee('performance') || canSee('profitability') || canSee('valuation') || canSee('assets')) && (
          <NavGroup title="Intelligence" icon={<BrainCircuit size={18} />}>
            {canSee('performance') && <NavLinkItem to="/performance" icon={<Briefcase size={16} />} text="Performance" />}
            {canSee('profitability') && <NavLinkItem to="/profitability" icon={<DollarSign size={16} />} text="Profitability" />}
            {canSee('valuation') && <NavLinkItem to="/valuation" icon={<Banknote size={16} />} text="Financials" />}
            {canSee('assets') && <NavLinkItem to="/assets" icon={<Cpu size={16} />} text="Asset Intelligence" />}
            {canSee('performance') && <NavLinkItem to="/time-attendance" icon={<Clock size={16} />} text="Time & Attendance" />}
          </NavGroup>
        )}

        <NavGroup title="Tools" icon={<Aperture size={18} />} dropdownWidth="w-72">
            <div className="p-2 space-y-2">
                <NotesApplet />
                <hr className="border-gray-700" />
                <WeatherApplet />
                <hr className="border-gray-700" />
                <CalendarApplet />
                 <hr className="border-gray-700" />
                <CalculatorApplet />
            </div>
        </NavGroup>

        {canSee('settings') && <NavLink to="/settings" className="flex items-center px-4 py-2 text-sm font-semibold text-gray-300 rounded-md hover:bg-gray-700 transition-colors"><SlidersHorizontal size={18} /><span className="ml-2">Settings</span></NavLink>}
      </div>
    </nav>
  );
};

export default TopNavBar;
