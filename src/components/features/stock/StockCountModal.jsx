// src/components/features/stock/StockCountModal.jsx

import React, { useState, useEffect } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const StockCountModal = ({ item, onClose, onUpdateCount }) => {
    const [count, setCount] = useState('');
    const inputRef = React.useRef(null);

    // Focus the input field when the modal opens
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleSubmit = () => {
        const newCount = parseInt(count, 10);
        if (isNaN(newCount) || newCount < 0) {
            return toast.error("Please enter a valid, non-negative quantity.");
        }
        onUpdateCount(item.id, newCount);
        onClose();
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <p className="text-sm text-gray-400">P/N: {item.partNumber}</p>
                    <p className="text-sm text-gray-500">System predicts: {item.systemCount}</p>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-6 space-y-4">
                    {/* UPDATED: Ensure Input component is used */}
                    <Input 
                        ref={inputRef}
                        label="Enter Physical Quantity" 
                        type="number" 
                        value={count} 
                        onChange={e => setCount(e.target.value)}
                        placeholder="Enter count..."
                    />
                </form>
                <div className="p-4 flex justify-end gap-2 bg-gray-900/50">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>
                        <CheckCircle size={16} className="mr-2" />
                        Update Count
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default StockCountModal;
