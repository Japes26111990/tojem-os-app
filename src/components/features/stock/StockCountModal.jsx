// src/components/features/stock/StockCountModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, CheckCircle, Hash, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

const StockCountModal = ({ item, onClose, onUpdateCount }) => {
    const [inputValue, setInputValue] = useState('');
    const [calculatedQty, setCalculatedQty] = useState(null);
    const inputRef = useRef(null);

    // Focus the input field when the modal opens
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Live calculation for weight-based items
    useEffect(() => {
        if (item.stockTakeMethod === 'weight' && !isNaN(parseFloat(inputValue))) {
            const grossWeight = parseFloat(inputValue);
            const tareWeight = parseFloat(item.tareWeight) || 0;
            const unitWeight = parseFloat(item.unitWeight) || 1;
            if (unitWeight > 0) {
                const netWeight = grossWeight - tareWeight;
                const finalQty = Math.round(netWeight / unitWeight);
                // Ensure calculated quantity is not negative
                setCalculatedQty(finalQty < 0 ? 0 : finalQty);
            }
        } else {
            setCalculatedQty(null);
        }
    }, [inputValue, item]);

    const handleSubmit = () => {
        const finalCount = item.stockTakeMethod === 'weight' ? calculatedQty : parseInt(inputValue, 10);
        if (finalCount === null || isNaN(finalCount) || finalCount < 0) {
            return toast.error("Please enter a valid, non-negative value.");
        }
        onUpdateCount(item.id, finalCount);
        onClose();
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <p className="text-sm text-gray-400">P/N: {item.partNumber || item.itemCode}</p>
                    <p className="text-sm text-gray-500">System predicts: {item.systemCount || item.currentStock}</p>
                </div>
                <div className="p-6 space-y-4">
                    <img
                        src={item.photoUrl || `https://placehold.co/400x300/1f2937/9ca3af?text=No+Image`}
                        alt={item.name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                    <Input 
                        ref={inputRef}
                        label={item.stockTakeMethod === 'weight' ? 'Enter Gross Weight (grams)' : 'Enter Physical Quantity'}
                        type="number" 
                        step="any"
                        value={inputValue} 
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={item.stockTakeMethod === 'weight' ? 'e.g., 1500.5' : 'e.g., 250'}
                    />
                    {calculatedQty !== null && (
                        <div className="text-center bg-gray-900/50 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">Calculated Quantity</p>
                            <p className="text-2xl font-bold text-green-400">{calculatedQty}</p>
                        </div>
                    )}
                </div>
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
