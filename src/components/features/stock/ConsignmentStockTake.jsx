// src/components/features/stock/ConsignmentStockTake.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getClientUsers, 
    listenToConsignmentStockForClient, 
    getProducts,
    getMakes,      // --- NEW ---
    getModels,     // --- NEW ---
    addConsignmentItem,
    updateConsignmentStockCounts 
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import Input from '../../ui/Input';
import { User, PackagePlus, Save, QrCode, Search, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import QrScannerModal from '../scanner/QrScannerModal';
import StockCountModal from './StockCountModal';

const ConsignmentStockTake = () => {
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [makes, setMakes] = useState([]); // --- NEW ---
    const [models, setModels] = useState([]); // --- NEW ---
    const [selectedClientId, setSelectedClientId] = useState('');
    const [consignmentStock, setConsignmentStock] = useState([]);
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for modals
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [itemToCount, setItemToCount] = useState(null);

    const [newItemSearchTerm, setNewItemSearchTerm] = useState('');
    const [filteredProductOptions, setFilteredProductOptions] = useState([]);
    const searchRef = useRef(null);
    const [newItem, setNewItem] = useState({
        productId: '',
        quantity: 0,
        reorderLevel: '',
        standardStockLevel: ''
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            // --- UPDATED: Fetch makes and models ---
            const [clientUsers, allProducts, allMakes, allModels] = await Promise.all([getClientUsers(), getProducts(), getMakes(), getModels()]);
            const formattedClients = clientUsers.map(c => ({ id: c.id, name: c.companyName || c.email }));
            setClients(formattedClients);
            setProducts(allProducts);
            setMakes(allMakes);
            setModels(allModels);
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
            const initialCounts = items.reduce((acc, item) => {
                acc[item.id] = item.quantity;
                return acc;
            }, {});
            setCounts(initialCounts);
        });
        return () => unsubscribe();
    }, [selectedClientId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setFilteredProductOptions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCountChange = (itemId, value) => {
        setCounts(prev => ({ ...prev, [itemId]: value }));
    };
    
    const handleScanSuccess = (scannedPartNumber) => {
        setIsScannerOpen(false);
        const foundItem = consignmentStock.find(item => item.partNumber === scannedPartNumber);
        if (foundItem) {
            const fullProductDetails = products.find(p => p.id === foundItem.productId);
            setItemToCount({ ...fullProductDetails, ...foundItem, systemCount: foundItem.quantity });
        } else {
            toast.error("Scanned item not found in this client's consignment stock.");
        }
    };
    
    const handleUpdateCountFromModal = (itemId, newCount) => {
        handleCountChange(itemId, newCount);
        toast.success("Count captured.");
        setItemToCount(null);
    };

    const handleReconcile = async () => {
        const updates = Object.entries(counts)
            .filter(([id, newCount]) => {
                const originalItem = consignmentStock.find(item => item.id === id);
                return originalItem && newCount !== originalItem.quantity;
            })
            .map(([id, newCount]) => ({ id, newCount: Number(newCount) || 0 }));

        if (updates.length === 0) return toast.error("No counts have been changed.");
        
        try {
            await updateConsignmentStockCounts(updates);
            toast.success("Consignment stock counts updated!");
        } catch (error) {
            toast.error("Failed to update stock levels.");
        }
    };
    
    const availableProducts = useMemo(() => {
        const consignedProductIds = new Set(consignmentStock.map(item => item.productId));
        return products.filter(p => !consignedProductIds.has(p.id));
    }, [products, consignmentStock]);

    useEffect(() => {
        if (newItemSearchTerm.length > 1) {
            const searchLower = newItemSearchTerm.toLowerCase();
            setFilteredProductOptions(
                availableProducts.filter(p => 
                    p.name.toLowerCase().includes(searchLower) ||
                    (p.partNumber && p.partNumber.toLowerCase().includes(searchLower))
                ).slice(0, 10)
            );
        } else {
            setFilteredProductOptions([]);
        }
    }, [newItemSearchTerm, availableProducts]);

    const filteredStock = useMemo(() => {
        if (!searchTerm) return consignmentStock;
        return consignmentStock.filter(item => 
            item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.partNumber && item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [consignmentStock, searchTerm]);
    
    const handleSelectProductFromSearch = (product) => {
        setNewItem(prev => ({ 
            ...prev, 
            productId: product.id,
            reorderLevel: '1',
            standardStockLevel: '2'
        }));
        setNewItemSearchTerm(product.name);
        setFilteredProductOptions([]);
    };

    // --- UPDATED: Includes duplicate check and passes make/model ---
    const handleAddNewItem = async () => {
        const productToAdd = products.find(p => p.id === newItem.productId);
        if (!productToAdd || !selectedClientId) {
            return toast.error("Please select a product from the search results.");
        }
        if (Number(newItem.reorderLevel) <= 0 || Number(newItem.standardStockLevel) <= 0) {
            return toast.error("Reorder and Standard levels must be greater than 0.");
        }

        // --- NEW: Duplicate check ---
        const isDuplicate = consignmentStock.some(item => item.productId === productToAdd.id);
        if (isDuplicate) {
            return toast.error("This product is already in the client's consignment stock.");
        }

        const client = clients.find(c => c.id === selectedClientId);
        const itemData = {
            clientId: selectedClientId,
            clientName: client.name,
            productId: productToAdd.id,
            productName: productToAdd.name,
            partNumber: productToAdd.partNumber,
            sellingPrice: productToAdd.sellingPrice,
            quantity: Number(newItem.quantity) || 0,
            reorderLevel: Number(newItem.reorderLevel),
            standardStockLevel: Number(newItem.standardStockLevel),
            make: productToAdd.make || '',
            model: productToAdd.model || '',
        };
        
        try {
            await addConsignmentItem(itemData);
            toast.success(`${productToAdd.name} added to ${client.name}'s stock.`);
            setNewItem({ productId: '', quantity: 0, reorderLevel: '', standardStockLevel: '' });
            setNewItemSearchTerm('');
        } catch (error) {
            toast.error("Failed to add item.");
            console.error(error);
        }
    };
    
    // --- NEW: Memoized maps and grouped stock data for display ---
    const makeMap = useMemo(() => new Map(makes.map(m => [m.id, m.name])), [makes]);
    const modelMap = useMemo(() => new Map(models.map(m => [m.id, m.name])), [models]);

    const groupedStock = useMemo(() => {
        const grouped = filteredStock.reduce((acc, item) => {
            const makeName = makeMap.get(item.make) || 'Uncategorized';
            const modelName = modelMap.get(item.model) || 'General';

            if (!acc[makeName]) {
                acc[makeName] = {};
            }
            if (!acc[makeName][modelName]) {
                acc[makeName][modelName] = [];
            }
            acc[makeName][modelName].push(item);
            return acc;
        }, {});

        return Object.entries(grouped).map(([makeName, models]) => ({
            makeName,
            models: Object.entries(models).map(([modelName, items]) => ({
                modelName,
                items
            }))
        }));
    }, [filteredStock, makeMap, modelMap]);


    if (loading && clients.length === 0) return <p className="text-gray-400">Loading clients...</p>;

    return (
        <>
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
                             <h3 className="text-xl font-bold text-white mb-4">Add New Item to Consignment</h3>
                             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-2 relative" ref={searchRef}>
                                     <Input 
                                        label="Search for Product" 
                                        value={newItemSearchTerm} 
                                        onChange={(e) => {
                                            setNewItemSearchTerm(e.target.value);
                                            setNewItem(prev => ({...prev, productId: ''}));
                                        }} 
                                        placeholder="Type name or part no..."
                                    />
                                    {filteredProductOptions.length > 0 && (
                                        <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                                            {filteredProductOptions.map(p => (
                                                <li 
                                                    key={p.id}
                                                    onClick={() => handleSelectProductFromSearch(p)}
                                                    className="p-3 hover:bg-blue-600 cursor-pointer text-sm"
                                                >
                                                    <p className="font-semibold text-white">{p.name}</p>
                                                    <p className="text-xs text-gray-400">P/N: {p.partNumber}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <Input label="Initial Qty" type="number" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}/>
                                <Input label="Re-order Level" type="number" value={newItem.reorderLevel} onChange={(e) => setNewItem({...newItem, reorderLevel: e.target.value})}/>
                                <Input label="Standard Stock Level" type="number" value={newItem.standardStockLevel} onChange={(e) => setNewItem({...newItem, standardStockLevel: e.target.value})}/>
                             </div>
                             <Button onClick={handleAddNewItem} variant="primary" className="mt-4" disabled={!newItem.productId}>
                                <PackagePlus size={16} className="mr-2"/>Add Item to Client Stock
                             </Button>
                        </div>


                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                                    <h3 className="text-xl font-bold text-white">Stock Count List</h3>
                                    <div className="flex items-center gap-2">
                                        <Button onClick={() => setIsScannerOpen(true)} variant="secondary"><QrCode size={16} className="mr-2"/>Scan to Count</Button>
                                        <div className="relative">
                                            <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        </div>
                                        <Button onClick={handleReconcile} variant="primary"><Save size={16} className="mr-2"/>Save Counts</Button>
                                    </div>
                                 </div>
                                {/* --- UPDATED: Render the new grouped list --- */}
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {groupedStock.length > 0 ? groupedStock.map(makeGroup => (
                                        <div key={makeGroup.makeName}>
                                            <h4 className="font-bold text-lg text-blue-400 border-b border-gray-700 pb-1 mb-2">{makeGroup.makeName}</h4>
                                            {makeGroup.models.map(modelGroup => (
                                                <div key={modelGroup.modelName} className="mb-3">
                                                    <h5 className="font-semibold text-gray-300 pl-2">{modelGroup.modelName}</h5>
                                                    {modelGroup.items.map(item => (
                                                         <div key={item.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center bg-gray-900/50 p-3 rounded-lg mt-1">
                                                            <div className="md:col-span-2">
                                                                <p className="font-semibold text-white">{item.productName}</p>
                                                                <p className="text-xs text-gray-400">P/N: {item.partNumber}</p>
                                                            </div>
                                                            <p className="text-sm text-center font-mono text-gray-400">System: {item.quantity}</p>
                                                            <Input 
                                                                type="number" 
                                                                value={counts[item.id] || ''}
                                                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                                placeholder="Enter count..."
                                                                className="text-center"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )) : <p className="text-center text-gray-500 py-4">No consignment stock found for this client.</p>}
                                </div>
                        </div>
                    </>
                )}
            </div>

            {isScannerOpen && <QrScannerModal onClose={() => setIsScannerOpen(false)} onScanSuccess={handleScanSuccess} />}
            {itemToCount && <StockCountModal item={itemToCount} onClose={() => setItemToCount(null)} onUpdateCount={handleUpdateCountFromModal} />}
        </>
    );
};

export default ConsignmentStockTake;