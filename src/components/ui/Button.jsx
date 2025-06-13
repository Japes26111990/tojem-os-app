import React from 'react';

// Base styles for all buttons
const baseStyles = "flex items-center justify-center px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";

// Styles for different button variants
const variants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
  secondary: "bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500",
  danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
};

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', ...props }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      // Combine base styles, variant styles, and any custom classes passed in
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;