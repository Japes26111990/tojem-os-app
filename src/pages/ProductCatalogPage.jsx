// src/pages/ProductCatalogPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems, deleteInventoryItem } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { Search, PlusCircle, Factory, QrCode, Edit, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductModal from '../components/features/catalog/ProductModal';
import QrCodePrintModal from '../components/features/catalog/QrCodePrintModal';
import ProductImportModal from '../components/features/catalog/ProductImportModal'; // <-- NEW IMPORT

const ProductCatalogPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        make: '',
        model: ''
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false); // <-- NEW STATE
    const [selectedProduct, setSelectedProduct] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const allItems = await getAllInventoryItems();
            // Filter for only manufactured products
            setProducts(allItems.filter(item => item.category === 'Product'));
        } catch (error) {
            toast.error("Failed to load product catalog.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpenModal = (product = null) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleOpenQrModal = (product) => {
        setSelectedProduct(product);
        setIsQrModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        fetchProducts(); // Refresh data after modal closes
    };

    const handleDelete = (productId) => {
        toast((t) => (
            <span>
                Delete this product permanently?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteInventoryItem(productId)
                        .then(() => {
                            toast.success("Product deleted.");
                            fetchProducts();
                        })
                        .catch(err => toast.error("Failed to delete product."));
                    toast.dismiss(t.id);
                }}>
                    Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: '⚠️' });
    };

    // Deriving filter options from the product list
    const makes = useMemo(() => [...new Set(products.map(p => p.make).filter(Boolean))].map(m => ({ id: m, name: m })), [products]);
    const models = useMemo(() => {
        if (!filters.make) return [];
        return [...new Set(products.filter(p => p.make === filters.make).map(p => p.model).filter(Boolean))].map(m => ({ id: m, name: m }));
    }, [products, filters.make]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'make') {
                newFilters.model = ''; // Reset model if make changes
            }
            return newFilters;
        });
    };

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const searchMatch = (
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.partNumber && product.partNumber.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            const makeMatch = !filters.make || product.make === filters.make;
            const modelMatch = !filters.model || product.model === filters.model;
            return searchMatch && makeMatch && modelMatch;
        });
    }, [products, searchTerm, filters]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2"><Factory /> Product Catalog</h2>
                    <div className="flex gap-2">
                        {/* NEW IMPORT BUTTON */}
                        <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
                            <Upload size={18} className="mr-2" />
                            Import from CSV
                        </Button>
                        <Button onClick={() => handleOpenModal()} variant="primary">
                            <PlusCircle size={18} className="mr-2" />
                            Add New Product
                        </Button>
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Search by name or part number..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                        <Dropdown label="Filter by Make" name="make" value={filters.make} onChange={handleFilterChange} options={makes} placeholder="All Makes" />
                        <Dropdown label="Filter by Model" name="model" value={filters.model} onChange={handleFilterChange} options={models} placeholder="All Models" disabled={!filters.make} />
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Product Name</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Part Number</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Make</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Model</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-right">Selling Price</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center p-8 text-gray-400">Loading products...</td></tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center p-8 text-gray-400">No products match your filters.</td></tr>
                                ) : (
                                    filteredProducts.map(product => (
                                        <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-white font-medium">{product.name}</td>
                                            <td className="p-3 text-gray-300 font-mono">{product.partNumber}</td>
                                            <td className="p-3 text-gray-400">{product.make || 'N/A'}</td>
                                            <td className="p-3 text-gray-400">{product.model || 'N/A'}</td>
                                            <td className="p-3 text-green-400 font-mono text-right">R {product.sellingPrice?.toFixed(2) || '0.00'}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button onClick={() => handleOpenModal(product)} variant="secondary" size="sm" className="p-2" title="Edit Product"><Edit size={16}/></Button>
                                                    <Button onClick={() => handleDelete(product.id)} variant="danger" size="sm" className="p-2" title="Delete Product"><Trash2 size={16}/></Button>
                                                    <Button onClick={() => handleOpenQrModal(product)} variant="primary" size="sm" className="p-2" title="Print QR Code"><QrCode size={16} /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <ProductModal
                    product={selectedProduct}
                    onClose={handleCloseModal}
                />
            )}

            {isQrModalOpen && (
                <QrCodePrintModal
                    product={selectedProduct}
                    onClose={() => setIsQrModalOpen(false)}
                />
            )}

            {/* NEW: Render the import modal */}
            {isImportModalOpen && (
                <ProductImportModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImportSuccess={fetchProducts}
                />
            )}
        </>
    );
};

export default ProductCatalogPage;
