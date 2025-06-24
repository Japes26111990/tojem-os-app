import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts & Guards
import ProtectedRoute from './components/layout/ProtectedRoute';
import RoleBasedRoute from './components/layout/RoleBasedRoute';

// Pages
import LoginPage from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import StockControlPage from './pages/StockControlPage';
import JobCreatorPage from './pages/JobCreatorPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import ScannerPage from './pages/ScannerPage';
import QcPage from './pages/QcPage';
import IssuesPage from './pages/IssuesPage';
import PerformancePage from './pages/PerformancePage';
import EmployeeIntelligencePage from './pages/EmployeeIntelligencePage';
import ProductViabilityPage from './pages/ProductViabilityPage';
import SettingsPage from './pages/SettingsPage';
// NEW IMPORTS
import PayrollPage from './pages/PayrollPage';
import ValuationPage from './pages/ValuationPage';


function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/*" element={
            <ProtectedRoute>
              <Routes>
                {/* Routes accessible to ALL logged-in employees */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tracking" element={<LiveTrackingPage />} />
                <Route path="/scan" element={<ScannerPage />} />

                {/* --- ROLE PROTECTED ROUTES --- */}

                {/* Routes for Managers and QC Inspectors */}
                <Route path="/qc" element={
                    <RoleBasedRoute roles={['Manager', 'QC Inspector']}>
                        <QcPage />
                    </RoleBasedRoute>
                } />

                {/* Routes for Managers ONLY */}
                <Route path="/stock" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <StockControlPage />
                    </RoleBasedRoute>
                } />
                <Route path="/creator" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <JobCreatorPage />
                    </RoleBasedRoute>
                } />
                <Route path="/issues" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <IssuesPage />
                    </RoleBasedRoute>
                } />
                <Route path="/performance" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <PerformancePage />
                    </RoleBasedRoute>
                } />
                 <Route path="/employee/:employeeId" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <EmployeeIntelligencePage />
                    </RoleBasedRoute>
                } />
                <Route path="/profitability" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <ProductViabilityPage />
                    </RoleBasedRoute>
                } />
                
                {/* NEW PAYROLL AND VALUATION ROUTES, PROTECTED BY MANAGER ROLE */}
                <Route path="/payroll" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <PayrollPage />
                    </RoleBasedRoute>
                } />
                <Route path="/valuation" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <ValuationPage />
                    </RoleBasedRoute>
                } />

                <Route path="/settings" element={
                    <RoleBasedRoute roles={['Manager']}>
                        <SettingsPage />
                    </RoleBasedRoute>
                } />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
