// src/App.jsx (Updated with new routes)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts & Guards
import ProtectedRoute from './components/layout/ProtectedRoute';
import RoleBasedRoute from './components/layout/RoleBasedRoute';
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/Login';
import DashboardPage from './pages/DashboardPage';
// REMOVED old StockControlPage import
import JobCreatorPage from './pages/JobCreatorPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import ScannerPage from './pages/ScannerPage';
import QcPage from './pages/QcPage';
import IssuesPage from './pages/IssuesPage';
import PerformancePage from './pages/PerformancePage';
import EmployeeIntelligencePage from './pages/EmployeeIntelligencePage';
import ProductViabilityPage from './pages/ProductViabilityPage';
import SettingsPage from './pages/SettingsPage';
import PayrollPage from './pages/PayrollPage';
import ValuationPage from './pages/ValuationPage';
import CalendarPage from './pages/CalendarPage';
import MarketingPage from './pages/MarketingPage';
import QuotingPage from './pages/QuotingPage';
import JobCardAdjustmentPage from './pages/JobCardAdjustmentPage'; 

// --- NEW PAGE IMPORTS ---
import SalesOrderPage from './pages/SalesOrderPage';
import PurchasingPage from './pages/PurchasingPage';
import StockTakePage from './pages/StockTakePage';


function App() {
    const { user } = useAuth();

    return (
        <Router>
            <Routes>
                <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
                <Route path="*" element={
                    <ProtectedRoute>
                        <MainLayout>
                            <Routes>
                                <Route path="/" element={<DashboardPage />} />
                                <Route path="/tracking" element={<LiveTrackingPage />} />
                                <Route path="/scan" element={<ScannerPage />} />
                                <Route path="/qc" element={ <RoleBasedRoute roles={['Manager', 'QC Inspector']}><QcPage /></RoleBasedRoute> } />
                                
                                {/* --- NEW & UPDATED ROUTES --- */}
                                <Route path="/orders" element={ <RoleBasedRoute roles={['Manager', 'Office Manager']}><SalesOrderPage /></RoleBasedRoute>} />
                                <Route path="/purchasing" element={ <RoleBasedRoute roles={['Manager', 'Office Manager']}><PurchasingPage /></RoleBasedRoute>} />
                                <Route path="/stock-take" element={ <RoleBasedRoute roles={['Manager', 'Office Manager']}><StockTakePage /></RoleBasedRoute>} />

                                <Route path="/creator" element={ <RoleBasedRoute roles={['Manager', 'Office Manager']}><JobCreatorPage /></RoleBasedRoute> } />
                                <Route path="/issues" element={ <RoleBasedRoute roles={['Manager', 'QC Inspector']}><IssuesPage /></RoleBasedRoute> } />
                                <Route path="/performance" element={ <RoleBasedRoute roles={['Manager']}><PerformancePage /></RoleBasedRoute> } />
                                <Route path="/employee/:employeeId" element={ <RoleBasedRoute roles={['Manager']}><EmployeeIntelligencePage /></RoleBasedRoute> } />
                                <Route path="/profitability" element={ <RoleBasedRoute roles={['Manager', 'Marketing']}><ProductViabilityPage /></RoleBasedRoute> } />
                                <Route path="/payroll" element={ <RoleBasedRoute roles={['Manager', 'Office Manager']}><PayrollPage /></RoleBasedRoute> } />
                                <Route path="/valuation" element={ <RoleBasedRoute roles={['Manager', 'Office Manager']}><ValuationPage /></RoleBasedRoute> } />
                                <Route path="/calendar" element={ <RoleBasedRoute roles={['Manager', 'Workshop Employee']}><CalendarPage /></RoleBasedRoute> } />
                                <Route path="/settings" element={ <RoleBasedRoute roles={['Manager']}><SettingsPage /></RoleBasedRoute> } />
                                <Route path="/marketing" element={ <RoleBasedRoute roles={['Manager', 'Marketing']}><MarketingPage /></RoleBasedRoute> } />
                                <Route path="/quotes" element={ <RoleBasedRoute roles={['Manager', 'Office Manager', 'Marketing']}><QuotingPage /></RoleBasedRoute> } />
                                <Route path="/adjustment" element={<RoleBasedRoute roles={['Manager']}><JobCardAdjustmentPage /></RoleBasedRoute>} />
                                
                                {/* Fallback route if no other route matches */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </MainLayout>
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
