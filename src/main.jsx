import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './api/firebase.js';
import { Toaster } from 'react-hot-toast'; // --- 1. IMPORT Toaster

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      {/* --- 2. ADD Toaster component here --- */}
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
    </AuthProvider>
  </React.StrictMode>
);
