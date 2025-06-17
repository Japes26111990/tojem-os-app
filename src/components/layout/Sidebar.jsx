import React, { useState } from 'react';
import { SlidersHorizontal, Calendar, Calculator, NotebookText, Sun, ChevronDown, ChevronRight } from 'lucide-react';
import NotesApplet from '../features/sidebar/NotesApplet';
import WeatherApplet from '../features/sidebar/WeatherApplet';
import CalendarApplet from '../features/sidebar/CalendarApplet';
import CalculatorApplet from '../features/sidebar/CalculatorApplet';


// This component can now be opened/closed to show the applet content
const SidebarApplet = ({ icon, text, isOpen, children }) => {
    const [isAppletOpen, setAppletOpen] = useState(false);
    return (
        <div className="my-1">
            <button onClick={() => setAppletOpen(!isAppletOpen)} className="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
                {icon}
                {isOpen && <span className="ml-4 font-semibold text-sm">{text}</span>}
                {isOpen && (isAppletOpen ? <ChevronDown size={16} className="ml-auto"/> : <ChevronRight size={16} className="ml-auto"/>)}
            </button>
            {isAppletOpen && isOpen && (
                <div className="mt-1 border-l-2 border-blue-500/30 ml-5 pl-3">
                    {children}
                </div>
            )}
        </div>
    )
};


const Sidebar = ({ isOpen }) => {
  return (
    <div className={`bg-gray-800 border-r border-gray-700 p-4 flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="flex-grow">
        <SidebarApplet isOpen={isOpen} icon={<NotebookText size={24} />} text="Notes">
            <NotesApplet />
        </SidebarApplet>
        <SidebarApplet isOpen={isOpen} icon={<Sun size={24} />} text="Weather">
            <WeatherApplet />
        </SidebarApplet>
        <SidebarApplet isOpen={isOpen} icon={<Calendar size={24} />} text="Calendar">
            <CalendarApplet />
        </SidebarApplet>
        <SidebarApplet isOpen={isOpen} icon={<Calculator size={24} />} text="Calculator">
            <CalculatorApplet />
        </SidebarApplet>
      </div>
      <div className="border-t border-gray-700 pt-4">
         <a href="/settings" className="w-full flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
            <SlidersHorizontal size={24} />
            {isOpen && <span className="ml-4 font-semibold text-sm">App Settings</span>}
        </a>
      </div>
    </div>
  );
};

export default Sidebar;