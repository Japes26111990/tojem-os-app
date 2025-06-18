import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts and Pages
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/Login';
import SettingsPage from './pages/SettingsPage';
import JobCreatorPage from './pages/JobCreatorPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import ScannerPage from './pages/ScannerPage';
import QcPage from './pages/QcPage';
import StockControlPage from './pages/StockControlPage';
import DashboardPage from './pages/DashboardPage';
import PerformancePage from './pages/PerformancePage'; // <-- 1. IMPORT THE NEW PAGE

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/stock" element={<StockControlPage />} />
                <Route path="/creator" element={<JobCreatorPage />} />
                <Route path="/tracking" element={<LiveTrackingPage />} />
                <Route path="/scan" element={<ScannerPage />} />
                <Route path="/qc" element={<QcPage />} />
                <Route path="/performance" element={<PerformancePage />} /> {/* <-- 2. ADD THE NEW ROUTE */}
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;