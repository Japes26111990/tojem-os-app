// src/components/features/stock/StockTakeApp.jsx (Path Corrected & Index Fix)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import { getAllInventoryItems, findInventoryItemByItemCode, updateStockCount } from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Check, ClipboardList, RefreshCw, Search, X, QrCode, AlertTriangle, Weight, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import QrScannerModal from '../scanner/QrScannerModal';

// --- Sub-Components for the Stock Take App ---

const SessionManager = ({ onStart, onContinue, activeSession }) => (
    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto text-center">
        <ClipboardList size={48} className="mx-auto text-blue-400 mb-4" />
        <h3 className="text-2xl font-bold text-white">Stock Take</h3>
        <p className="text-gray-400 mb-8">Start a new session or continue a previous one.</p>
        {activeSession ? (
            <Button onClick={() => onContinue(activeSession)} className="w-full max-w-xs mx-auto py-3 text-lg">
                Continue Stock Take
            </Button>
        ) : (
            <Button onClick={onStart} className="w-full max-w-xs mx-auto py-3 text-lg">
                <RefreshCw size={20} className="mr-2"/>
                Start New Stock Take
            </Button>
        )}
    </div>
);

const CountingModal = ({ item, onClose, onUpdate }) => {
    const [countValue, setCountValue] = useState('');
    const [calculatedQty, setCalculatedQty] = useState(null);

    useEffect(() => {
        if (item.stockTakeMethod === 'weight' && !isNaN(parseFloat(countValue))) {
            const grossWeight = parseFloat(countValue);
            const tareWeight = parseFloat(item.tareWeight) || 0;
            const unitWeight = parseFloat(item.unitWeight) || 1;
            if (unitWeight > 0) {
                const netWeight = grossWeight - tareWeight;
                setCalculatedQty(Math.round(netWeight / unitWeight));
            }
        } else {
            setCalculatedQty(null);
        }
    }, [countValue, item]);

    const handleSubmit = () => {
        const finalCount = item.stockTakeMethod === 'weight' ? calculatedQty : parseInt(countValue, 10);
        if (isNaN(finalCount) || finalCount < 0) {
            return toast.error("Please enter a valid, non-negative count.");
        }
        onUpdate(finalCount);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <p className="text-sm text-gray-400">System predicts: {item.currentStock}</p>
                </div>
                <div className="p-6 space-y-4">
                    {item.stockTakeMethod === 'weight' ? (
                        <div>
                            <Input label="Enter Gross Weight (grams)" type="number" value={countValue} onChange={e => setCountValue(e.target.value)} autoFocus />
                            {calculatedQty !== null && (
                                <p className="text-center text-blue-400 mt-2">Calculated Quantity: <span className="font-bold text-lg">{calculatedQty}</span></p>
                            )}
                        </div>
                    ) : (
                        <Input label="Enter Physical Quantity" type="number" value={countValue} onChange={e => setCountValue(e.target.value)} autoFocus />
                    )}
                </div>
                <div className="p-4 flex justify-end gap-2 bg-gray-900/50">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Update Count</Button>
                </div>
            </div>
        </div>
    );
};

const VerificationScanner = ({ itemToVerify, onVerified, onClose }) => {
    const [isScannerOpen, setIsScannerOpen] = useState(true);

    const handleScanSuccess = (decodedText) => {
        if (decodedText === itemToVerify.itemCode) {
            onVerified();
        } else {
            toast.error("Incorrect item scanned. Please scan the correct QR code.");
        }
        setIsScannerOpen(false);
        onClose();
    };

    return (
        <>
            {isScannerOpen && (
                <QrScannerModal
                    onClose={onClose}
                    onScanSuccess={handleScanSuccess}
                />
            )}
        </>
    );
};


// --- Main StockTakeApp Component ---

