// src/pages/ManufacturedStockPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Search, Package, Factory, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import ConsignmentReport from '../components/features/stock/ConsignmentReport';

// Internal Stock Component
const InternalStockDashboard = ({ products, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.partNumber && product.partNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [products, searchTerm]);

    const totalStockValue = useMemo(() => {
        return filteredProducts.reduce((sum, item) => sum + (item.currentStock || 0) * (item.sellingPrice || 0), 0);
    }, [filteredProducts]);

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
                <p className="text-sm text-gray-400">Total Internal Stock Value (Selling Price)</p>
                <p className="text-2xl font-bold text-green-400">R {totalStockValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="relative w-full sm:w-1/3">
                    <Input
                        type="text"
                        placeholder="Search by name or part number..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-400">Image</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Product Name</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Part Number</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-center">Stock on Hand</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Selling Price</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center p-8 text-gray-400">Loading stock...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="text-center p-8 text-gray-400">No manufactured products found.</td></tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-2">
                                            <img 
                                                src={product.photoUrl || `https://placehold.co/100x75/1f2937/9ca3af?text=No+Image`} 
                                                alt={product.name}
                                                className="w-20 h-14 object-cover rounded-md"
                                            />
                                        </td>
                                        <td className="p-3 text-white font-medium">{product.name}</td>
                                        <td className="p-3 text-gray-300 font-mono">{product.partNumber}</td>
                                        <td className="p-3 text-white font-mono text-center">{product.currentStock || 0}</td>
                                        <td className="p-3 text-green-400 font-mono text-right">R {product.sellingPrice?.toFixed(2) || '0.00'}</td>
                                        <td className="p-3 text-green-400 font-mono text-right font-semibold">R {((product.currentStock || 0) * (product.sellingPrice || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const ManufacturedStockPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('internal');

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const allItems = await getAllInventoryItems();
                setProducts(allItems.filter(item => item.category === 'Product'));
            } catch (error) {
                toast.error("Failed to load manufactured stock.");
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Finished Goods Stock</h2>
            
            <div className="flex border-b border-gray-700">
                <button 
                    onClick={() => setActiveTab('internal')} 
                    className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'internal' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
                >
                    <Factory size={16} /> Internal Stock
                </button>
                <button 
                    onClick={() => setActiveTab('consignment')} 
                    className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'consignment' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}
                >
                    <Truck size={16} /> Consignment Report
                </button>
            </div>

            {activeTab === 'internal' && <InternalStockDashboard products={products} loading={loading} />}
            {activeTab === 'consignment' && <ConsignmentReport />}
        </div>
    );
};

export default ManufacturedStockPage;