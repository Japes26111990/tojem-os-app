// src/components/features/scanner/StockTakeScanner.jsx

import React, { useState, useEffect, useRef } from 'react';
import { findInventoryItemByItemCode, updateStockByWeight, updateStockCount } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { QrCode, Weight, Check, X, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import QrScannerModal from './QrScannerModal';

const StockTakeScanner = () => {
    const [scanInput, setScanInput] = useState('');
    const [scannedItem, setScannedItem] = useState(null);
    const [inputValue, setInputValue] = useState(''); // For weight or quantity
    const [loading, setLoading] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [calculatedQty, setCalculatedQty] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (scannedItem && inputRef.current) {
            inputRef.current.focus();
        }
    }, [scannedItem]);

    // Live calculation for weight-based items
    useEffect(() => {
        if (scannedItem?.stockTakeMethod === 'weight' && !isNaN(parseFloat(inputValue))) {
            const grossWeight = parseFloat(inputValue);
            const tareWeight = parseFloat(scannedItem.tareWeight) || 0;
            const unitWeight = parseFloat(scannedItem.unitWeight) || 1;
            if (unitWeight > 0) {
                const netWeight = grossWeight - tareWeight;
                const finalQty = Math.round(netWeight / unitWeight);
                setCalculatedQty(finalQty < 0 ? 0 : finalQty);
            }
        } else {
            setCalculatedQty(null);
        }
    }, [inputValue, scannedItem]);

    const resetState = () => {
        setScanInput('');
        setScannedItem(null);
        setInputValue('');
        setCalculatedQty(null);
        setLoading(false);
    };

    const handleFindItem = async (code) => {
        if (!code.trim()) return;
        setLoading(true);
        try {
            const item = await findInventoryItemByItemCode(code.trim());
            setScannedItem(item);
            toast.success(`Found: ${item.name}`);
        } catch (error) {
            toast.error(error.message);
            resetState();
        } finally {
            setLoading(false);
        }
    };

    const handleScanSuccess = (decodedText) => {
        setIsScannerOpen(false);
        setScanInput(decodedText);
        handleFindItem(decodedText);
    };

    const handleSubmitCount = async (e) => {
        e.preventDefault();
        if (!scannedItem) return;

        setLoading(true);
        try {
            if (scannedItem.stockTakeMethod === 'weight') {
                if (calculatedQty === null || calculatedQty < 0) {
                    throw new Error("Invalid weight or calculated quantity.");
                }
                const { newQuantity } = await updateStockByWeight(scannedItem.id, inputValue);
                toast.success(`Stock for "${scannedItem.name}" updated to ${newQuantity} units.`);
            } else {
                const newCount = parseInt(inputValue, 10);
                if (isNaN(newCount) || newCount < 0) {
                    throw new Error("Please enter a valid, non-negative quantity.");
                }
                const sessionId = `MANUAL_SCAN-${Date.now()}`;
                await updateStockCount(scannedItem.id, scannedItem.category, newCount, sessionId);
                toast.success(`Stock for "${scannedItem.name}" updated to ${newCount} units.`);
            }
            resetState();
        } catch (error) {
            toast.error(`Update failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto">
                {!scannedItem ? (
                    <div className="space-y-4 text-center">
                        <h3 className="text-xl font-bold text-white">Scan Item to Begin</h3>
                        <p className="text-gray-400">Scan the QR code on the item bin or manually enter the item code below.</p>
                        <Button
                            variant="primary"
                            className="w-full max-w-xs mx-auto py-3 text-lg"
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <QrCode size={24} className="mr-2"/>
                            Scan QR Code
                        </Button>
                        <form onSubmit={(e) => { e.preventDefault(); handleFindItem(scanInput); }} className="flex items-center gap-2 pt-4">
                            <Input
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                placeholder="Or type item code..."
                                className="text-center"
                            />
                            <Button type="submit" disabled={loading}>{loading ? 'Searching...' : 'Find'}</Button>
                        </form>
                    </div>
                ) : (
                    <form onSubmit={handleSubmitCount} className="space-y-4 animate-fade-in">
                        <h3 className="text-2xl font-semibold text-blue-400 text-center">{scannedItem.name}</h3>
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                            {scannedItem.stockTakeMethod === 'weight' ? <Weight size={16}/> : <Hash size={16}/>}
                            <span>Method: {scannedItem.stockTakeMethod}</span>
                        </div>
                        <p className="text-center text-gray-500">System predicts: {scannedItem.currentStock || 0} {scannedItem.unit || ''}</p>
                        
                        <Input
                            ref={inputRef}
                            type="number"
                            step="any"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            label={scannedItem.stockTakeMethod === 'weight' ? "Enter Gross Weight (grams)" : "Enter Physical Quantity"}
                            placeholder={scannedItem.stockTakeMethod === 'weight' ? "e.g., 1500.5" : "e.g., 250"}
                            autoFocus
                        />

                        {calculatedQty !== null && (
                            <p className="text-center text-green-400 text-lg">
                                Calculated Quantity: <span className="font-bold">{calculatedQty}</span>
                            </p>
                        )}
                        
                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="secondary" onClick={resetState} className="w-full">
                                <X size={18} className="mr-2"/>Cancel
                            </Button>
                            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                                <Check size={18} className="mr-2"/>{loading ? 'Saving...' : 'Save Count'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {isScannerOpen && (
                <QrScannerModal
                    onClose={() => setIsScannerOpen(false)}
                    onScanSuccess={handleScanSuccess}
                />
            )}
        </>
    );
};

export default StockTakeScanner;