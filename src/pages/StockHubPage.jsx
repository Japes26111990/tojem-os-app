// src/pages/StockHubPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems, getClientUsers, listenToConsignmentStockForClient } from '../api/firestore';
import { Package, Factory, Truck, DollarSign, Search, User } from 'lucide-react';
import Input from '../components/ui/Input';

// KPI Card for displaying stock values
const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

// Component for the main inventory valuation and list
const InventoryValuationDashboard = ({ items, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('manufactured');

    const { manufactured, rawMaterials, manufacturedValue, rawMaterialsValue } = useMemo(() => {
        const manufacturedItems = items.filter(item => item.category === 'Product');
        const rawItems = items.filter(item => item.category !== 'Product');

        const manufacturedVal = manufacturedItems.reduce((sum, item) => sum + (item.currentStock || 0) * (item.sellingPrice || 0), 0);
        const rawMaterialsVal = rawItems.reduce((sum, item) => sum + (item.currentStock || 0) * (item.price || 0), 0);

        return {
            manufactured: manufacturedItems,
            rawMaterials: rawItems,
            manufacturedValue: manufacturedVal,
            rawMaterialsValue: rawMaterialsVal
        };
    }, [items]);

    const displayedItems = useMemo(() => {
        const itemsToDisplay = activeTab === 'manufactured' ? manufactured : rawMaterials;
        if (!searchTerm) return itemsToDisplay;
        return itemsToDisplay.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [activeTab, manufactured, rawMaterials, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KpiCard 
                    icon={<Factory size={24} />}
                    title="Value of Manufactured Goods in Stock"
                    value={`R ${manufacturedValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                    color="bg-teal-500/20 text-teal-400"
                />
                <KpiCard 
                    icon={<Package size={24} />}
                    title="Value of Raw Materials & Consumables"
                    value={`R ${rawMaterialsValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                    color="bg-blue-500/20 text-blue-400"
                />
            </div>

            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex border-b border-gray-600">
                        <button onClick={() => setActiveTab('manufactured')} className={`px-4 py-2 font-semibold ${activeTab === 'manufactured' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Manufactured Goods ({manufactured.length})</button>
                        <button onClick={() => setActiveTab('rawMaterials')} className={`px-4 py-2 font-semibold ${activeTab === 'rawMaterials' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Raw Materials ({rawMaterials.length})</button>
                    </div>
                    <div className="relative w-1/3">
                        <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-2">Item Name</th>
                                <th className="p-2">Item Code</th>
                                <th className="p-2 text-center">In Stock</th>
                                <th className="p-2 text-right">Unit Price</th>
                                <th className="p-2 text-right">Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-4">Loading...</td></tr>
                            ) : displayedItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-700">
                                    <td className="p-2 text-white font-medium">{item.name}</td>
                                    <td className="p-2">{item.itemCode || 'N/A'}</td>
                                    <td className="p-2 text-center">{item.currentStock}</td>
                                    <td className="p-2 text-right font-mono">R {(activeTab === 'manufactured' ? item.sellingPrice : item.price || 0).toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono font-semibold text-green-400">R {((item.currentStock || 0) * (activeTab === 'manufactured' ? item.sellingPrice : item.price || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Component for the consignment stock report
const ConsignmentReport = () => {
    const [clients, setClients] = useState([]);
    const [consignmentStock, setConsignmentStock] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const clientUsers = await getClientUsers();
            const formattedClients = clientUsers.map(c => ({ id: c.id, name: c.companyName || c.email }));
            setClients(formattedClients);
            
            // Fetch all consignment stock at once
            const allStock = [];
            const unsubscribers = formattedClients.map(client => {
                return listenToConsignmentStockForClient(client.id, (items) => {
                    // This is a bit tricky with live updates, but for a report it's okay.
                    // A more robust solution might query all at once, not listen.
                    const existingClientIndex = allStock.findIndex(s => s.clientId === client.id);
                    if (existingClientIndex > -1) {
                        allStock[existingClientIndex].items = items;
                    } else {
                        allStock.push({ clientId: client.id, clientName: client.name, items });
                    }
                    // A simple way to trigger a re-render
                    setConsignmentStock([...allStock]);
                });
            });
            setLoading(false);
            return () => unsubscribers.forEach(unsub => unsub());
        };
        const unsubPromise = fetchData();
        return () => { unsubPromise.then(cleanup => cleanup && cleanup()); };
    }, []);

    const totalConsignmentValue = useMemo(() => {
        // This assumes price is stored on the consignment item, which might need adjustment
        // For now, we'll assume a placeholder price or fetch it.
        return consignmentStock.flat().reduce((sum, clientData) => {
            return sum + clientData.items.reduce((clientSum, item) => {
                // We need a price source. Let's assume it's on the item for now.
                return clientSum + ((item.quantity || 0) * (item.sellingPrice || 0));
            }, 0);
        }, 0);
    }, [consignmentStock]);

    return (
        <div className="space-y-6">
            <KpiCard 
                icon={<Truck size={24} />}
                title="Total Value of Consignment Stock"
                value={`R ${totalConsignmentValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                color="bg-purple-500/20 text-purple-400"
            />
            {loading ? <p>Loading consignment data...</p> : (
                consignmentStock.map(clientData => (
                    <div key={clientData.clientId} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h4 className="font-bold text-white text-lg mb-2 flex items-center gap-2"><User /> {clientData.clientName}</h4>
                         <div className="overflow-x-auto max-h-72">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-2">Product Name</th>
                                        <th className="p-2 text-center">Quantity on Hand</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientData.items.map(item => (
                                        <tr key={item.id} className="border-b border-gray-700">
                                            <td className="p-2 text-white">{item.productName}</td>
                                            <td className="p-2 text-center font-bold">{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// Main Page Component
const StockHubPage = () => {
    const [activeTab, setActiveTab] = useState('internal');
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAllInventoryItems().then(items => {
            setInventoryItems(items);
            setLoading(false);
        });
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Stock Hub</h2>
            <div className="flex border-b border-gray-700">
                <button onClick={() => setActiveTab('internal')} className={`px-4 py-2 font-semibold ${activeTab === 'internal' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Internal Stock & Valuation</button>
                <button onClick={() => setActiveTab('consignment')} className={`px-4 py-2 font-semibold ${activeTab === 'consignment' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Consignment Report</button>
            </div>

            {activeTab === 'internal' && <InventoryValuationDashboard items={inventoryItems} loading={loading} />}
            {activeTab === 'consignment' && <ConsignmentReport />}
        </div>
    );
};

export default StockHubPage;
