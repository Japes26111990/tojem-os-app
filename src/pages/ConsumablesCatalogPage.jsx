// src/pages/ConsumablesCatalogPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Search, Package, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import QrCodePrintModal from '../components/features/catalog/QrCodePrintModal';

const ConsumablesCatalogPage = () => {
    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [selectedConsumable, setSelectedConsumable] = useState(null);

    const fetchConsumables = async () => {
        setLoading(true);
        try {
            const allItems = await getAllInventoryItems();
            // Filter for all items that are NOT manufactured products
            setConsumables(allItems.filter(item => item.category !== 'Product'));
        } catch (error) {
            toast.error("Failed to load consumables catalog.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsumables();
    }, []);

    const handleOpenQrModal = (consumable) => {
        // The QR code will use the itemCode, which is equivalent to a part number for consumables
        setSelectedConsumable({ ...consumable, partNumber: consumable.itemCode });
        setIsQrModalOpen(true);
    };

    const filteredConsumables = useMemo(() => {
        return consumables.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [consumables, searchTerm]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2"><Package /> Consumables & Raw Materials Catalog</h2>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="relative w-full sm:w-1/3">
                        <Input
                            type="text"
                            placeholder="Search by name or item code..."
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
                                    <th className="p-3 text-sm font-semibold text-gray-400">Item Name</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Item Code</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Category</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-center">In Stock</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">Loading consumables...</td></tr>
                                ) : filteredConsumables.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">No items found.</td></tr>
                                ) : (
                                    filteredConsumables.map(item => (
                                        <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-white font-medium">{item.name}</td>
                                            <td className="p-3 text-gray-300 font-mono">{item.itemCode || 'N/A'}</td>
                                            <td className="p-3 text-gray-400">{item.category}</td>
                                            <td className="p-3 text-white font-mono text-center">{item.currentStock} {item.unit}</td>
                                            <td className="p-3 text-center">
                                                <Button onClick={() => handleOpenQrModal(item)} variant="primary" size="sm" className="p-2" title="Print QR Code">
                                                    <QrCode size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isQrModalOpen && (
                <QrCodePrintModal
                    product={selectedConsumable}
                    onClose={() => setIsQrModalOpen(false)}
                />
            )}
        </>
    );
};

export default ConsumablesCatalogPage;
