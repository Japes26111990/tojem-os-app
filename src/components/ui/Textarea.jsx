// src/components/ui/Textarea.jsx

import React from 'react';

const Textarea = ({ label, name, value, onChange, placeholder, rows = 3, className = '' }) => {
  // Define base styles separately
  const baseStyles = "w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        // Combine the base styles with any custom className
        className={`${baseStyles} ${className}`}
      />
    </div>
  );
};

export default Textarea;