const StockTakeApp = () => {
    const { user } = useAuth();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [activeTab, setActiveTab] = useState('remaining');
    const [searchTerm, setSearchTerm] = useState('');
    const [itemToCount, setItemToCount] = useState(null);
    const [itemToVerify, setItemToVerify] = useState(null);

    // Check for an active session on initial load
    useEffect(() => {
        const checkForActiveSession = async () => {
            const sessionsRef = collection(db, 'stockTakeSessions');
            // --- QUERY FIX: Removed orderBy to avoid needing a composite index ---
            const q = query(sessionsRef, where('status', '==', 'in-progress'), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const activeSessionDoc = snapshot.docs[0];
                setSession({ id: activeSessionDoc.id, ...activeSessionDoc.data() });
            }
            setLoading(false);
        };
        checkForActiveSession();
    }, []);

    // Fetch inventory when a session is active
    useEffect(() => {
        if (session) {
            const fetchInventory = async () => {
                setLoading(true);
                const items = await getAllInventoryItems();
                setInventory(items);
                setLoading(false);
            };
            fetchInventory();
        }
    }, [session]);

    const handleStartNewSession = async () => {
        setLoading(true);
        try {
            // Reset all items' session tracking field
            const allItems = await getAllInventoryItems();
            const batch = writeBatch(db);
            allItems.forEach(item => {
                const itemRef = doc(db, item.category.toLowerCase().replace(' ', '') + 's', item.id);
                batch.update(itemRef, { lastCountedInSessionId: null });
            });
            await batch.commit();

            // Create new session document
            const sessionsRef = collection(db, 'stockTakeSessions');
            const newSessionDoc = await addDoc(sessionsRef, {
                startTime: serverTimestamp(),
                startedBy: user.email,
                status: 'in-progress'
            });
            setSession({ id: newSessionDoc.id, status: 'in-progress' });
            toast.success("New stock take session started!");
        } catch (error) {
            toast.error("Failed to start new session.");
            console.error(error);
            setLoading(false);
        }
    };

    const handleItemSelect = (item, viaScan = false) => {
        if (viaScan) {
            setItemToCount(item);
        } else {
            setItemToVerify(item);
        }
    };

    const handleUpdateCount = async (newCount) => {
        if (!itemToCount) return;
        try {
            await updateStockCount(itemToCount.id, itemToCount.category.toLowerCase().replace(' ', '') + 's', newCount, session.id);
            // Optimistically update UI
            setInventory(prev => prev.map(item => 
                item.id === itemToCount.id ? { ...item, currentStock: newCount, lastCountedInSessionId: session.id } : item
            ));
            toast.success(`${itemToCount.name} count updated to ${newCount}.`);
        } catch (error) {
            toast.error("Failed to update stock count.");
            console.error(error);
        }
        setItemToCount(null);
    };

    const handleFinishSession = async () => {
        toast((t) => (
            <span>
                Finish this stock take session?
                <Button variant="primary" size="sm" className="ml-2" onClick={async () => {
                    toast.dismiss(t.id);
                    const sessionRef = doc(db, 'stockTakeSessions', session.id);
                    await updateDoc(sessionRef, { status: 'completed', endTime: serverTimestamp() });
                    setSession(null);
                    setInventory([]);
                    toast.success("Stock take session completed!");
                }}>
                    Confirm
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: '⚠️', duration: 6000 });
    };

    const { remainingItems, completedItems } = useMemo(() => {
        const filtered = inventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return {
            remainingItems: filtered.filter(item => item.lastCountedInSessionId !== session?.id),
            completedItems: filtered.filter(item => item.lastCountedInSessionId === session?.id),
        };
    }, [inventory, searchTerm, session]);

    const progress = inventory.length > 0 ? (completedItems.length / inventory.length) * 100 : 0;

    if (loading) return <p className="text-center text-gray-400">Loading Stock Take Module...</p>;

    if (!session) {
        return <SessionManager onStart={handleStartNewSession} onContinue={setSession} activeSession={session} />;
    }

    return (
        <div className="space-y-4">
            {/* Progress Bar and Finish Button */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Stock Take In Progress...</h3>
                    <Button variant="success" onClick={handleFinishSession}>Finish Stock Take</Button>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4">
                    <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-center text-sm text-gray-300">{completedItems.length} of {inventory.length} items counted ({progress.toFixed(0)}%)</p>
            </div>

            {/* Search and Tabs */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="relative mb-4">
                    <Input placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
                <div className="flex border-b border-gray-600">
                    <button onClick={() => setActiveTab('remaining')} className={`px-4 py-2 font-semibold ${activeTab === 'remaining' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Remaining ({remainingItems.length})</button>
                    <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 font-semibold ${activeTab === 'completed' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Completed ({completedItems.length})</button>
                </div>
            </div>

            {/* Item List */}
            <div className="space-y-2">
                {(activeTab === 'remaining' ? remainingItems : completedItems).map(item => (
                    <div key={item.id} onClick={() => handleItemSelect(item)} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-600">
                        <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-gray-400">System: {item.currentStock} | Code: {item.itemCode}</p>
                        </div>
                        {item.lastCountedInSessionId === session.id ? (
                            <Check size={20} className="text-green-500" />
                        ) : (
                             <div className="flex items-center gap-2">
                                {item.stockTakeMethod === 'weight' ? <Weight size={16} className="text-gray-400"/> : <Hash size={16} className="text-gray-400"/>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {itemToVerify && (
                <VerificationScanner 
                    itemToVerify={itemToVerify}
                    onClose={() => setItemToVerify(null)}
                    onVerified={() => {
                        setItemToCount(itemToVerify);
                        setItemToVerify(null);
                    }}
                />
            )}

            {itemToCount && (
                <CountingModal 
                    item={itemToCount}
                    onClose={() => setItemToCount(null)}
                    onUpdate={handleUpdateCount}
                />
            )}
        </div>
    );
};

export default StockTakeApp;
