import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Layouts & Guards
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RoleBasedRoute from './components/layout/RoleBasedRoute.jsx'; // Now checks permissions
import MainLayout from './components/layout/MainLayout.jsx';

// Pages
import LoginPage from './pages/Login.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import JobCreatorPage from './pages/JobCreatorPage.jsx';
import LiveTrackingPage from './pages/LiveTrackingPage.jsx';
import ScannerPage from './pages/ScannerPage.jsx';
import QcPage from './pages/QcPage.jsx';
import IssuesPage from './pages/IssuesPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import EmployeeIntelligencePage from './pages/EmployeeIntelligencePage.jsx';
import ProductViabilityPage from './pages/ProductViabilityPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PayrollPage from './pages/PayrollPage.jsx';
import ValuationPage from './pages/ValuationPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import MarketingPage from './pages/MarketingPage.jsx';
import QuotingPage from './pages/QuotingPage.jsx';
import JobCardAdjustmentPage from './pages/JobCardAdjustmentPage.jsx'; 
import SalesOrderPage from './pages/SalesOrderPage.jsx';
import PurchasingPage from './pages/PurchasingPage.jsx';
import StockTakePage from './pages/StockTakePage.jsx';
import AssetIntelligencePage from './pages/AssetIntelligencePage.jsx';

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
                                {/* --- UPDATED ROUTES to use permission prop --- */}
                                <Route path="/" element={<RoleBasedRoute permission="dashboard"><DashboardPage /></RoleBasedRoute>} />
                                <Route path="/tracking" element={<RoleBasedRoute permission="tracking"><LiveTrackingPage /></RoleBasedRoute>} />
                                <Route path="/scan" element={<RoleBasedRoute permission="scanner"><ScannerPage /></RoleBasedRoute>} />
                                <Route path="/qc" element={ <RoleBasedRoute permission="qc"><QcPage /></RoleBasedRoute> } />
                                
                                <Route path="/orders" element={ <RoleBasedRoute permission="orders"><SalesOrderPage /></RoleBasedRoute>} />
                                <Route path="/purchasing" element={ <RoleBasedRoute permission="purchasing"><PurchasingPage /></RoleBasedRoute>} />
                                <Route path="/stock-take" element={ <RoleBasedRoute permission="stockTake"><StockTakePage /></RoleBasedRoute>} />

                                <Route path="/creator" element={ <RoleBasedRoute permission="jobCreator"><JobCreatorPage /></RoleBasedRoute> } />
                                <Route path="/issues" element={ <RoleBasedRoute permission="issues"><IssuesPage /></RoleBasedRoute> } />
                                <Route path="/performance" element={ <RoleBasedRoute permission="performance"><PerformancePage /></RoleBasedRoute> } />
                                <Route path="/employee/:employeeId" element={ <RoleBasedRoute permission="performance"><EmployeeIntelligencePage /></RoleBasedRoute> } />
                                <Route path="/profitability" element={ <RoleBasedRoute permission="profitability"><ProductViabilityPage /></RoleBasedRoute> } />
                                <Route path="/payroll" element={ <RoleBasedRoute permission="payroll"><PayrollPage /></RoleBasedRoute> } />
                                <Route path="/valuation" element={ <RoleBasedRoute permission="valuation"><ValuationPage /></RoleBasedRoute> } />
                                <Route path="/calendar" element={ <RoleBasedRoute permission="calendar"><CalendarPage /></RoleBasedRoute> } />
                                <Route path="/settings" element={ <RoleBasedRoute permission="settings"><SettingsPage /></RoleBasedRoute> } />
                                <Route path="/marketing" element={ <RoleBasedRoute permission="marketing"><MarketingPage /></RoleBasedRoute> } />
                                <Route path="/quotes" element={ <RoleBasedRoute permission="quotes"><QuotingPage /></RoleBasedRoute> } />
                                <Route path="/adjustment" element={<RoleBasedRoute permission="adjustment"><JobCardAdjustmentPage /></RoleBasedRoute>} />
                                <Route path="/assets" element={<RoleBasedRoute permission="assets"><AssetIntelligencePage /></RoleBasedRoute>} />
                                
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
