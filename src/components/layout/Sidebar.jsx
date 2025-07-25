// src/components/layout/Sidebar.jsx (UPDATED)
// Added a new link for the Time & Attendance report under the Business Intelligence NavGroup.

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  LayoutDashboard, HardHat, Package, Truck, BarChart3,
  FileText, CheckSquare, AlertTriangle, ScanLine,
  Calendar as CalendarIcon, SlidersHorizontal, ChevronDown, ChevronRight,
  Briefcase, Banknote, BrainCircuit, DollarSign,
  Aperture, Calculator, NotebookText, Sun,
  Megaphone, ShoppingCart, ClipboardList, Cpu,
  LayoutGrid, PackageSearch, UserCheck, Map, Clock // <-- Import Clock icon
} from 'lucide-react';
import NotesApplet from '../features/sidebar/NotesApplet.jsx';
import WeatherApplet from '../features/sidebar/WeatherApplet.jsx';
import CalendarApplet from '../features/sidebar/CalendarApplet.jsx';
import CalculatorApplet from '../features/sidebar/CalculatorApplet.jsx';

const SidebarLink = ({ to, icon, text, isOpen }) => {
  const commonClasses = "flex items-center p-3 my-1 rounded-lg transition-colors";
  const activeClass = "bg-blue-600 text-white font-semibold";
  const inactiveClass = "text-gray-300 hover:bg-gray-700";
  return (
    <NavLink to={to} className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
      {icon}
      {isOpen && <span className="ml-4 text-sm">{text}</span>}
    </NavLink>
  );
};

const NavGroup = ({ title, icon, children, isOpen, defaultOpen = false }) => {
  const [isGroupOpen, setGroupOpen] = useState(defaultOpen);
  return (
    <div className="py-2">
      <button
        onClick={() => setGroupOpen(!isGroupOpen)}
        className="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
      >
        {icon}
        {isOpen && <span className="ml-4 font-semibold text-sm">{title}</span>}
        {isOpen && (isGroupOpen ? <ChevronDown size={16} className="ml-auto" /> : <ChevronRight size={16} className="ml-auto" />)}
      </button>
      {isGroupOpen && isOpen && (
        <div className="mt-1 border-l-2 border-gray-700 ml-5 pl-3 space-y-1">{children}</div>
      )}
    </div>
  );
};

