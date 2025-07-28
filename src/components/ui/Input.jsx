import React from 'react';

const Input = React.forwardRef(({ label, name, type = "text", value, onChange, placeholder, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        ref={ref} // Forward the ref to the input element
        {...props}
      />
    </div>
  );
});

export default Input;
