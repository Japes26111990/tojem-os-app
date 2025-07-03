import React from 'react';

// --- UPDATED: Added a default value to the 'options' prop ---
const Dropdown = ({ label, name, value, onChange, options = [], placeholder, ...props }) => {
  const textColorClass = !value ? 'text-green-500' : 'text-white';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-1">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full p-3 bg-gray-700 border border-gray-600 rounded-lg ${textColorClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {/* This line is now safe because 'options' will always be an array */}
        {options.map(option => (
          <option key={option.id} value={option.id} className="text-white">
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