const Applet = ({ icon, text, children, isOpen }) => {
  const [isAppletOpen, setAppletOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setAppletOpen(!isAppletOpen)}
        className="w-full flex items-center p-3 my-1 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
      >
        {icon}
        {isOpen && <span className="ml-4 text-sm">{text}</span>}
        {isOpen && (isAppletOpen ? <ChevronDown size={16} className="ml-auto text-gray-500" /> : <ChevronRight size={16} className="ml-auto text-gray-500" />)}
      </button>
      {isAppletOpen && isOpen && (
        <div className="mt-1 border-l-2 border-blue-500/30 ml-5 pl-1 py-2">{children}</div>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, isPinned, onMouseEnter, onMouseLeave }) => {
  const { user } = useAuth();
  const canSee = (permission) => !!user?.permissions?.[permission];

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`bg-gray-800 border-r border-gray-700 p-2 flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}
    >
      <div className="flex-grow overflow-y-auto">

        {canSee('dashboard') && <SidebarLink to="/" icon={<LayoutDashboard size={22} />} text="Dashboard" isOpen={isOpen} />}

        {(canSee('quotes') || canSee('marketing')) && (
          <NavGroup title="Sales & Marketing" icon={<Megaphone size={22} />} isOpen={isOpen}>
            {canSee('quotes') && <SidebarLink to="/quotes" icon={<DollarSign size={18} />} text="Sales Quotes" isOpen={isOpen} />}
            {canSee('marketing') && <SidebarLink to="/marketing" icon={<BarChart3 size={18} />} text="Marketing Dashboard" isOpen={isOpen} />}
          </NavGroup>
        )}

        {(canSee('orders') || canSee('purchasing') || canSee('stockTake')) && (
          <NavGroup title="Supply Chain" icon={<Truck size={22} />} isOpen={isOpen}>
            {canSee('orders') && <SidebarLink to="/orders" icon={<ShoppingCart size={18} />} text="Sales Orders" isOpen={isOpen} />}
            {canSee('purchasing') && <SidebarLink to="/purchasing" icon={<Package size={18} />} text="Purchasing Hub" isOpen={isOpen} />}
            {canSee('stockTake') && <SidebarLink to="/stock-take" icon={<ClipboardList size={18} />} text="Stock Take" isOpen={isOpen} />}
          </NavGroup>
        )}

        {(canSee('tracking') || canSee('scanner') || canSee('calendar') || canSee('kanban') || canSee('picking') || canSee('floorplan')) && (
          <NavGroup title="Workshop Floor" icon={<HardHat size={22} />} isOpen={isOpen} defaultOpen={true}>
            {canSee('tracking') && <SidebarLink to="/tracking" icon={<BarChart3 size={18} />} text="Live Tracking" isOpen={isOpen} />}
            {canSee('kanban') && <SidebarLink to="/kanban" icon={<LayoutGrid size={18} />} text="Kanban Board" isOpen={isOpen} />}
            {canSee('floorplan') && <SidebarLink to="/floorplan" icon={<Map size={18} />} text="Floor Plan" isOpen={isOpen} />}
            {canSee('picking') && <SidebarLink to="/picking-queue" icon={<PackageSearch size={18} />} text="Picking Queue" isOpen={isOpen} />}
            {canSee('scanner') && <SidebarLink to="/scan" icon={<ScanLine size={18} />} text="Scanner" isOpen={isOpen} />}
            {canSee('calendar') && <SidebarLink to="/calendar" icon={<CalendarIcon size={18} />} text="Calendar" isOpen={isOpen} />}
          </NavGroup>
        )}

        {(canSee('jobCreator') || canSee('qc') || canSee('issues') || canSee('adjustment') || canSee('multiStage') || canSee('jobHistory') || canSee('reworkQueue') || canSee('stockAdjust') || canSee('jobReprint')) && (
          <NavGroup title="Production Control" icon={<FileText size={22} />} isOpen={isOpen}>
            {canSee('jobCreator') && <SidebarLink to="/creator" icon={<FileText size={18} />} text="Job Creator" isOpen={isOpen} />}
            {canSee('qc') && <SidebarLink to="/qc" icon={<CheckSquare size={18} />} text="Quality Control" isOpen={isOpen} />}
            {canSee('issues') && <SidebarLink to="/issues" icon={<AlertTriangle size={18} />} text="Issues" isOpen={isOpen} />}
            {canSee('adjustment') && <SidebarLink to="/adjustment" icon={<SlidersHorizontal size={18} />} text="Job Card Adjustment" isOpen={isOpen} />}
            {canSee('multiStage') && <SidebarLink to="/multi-stage-wizard" icon={<FileText size={18} />} text="Multi-Stage Wizard" isOpen={isOpen} />}
            {canSee('jobHistory') && <SidebarLink to="/job-history" icon={<FileText size={18} />} text="Job History" isOpen={isOpen} />}
            {canSee('reworkQueue') && <SidebarLink to="/rework-queue" icon={<AlertTriangle size={18} />} text="Rework Queue" isOpen={isOpen} />}
            {canSee('stockAdjust') && <SidebarLink to="/stock-adjust" icon={<SlidersHorizontal size={18} />} text="Stock Adjustment" isOpen={isOpen} />}
            {canSee('jobReprint') && <SidebarLink to="/job-reprint" icon={<FileText size={18} />} text="Reprint Jobs" isOpen={isOpen} />}
          </NavGroup>
        )}

        {(canSee('performance') || canSee('profitability') || canSee('valuation') || canSee('assets')) && (
          <NavGroup title="Business Intelligence" icon={<BrainCircuit size={22} />} isOpen={isOpen}>
            {canSee('performance') && <SidebarLink to="/performance" icon={<Briefcase size={18} />} text="Performance" isOpen={isOpen} />}
            {canSee('profitability') && <SidebarLink to="/profitability" icon={<DollarSign size={18} />} text="Profitability" isOpen={isOpen} />}
            {canSee('valuation') && <SidebarLink to="/valuation" icon={<Banknote size={18} />} text="Financials & Planning" isOpen={isOpen} />}
            {canSee('assets') && <SidebarLink to="/assets" icon={<Cpu size={18} />} text="Asset Intelligence" isOpen={isOpen} />}
            {/* --- NEW LINK --- */}
            {canSee('performance') && <SidebarLink to="/time-attendance" icon={<Clock size={18} />} text="Time & Attendance" isOpen={isOpen} />}
          </NavGroup>
        )}
        
      </div>

      <div className="flex-shrink-0 border-t border-gray-700 pt-2">
        <NavGroup title="Tools & Applets" icon={<Aperture size={22} />} isOpen={isOpen}>
          <Applet icon={<NotebookText size={18} />} text="Scratchpad" isOpen={isOpen}><NotesApplet /></Applet>
          <Applet icon={<Sun size={18} />} text="Weather" isOpen={isOpen}><WeatherApplet /></Applet>
          <Applet icon={<CalendarIcon size={18} />} text="Mini Calendar" isOpen={isOpen}><CalendarApplet /></Applet>
          <Applet icon={<Calculator size={18} />} text="Calculator" isOpen={isOpen}><CalculatorApplet /></Applet>
        </NavGroup>

        {canSee('settings') && <SidebarLink to="/settings" icon={<SlidersHorizontal size={22} />} text="Settings" isOpen={isOpen} />}
      </div>
    </div>
  );
};

export default Sidebar;
