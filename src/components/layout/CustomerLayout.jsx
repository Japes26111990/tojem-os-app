// src/components/layout/CustomerLayout.jsx

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import TojemLogo from '../../assets/TOJEM 2024.png';
import { Link } from 'react-router-dom';
import { QrCode } from 'lucide-react';

const CustomerLayout = ({ children }) => {
    const { user, signOut } = useAuth();

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
                <Link to="/portal">
                    <img src={TojemLogo} alt="TOJEM OS Logo" className="h-8 sm:h-10 object-contain" />
                </Link>
                <div className="flex items-center space-x-4">
                    <Link to="/portal/scanner">
                        <Button variant="primary" className="py-1 px-3 text-sm">
                            <QrCode size={16} className="mr-2" />
                            Scan Stock
                        </Button>
                    </Link>
                    <div className="text-right">
                        <p className="font-semibold text-white">{user?.companyName || 'Valued Customer'}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
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
};

export default CustomerLayout;
