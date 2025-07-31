// src/components/ui/SearchInput.jsx

import React from 'react';
import Input from './Input';
import { Search } from 'lucide-react';

const SearchInput = (props) => {
  return (
    <div className="relative w-full">
      <Input
        {...props}
        className={`pl-10 ${props.className || ''}`}
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
    </div>
  );
};

export default SearchInput;