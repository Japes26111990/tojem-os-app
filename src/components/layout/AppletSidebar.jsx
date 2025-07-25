// src/components/layout/AppletSidebar.jsx

import React, { useState } from 'react'; // Corrected this line
import { NotebookText, Sun, Calculator, X } from 'lucide-react';
import NotesApplet from '../features/sidebar/NotesApplet.jsx';
import WeatherApplet from '../features/sidebar/WeatherApplet.jsx';
import CalculatorApplet from '../features/sidebar/CalculatorApplet.jsx';
import Button from '../ui/Button.jsx';

const AppletButton = ({ icon, label, onClick, isActive }) => (
    <button
        onClick={onClick}
        title={label}
        className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
    </button>
);

const AppletSidebar = () => {
    const [activeApplet, setActiveApplet] = useState(null);

    const toggleApplet = (appletName) => {
        setActiveApplet(prev => (prev === appletName ? null : appletName));
    };

    const applets = [
        { name: 'notes', label: 'Scratchpad', icon: <NotebookText size={24} />, component: <NotesApplet /> },
        { name: 'weather', label: 'Weather', icon: <Sun size={24} />, component: <WeatherApplet /> },
        { name: 'calculator', label: 'Calculator', icon: <Calculator size={24} />, component: <CalculatorApplet /> },
    ];

    const renderActiveApplet = () => {
        if (!activeApplet) return null;
        const applet = applets.find(a => a.name === activeApplet);
        return applet ? applet.component : null;
    };

    return (
        <>
            {/* The Icon Bar */}
            <div className="fixed top-0 right-0 h-full bg-gray-800 border-l border-gray-700 flex flex-col items-center p-2 space-y-2 z-40 mt-[65px]">
                {applets.map(applet => (
                    <AppletButton
                        key={applet.name}
                        icon={applet.icon}
                        label={applet.label}
                        onClick={() => toggleApplet(applet.name)}
                        isActive={activeApplet === applet.name}
                    />
                ))}
            </div>

            {/* The Slide-out Panel */}
            <div
                className={`fixed top-0 right-16 h-full bg-gray-800 border-l border-gray-700 shadow-2xl z-30 transition-transform duration-300 ease-in-out mt-[65px] ${
                    activeApplet ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ width: '300px' }}
            >
                {activeApplet && (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center p-2 border-b border-gray-700">
                            <h3 className="font-semibold text-white text-sm ml-2">{applets.find(a=>a.name === activeApplet)?.label}</h3>
                            <Button onClick={() => setActiveApplet(null)} variant="secondary" className="p-2 h-8 w-8">
                                <X size={16} />
                            </Button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {renderActiveApplet()}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AppletSidebar;
