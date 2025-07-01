// src/components/features/scanner/StockTakeScanner.jsx (Upgraded with Camera Scanning)

import React, { useState, useEffect, useRef } from 'react';
import { findInventoryItemByItemCode, updateStockByWeight } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { QrCode, Weight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import QrScannerModal from './QrScannerModal'; // --- IMPORT THE SCANNER MODAL ---

const StockTakeScanner = () => {
    const [scanInput, setScanInput] = useState('');
    const [scannedItem, setScannedItem] = useState(null);
    const [weightInput, setWeightInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState('scan_item'); // Stages: scan_item, enter_weight, confirm_scan
    const [isScannerOpen, setIsScannerOpen] = useState(false); // --- STATE FOR MODAL ---
    const weightInputRef = useRef(null);
    const scanInputRef = useRef(null);

    useEffect(() => {
        if (stage === 'enter_weight' && weightInputRef.current) {
            weightInputRef.current.focus();
        } else if (stage !== 'enter_weight' && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [stage]);

    const resetState = () => {
        setScanInput('');
        setScannedItem(null);
        setWeightInput('');
        setLoading(false);
        setStage('scan_item');
    };

    const handleInitialScan = async (e) => {
        e.preventDefault();
        if (!scanInput.trim()) return;
        setLoading(true);

        try {
            const item = await findInventoryItemByItemCode(scanInput.trim());
            if (item.stockTakeMethod !== 'weight') {
                throw new Error(`Item "${item.name}" is not configured for weight-based stock-taking.`);
            }
            setScannedItem(item);
            setStage('enter_weight');
            toast.success(`Found: ${item.name}`);
        } catch (error) {
            toast.error(error.message);
            resetState();
        } finally {
            setLoading(false);
        }
    };

    const handleWeightSubmit = (e) => {
        e.preventDefault();
        if (isNaN(parseFloat(weightInput))) {
            return toast.error("Please enter a valid weight.");
        }
        setStage('confirm_scan');
        setScanInput('');
        toast('Please re-scan the item QR code to confirm.', { icon: 'ℹ️' });
    };

    const handleConfirmationScan = async (e) => {
        e.preventDefault();
        if (scanInput.trim() !== scannedItem.itemCode) {
            toast.error("Confirmation scan does not match the original item. Please try again.");
            return;
        }
        setLoading(true);
        try {
            const { newQuantity } = await updateStockByWeight(scannedItem.id, scannedItem.category, weightInput);
            toast.success(`Stock for "${scannedItem.name}" updated to ${newQuantity} units.`);
            resetState();
        } catch (error) {
            toast.error(error.message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLER FOR SUCCESSFUL SCAN ---
    const handleScanSuccess = (decodedText) => {
        setScanInput(decodedText);
        setIsScannerOpen(false);
        // Automatically submit the form after a successful scan
        // We add a small delay to allow the state to update before submitting
        setTimeout(() => {
            if (scanInputRef.current) {
                scanInputRef.current.form.requestSubmit();
            }
        }, 100);
    };

    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto">
                {stage === 'scan_item' && (
                    <form onSubmit={handleInitialScan} className="space-y-4">
                        <h3 className="text-xl font-bold text-white text-center">Scan Item QR Code</h3>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <Input
                                    ref={scanInputRef}
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    placeholder="Scan item to begin..."
                                    autoFocus
                                    className="pl-10"
                                />
                                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            </div>
                            <Button type="button" variant="secondary" onClick={() => setIsScannerOpen(true)}>
                                Scan
                            </Button>
                        </div>
                        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                            {loading ? 'Searching...' : 'Find Item'}
                        </Button>
                    </form>
                )}

                {stage === 'enter_weight' && scannedItem && (
                    <form onSubmit={handleWeightSubmit} className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-white text-center">Enter Weight for:</h3>
                        <p className="text-2xl font-semibold text-blue-400 text-center">{scannedItem.name}</p>
                        <div className="flex items-center gap-4">
                            <Weight size={40} className="text-gray-400"/>
                            <Input
                                ref={weightInputRef}
                                type="number"
                                step="any"
                                value={weightInput}
                                onChange={(e) => setWeightInput(e.target.value)}
                                placeholder="Enter gross weight (e.g., 1500.5)"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-4">
                            <Button type="button" variant="secondary" onClick={resetState} className="w-full">
                                <X size={18} className="mr-2"/>Cancel
                            </Button>
                            <Button type="submit" variant="primary" className="w-full">
                                <Check size={18} className="mr-2"/>Confirm Weight
                            </Button>
                        </div>
                    </form>
                )}

                {stage === 'confirm_scan' && scannedItem && (
                     <form onSubmit={handleConfirmationScan} className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-white text-center">Confirm Update for:</h3>
                        <p className="text-2xl font-semibold text-blue-400 text-center">{scannedItem.name}</p>
                        <p className="text-lg text-white text-center">Weight Entered: <span className="font-bold">{weightInput}g</span></p>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <Input
                                    ref={scanInputRef}
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    placeholder="Re-scan QR code to save..."
                                    autoFocus
                                    className="pl-10"
                                />
                                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" size={20} />
                            </div>
                            <Button type="button" variant="secondary" onClick={() => setIsScannerOpen(true)}>
                                Scan
                            </Button>
                        </div>
                        <div className="flex gap-4">
                            <Button type="button" variant="secondary" onClick={resetState} className="w-full">
                                <X size={18} className="mr-2"/>Cancel
                            </Button>
                            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Stock Count'}
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
