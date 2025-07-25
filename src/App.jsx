// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Layouts & Guards
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RoleBasedRoute from './components/layout/RoleBasedRoute.jsx';
import MainLayout from './components/layout/MainLayout.jsx';
import CustomerLayout from './components/layout/CustomerLayout.jsx';

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
import ValuationPage from './pages/ValuationPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import MarketingPage from './pages/MarketingPage.jsx';
import QuotingPage from './pages/QuotingPage.jsx';
import JobCardAdjustmentPage from './pages/JobCardAdjustmentPage.jsx';
import SalesOrderPage from './pages/SalesOrderPage.jsx';
import StockTakePage from './pages/StockTakePage.jsx';
import AssetIntelligencePage from './pages/AssetIntelligencePage.jsx';
import ProductBrowserPage from './pages/ProductBrowserPage.jsx';
import CustomerDashboardPage from './pages/CustomerDashboardPage.jsx';
import CustomerOrderDetailPage from './pages/CustomerOrderDetailPage.jsx';
import JobHistoryPage from './pages/JobHistoryPage.jsx';
import ReworkQueuePage from './pages/ReworkQueuePage.jsx';
import MultiStageWizard from './pages/MultiStageWizard.jsx';
import StockAdjustmentPage from './pages/StockAdjustmentPage.jsx';
import JobReprintPage from './pages/JobReprintPage.jsx';
import KanbanPage from './pages/KanbanPage.jsx';
import PickingQueuePage from './pages/PickingQueuePage.jsx';
import FloorPlanPage from './pages/FloorPlanPage.jsx';
import AndonDisplayPage from './pages/AndonDisplayPage.jsx';
import TimeAttendanceReport from './pages/TimeAttendanceReport.jsx';
import KpiDashboardPage from './pages/KpiDashboardPage.jsx';
import StockHubPage from './pages/StockHubPage.jsx';
import ProductCatalogPage from './pages/ProductCatalogPage.jsx';
import ClientScannerPage from './pages/ClientScannerPage.jsx';
import ConsumablesCatalogPage from './pages/ConsumablesCatalogPage.jsx';

const StaffLayout = () => (
    <MainLayout>
        <Outlet />
    </MainLayout>
);

const PortalLayout = () => (
    <RoleBasedRoute permission="access_portal">
        <CustomerLayout>
            <Outlet />
        </CustomerLayout>
    </RoleBasedRoute>
);

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
                Loading Application...
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/andon-display" element={<ProtectedRoute><AndonDisplayPage /></ProtectedRoute>} />

                {!user ? (
                    <>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                ) : user.role === 'Client' ? (
                    <Route path="/portal/*" element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
                        <Route index element={<CustomerDashboardPage />} />
                        <Route path="products" element={<ProductBrowserPage />} />
                        <Route path="order/:orderId" element={<CustomerOrderDetailPage />} />
                        <Route path="scanner" element={<ClientScannerPage />} />
                        <Route path="*" element={<Navigate to="/portal" replace />} />
                    </Route>
                ) : (
                    <Route element={<ProtectedRoute><StaffLayout /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<RoleBasedRoute permission="dashboard"><DashboardPage /></RoleBasedRoute>} />
                        <Route path="/kpi-dashboard" element={<RoleBasedRoute permission="dashboard"><KpiDashboardPage /></RoleBasedRoute>} />
                        <Route path="/tracking" element={<RoleBasedRoute permission="tracking"><LiveTrackingPage /></RoleBasedRoute>} />
                        <Route path="/scan" element={<RoleBasedRoute permission="scanner"><ScannerPage /></RoleBasedRoute>} />
                        <Route path="/qc" element={<RoleBasedRoute permission="qc"><QcPage /></RoleBasedRoute>} />
                        <Route path="/orders" element={<RoleBasedRoute permission="orders"><SalesOrderPage /></RoleBasedRoute>} />
                        <Route path="/stock-hub" element={<RoleBasedRoute permission="purchasing"><StockHubPage /></RoleBasedRoute>} />
                        <Route path="/stock-take" element={<RoleBasedRoute permission="stockTake"><StockTakePage /></RoleBasedRoute>} />
                        <Route path="/creator" element={<RoleBasedRoute permission="jobCreator"><JobCreatorPage /></RoleBasedRoute>} />
                        <Route path="/issues" element={<RoleBasedRoute permission="issues"><IssuesPage /></RoleBasedRoute>} />
                        <Route path="/performance" element={<RoleBasedRoute permission="performance"><PerformancePage /></RoleBasedRoute>} />
                        <Route path="/employee/:employeeId" element={<RoleBasedRoute permission="performance"><EmployeeIntelligencePage /></RoleBasedRoute>} />
                        <Route path="/profitability" element={<RoleBasedRoute permission="profitability"><ProductViabilityPage /></RoleBasedRoute>} />
                        <Route path="/valuation" element={<RoleBasedRoute permission="valuation"><ValuationPage /></RoleBasedRoute>} />
                        <Route path="/calendar" element={<RoleBasedRoute permission="calendar"><CalendarPage /></RoleBasedRoute>} />
                        <Route path="/kanban" element={<RoleBasedRoute permission="kanban"><KanbanPage /></RoleBasedRoute>} />
                        <Route path="/picking-queue" element={<RoleBasedRoute permission="picking"><PickingQueuePage /></RoleBasedRoute>} />
                        <Route path="/floorplan" element={<RoleBasedRoute permission="floorplan"><FloorPlanPage /></RoleBasedRoute>} />
                        <Route path="/settings" element={<RoleBasedRoute permission="settings"><SettingsPage /></RoleBasedRoute>} />
                        <Route path="/marketing" element={<RoleBasedRoute permission="marketing"><MarketingPage /></RoleBasedRoute>} />
                        <Route path="/quotes" element={<RoleBasedRoute permission="quotes"><QuotingPage /></RoleBasedRoute>} />
                        <Route path="/adjustment" element={<RoleBasedRoute permission="adjustment"><JobCardAdjustmentPage /></RoleBasedRoute>} />
                        <Route path="/assets" element={<RoleBasedRoute permission="assets"><AssetIntelligencePage /></RoleBasedRoute>} />
                        <Route path="/job-history" element={<RoleBasedRoute permission="jobHistory"><JobHistoryPage /></RoleBasedRoute>} />
                        <Route path="/rework-queue" element={<RoleBasedRoute permission="reworkQueue"><ReworkQueuePage /></RoleBasedRoute>} />
                        <Route path="/multi-stage-wizard" element={<RoleBasedRoute permission="multiStage"><MultiStageWizard /></RoleBasedRoute>} />
                        <Route path="/stock-adjust" element={<RoleBasedRoute permission="stockAdjust"><StockAdjustmentPage /></RoleBasedRoute>} />
                        <Route path="/job-reprint" element={<RoleBasedRoute permission="jobReprint"><JobReprintPage /></RoleBasedRoute>} />
                        <Route path="/time-attendance" element={<RoleBasedRoute permission="performance"><TimeAttendanceReport /></RoleBasedRoute>} />
                        <Route path="/product-catalog" element={<RoleBasedRoute permission="settings"><ProductCatalogPage /></RoleBasedRoute>} />
                        <Route path="/consumables-catalog" element={<RoleBasedRoute permission="settings"><ConsumablesCatalogPage /></RoleBasedRoute>} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                )}
            </Routes>
        </Router>
    );
}

export default App;
