// src/components/features/settings/FinancialSettings.jsx (UPDATED with Edit Functionality)
import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { PlusCircle, Trash2, Edit } from 'lucide-react';

const FinancialSettings = () => {
    const [historicalData, setHistoricalData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null); // State to track which item is being edited
    const [newData, setNewData] = useState({ year: '', month: '', totalSales: '', totalCOGS: '' });

    useEffect(() => {
        const historicalSalesCol = collection(db, 'historicalSales');
        const unsubscribe = onSnapshot(historicalSalesCol, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });
            setHistoricalData(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveData = async (e) => {
        e.preventDefault();
        const { year, month, totalSales, totalCOGS } = newData;

        if (!year || !month || !totalSales || !totalCOGS || month < 1 || month > 12) {
            alert("Please enter valid data for all fields (Month must be 1-12).");
            return;
        }

        // If editing, use the existing ID. If adding, create a new one.
        const docId = editingId || `${year}-${String(month).padStart(2, '0')}`;
        const sales = parseFloat(totalSales);
        const cogs = parseFloat(totalCOGS);

        const dataToSave = {
            year: parseInt(year, 10),
            month: parseInt(month, 10),
            totalSales: sales,
            totalCOGS: cogs,
            grossProfit: sales - cogs,
        };

        try {
            const docRef = doc(db, 'historicalSales', docId);
            await setDoc(docRef, dataToSave, { merge: true });
            alert(`Financial data for ${docId} has been saved.`);
            handleCancelEdit(); // Reset form and editing state
        } catch (error) {
            console.error("Error saving historical data:", error);
            alert("Failed to save data.");
        }
    };
    
    // Function to handle clicking the "Edit" button
    const handleEditClick = (data) => {
        setEditingId(data.id);
        setNewData({
            year: data.year,
            month: data.month,
            totalSales: data.totalSales,
            totalCOGS: data.totalCOGS,
        });
    };

    // Function to cancel the edit
    const handleCancelEdit = () => {
        setEditingId(null);
        setNewData({ year: '', month: '', totalSales: '', totalCOGS: '' });
    };

    const handleDelete = async (docId) => {
        if (window.confirm(`Are you sure you want to delete the financial data for ${docId}?`)) {
            try {
                await deleteDoc(doc(db, 'historicalSales', docId));
                alert('Data deleted successfully.');
            } catch (error) {
                console.error("Error deleting historical data:", error);
                alert("Failed to delete data.");
            }
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Historical Financial Data</h3>
            <p className="text-sm text-gray-400 mb-6">
                Enter your actual historical Sales and Cost of Goods Sold (COGS) for each month. This provides the most accurate data for all financial planning tools.
            </p>
            
            <form onSubmit={handleSaveData} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 p-4 bg-gray-900/50 rounded-lg">
                <Input label="Year" name="year" type="number" value={newData.year} onChange={handleInputChange} placeholder="e.g., 2023" disabled={!!editingId} />
                <Input label="Month" name="month" type="number" value={newData.month} onChange={handleInputChange} placeholder="e.g., 1 for Jan" disabled={!!editingId} />
                <Input label="Total Sales (R)" name="totalSales" type="number" value={newData.totalSales} onChange={handleInputChange} placeholder="e.g., 300000" />
                <Input label="Total COGS (R)" name="totalCOGS" type="number" value={newData.totalCOGS} onChange={handleInputChange} placeholder="e.g., 90000" />
                <div className="flex gap-2">
                    {editingId && <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
                    <Button type="submit" variant="primary" className="flex-grow">
                        {editingId ? 'Update' : <><PlusCircle size={16} className="mr-2"/> Save</>}
                    </Button>
                </div>
            </form>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {loading ? <p>Loading data...</p> : (
                    historicalData.map(data => (
                        <div key={data.id} className="grid grid-cols-5 gap-4 items-center bg-gray-700 p-3 rounded-lg text-sm">
                            <p className="font-bold text-white">{data.id}</p>
                            <p className="text-gray-300">Sales: <span className="font-mono">R{data.totalSales.toFixed(2)}</span></p>
                            <p className="text-gray-300">COGS: <span className="font-mono">R{data.totalCOGS.toFixed(2)}</span></p>
                            <div className="col-span-2 flex justify-end gap-2">
                                <Button onClick={() => handleEditClick(data)} variant="secondary" size="sm" className="p-2">
                                    <Edit size={16}/>
                                </Button>
                                <Button onClick={() => handleDelete(data.id)} variant="danger" size="sm" className="p-2">
                                    <Trash2 size={16}/>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FinancialSettings;
