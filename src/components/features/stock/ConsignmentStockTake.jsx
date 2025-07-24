import React, { useState, useEffect, useMemo } from 'react';
import { 
    getClientUsers, 
    listenToConsignmentStockForClient, 
    getProducts,
    addConsignmentItem,
    updateConsignmentStockCounts 
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import Input from '../../ui/Input';
import { User, PackagePlus, Save, ClipboardList, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ConsignmentStockTake = () => {
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [consignmentStock, setConsignmentStock] = useState([]);
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    
    // State for adding a new item
    const [newItemProductId, setNewItemProductId] = useState('');
    const [newItemShelf, setNewItemShelf] = useState('');
    const [newItemInitialCount, setNewItemInitialCount] = useState(0);

    useEffect(() => {
        const fetchInitialData = async () => {
            const [clientUsers, allProducts] = await Promise.all([getClientUsers(), getProducts()]);
            // Format clients for the dropdown
            const formattedClients = clientUsers.map(c => ({ id: c.id, name: c.companyName || c.email }));
            setClients(formattedClients);
            setProducts(allProducts);
            setLoading(false);
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!selectedClientId) {
            setConsignmentStock([]);
            return;
        }
        const unsubscribe = listenToConsignmentStockForClient(selectedClientId, (items) => {
            setConsignmentStock(items);
            // Initialize counts state from fetched data
            const initialCounts = items.reduce((acc, item) => {
                acc[item.id] = item.quantity;
                return acc;
            }, {});
            setCounts(initialCounts);
        });
        return () => unsubscribe();
    }, [selectedClientId]);

    const handleCountChange = (itemId, value) => {
        setCounts(prev => ({ ...prev, [itemId]: value }));
    };

    const handleAddNewItem = async () => {
        if (!newItemProductId || !selectedClientId) {
            return toast.error("Please select a product to add.");
        }

        const product = products.find(p => p.id === newItemProductId);
        if (!product) return toast.error("Selected product not found.");
        
        const client = clients.find(c => c.id === selectedClientId);

        const newItemData = {
            clientId: selectedClientId,
            clientName: client.name,
            productId: product.id,
            productName: product.name,
            partNumber: product.partNumber || 'N/A',
            shelfNumber: newItemShelf || null,
            quantity: Number(newItemInitialCount) || 0,
        };

        try {
            await addConsignmentItem(newItemData);
            toast.success(`${product.name} added to ${client.name}'s consignment stock.`);
            setNewItemProductId('');
            setNewItemShelf('');
            setNewItemInitialCount(0);
        } catch (error) {
            console.error("Error adding consignment item:", error);
            toast.error("Failed to add new item.");
        }
    };
    
    const handleReconcile = async () => {
        const updates = Object.entries(counts).map(([id, newCount]) => ({
            id,
            newCount: Number(newCount) || 0,
        }));

        if (updates.length === 0) return toast.error("No counts have been changed.");
        
        try {
            await updateConsignmentStockCounts(updates);
            toast.success("Consignment stock counts have been updated successfully!");
        } catch (error) {
            console.error("Error reconciling stock:", error);
            toast.error("Failed to update stock levels.");
        }
    };

    // Filter products that are not already in this client's consignment stock
    const availableProducts = useMemo(() => {
        const consignedProductIds = new Set(consignmentStock.map(item => item.productId));
        return products.filter(p => !consignedProductIds.has(p.id));
    }, [products, consignmentStock]);


    if (loading) return <p className="text-gray-400">Loading clients...</p>;

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-lg">
                <Dropdown
                    label="Select a Client to Perform Stock Take"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    options={clients}
                    placeholder="Choose a client..."
                />
            </div>

            {selectedClientId && (
                <>
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Add New Product to Consignment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2">
                                <Dropdown label="Product" options={availableProducts} value={newItemProductId} onChange={e => setNewItemProductId(e.target.value)} placeholder="Select product to add..." />
                            </div>
                            <Input label="Shelf #" value={newItemShelf} onChange={e => setNewItemShelf(e.target.value)} placeholder="Optional"/>
                            <Input label="Initial Count" type="number" value={newItemInitialCount} onChange={e => setNewItemInitialCount(e.target.value)} />
                        </div>
                         <Button onClick={handleAddNewItem} variant="secondary" className="mt-4"><PackagePlus size={16} className="mr-2"/>Add to List</Button>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Stock Count List</h3>
                            <Button onClick={handleReconcile} variant="primary"><Save size={16} className="mr-2"/>Save All Counts</Button>
                         </div>
                        <div className="space-y-3">
                            {consignmentStock.map(item => (
                                <div key={item.id} className="grid grid-cols-4 gap-4 items-center bg-gray-900/50 p-3 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-white">{item.productName}</p>
                                        <p className="text-xs text-gray-400">P/N: {item.partNumber}</p>
                                    </div>
                                    <p className="text-sm text-gray-300">Shelf: {item.shelfNumber || 'N/A'}</p>
                                    <p className="text-sm text-center font-mono text-gray-400">System: {item.quantity}</p>
                                    <Input 
                                        type="number" 
                                        value={counts[item.id] || ''}
                                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                                        placeholder="Enter count..."
                                    />
                                </div>
                            ))}
                            {consignmentStock.length === 0 && <p className="text-center text-gray-500 py-4">No consignment stock found for this client.</p>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ConsignmentStockTake;