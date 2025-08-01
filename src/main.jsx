import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DataProvider } from './contexts/DataContext.jsx'; // --- 1. IMPORT THE DATA PROVIDER ---
import './api/firebase.js';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      {/* --- 2. WRAP THE APP WITH THE DATA PROVIDER --- */}
      <DataProvider>
        <Toaster 
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            className: '',
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);