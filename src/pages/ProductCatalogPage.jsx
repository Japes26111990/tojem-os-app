// src/pages/ProductCatalogPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems, deleteInventoryItem, getMakes, getModels, getProductCategories, getUnits } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { Search, PlusCircle, Factory, QrCode, Edit, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductModal from '../components/features/catalog/ProductModal';
import QrCodePrintModal from '../components/features/catalog/QrCodePrintModal';
import ProductImportModal from '../components/features/catalog/ProductImportModal';
import { writeBatch, doc,
         collection, query, where, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import SearchInput from '../components/ui/SearchInput';

const ProductCatalogPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        categoryId: '',
        make: '',
        model: ''
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const [productCategories, setProductCategories] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [units, setUnits] = useState([]); // Add units to state

    // Maps to store ID-to-Name mappings
    const [makeMap, setMakeMap] = useState(new Map());
    const [modelMap, setModelMap] = useState(new Map());

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const allItems = await getAllInventoryItems();
            setProducts(allItems.filter(item => item.category === 'Product'));
        } catch (error) {
            toast.error("Failed to load product catalog.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [fetchedCategories, fetchedMakes, fetchedModels, fetchedUnits] = await Promise.all([ // Fetch units too
                getProductCategories(),
                getMakes(),
                getModels(),
                getUnits() // Fetch units
            ]);
            setProductCategories(fetchedCategories);
            setMakes(fetchedMakes);
            setModels(fetchedModels);
            setUnits(fetchedUnits); // Set units state

            // Populate the maps
            setMakeMap(new Map(fetchedMakes.map(m => [m.id, m.name])));
            setModelMap(new Map(fetchedModels.map(m => [m.id, m.name])));

        } catch (error) {
            console.error("Error fetching make/model/category/unit data:", error);
            toast.error("Failed to load filter data.");
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchDropdownData();
    }, []);
    
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const searchMatch = (
                 product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.partNumber && product.partNumber.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            const categoryMatch = !filters.categoryId || product.categoryId === filters.categoryId;
            const makeMatch = !filters.make || product.make === filters.make;
            const modelMatch = !filters.model || product.model === filters.model;
            
            return searchMatch && categoryMatch && makeMatch && modelMatch;
        });
    }, [products, searchTerm, filters]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allVisibleIds = new Set(filteredProducts.map(p => p.id));
            setSelectedIds(allVisibleIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectSingle = (productId, isChecked) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(productId);
            } else {
                newSet.delete(productId);
            }
            return newSet;
        });
    };
    
    const isAllSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        toast((t) => (
            <span>
                Delete {selectedIds.size} selected products?
                <Button variant="danger" size="sm" className="ml-2" onClick={async () => {
                    toast.dismiss(t.id);
                    const batch = writeBatch(db);
                    selectedIds.forEach(id => {
                        const docRef = doc(db, 'inventoryItems', id);
                        batch.delete(docRef);
                    });
                    try {
                        await batch.commit();
                        toast.success(`${selectedIds.size} products deleted successfully.`);
                        setSelectedIds(new Set());
                        fetchProducts();
                    } catch (err) {
                        toast.error("Failed to delete selected products.");
                    }
                }}>
                    Confirm Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: 'âš ï¸ ' });
    };

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
        fetchProducts();
        fetchDropdownData();
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
        ), { icon: 'âš ï¸ ' });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'categoryId') {
                newFilters.make = '';
                newFilters.model = '';
            }
            if (name === 'make') {
                newFilters.model = '';
            }
            return newFilters;
        });
    };

    const filteredMakesForDropdown = useMemo(() => {
        if (!filters.categoryId) return makes;
        return makes.filter(make =>
            Array.isArray(make.categoryIds) && make.categoryIds.includes(filters.categoryId)
        );
    }, [makes, filters.categoryId]);

    const filteredModelsForDropdown = useMemo(() => {
        if (!filters.make) return models;
        return models.filter(model => model.makeId === filters.make);
    }, [models, filters.make]);


    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                     <h2 className="text-3xl font-bold text-white flex items-center gap-2"><Factory /> Product Command Center</h2>
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <Button onClick={handleDeleteSelected} variant="danger">
                                <Trash2 size={18} className="mr-2" />
                                Delete Selected ({selectedIds.size})
                            </Button>
                        )}
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
                    {/* --- FIX: Added 'items-end' to align all filter controls to the bottom --- */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <SearchInput
                            label="Search by Name or Part Number"
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Dropdown label="Filter by Category" name="categoryId" value={filters.categoryId} onChange={handleFilterChange} options={productCategories} placeholder="All Categories" />
                        <Dropdown label="Filter by Make" name="make" value={filters.make} onChange={handleFilterChange} options={filteredMakesForDropdown} placeholder="All Makes" disabled={!filters.categoryId} />
                        <Dropdown label="Filter by Model" name="model" value={filters.model} onChange={handleFilterChange} options={filteredModelsForDropdown} placeholder="All Models" disabled={!filters.make} />
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50">
                                <tr>
                                     <th className="p-3 w-4">
                                        <input 
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                        />
                                     </th>
                                     <th className="p-3 text-sm font-semibold text-gray-400">Image</th>
                                     <th className="p-3 text-sm font-semibold text-gray-400">Product Name</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Part Number</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Make</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Model/Year</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-center">Stock on Hand</th>
                                     <th className="p-3 text-sm font-semibold text-gray-400 text-right">Selling Price</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                 {loading ? (
                                     <tr><td colSpan="11" className="text-center p-8 text-gray-400">Loading products...</td></tr>
                                 ) : filteredProducts.length === 0 ? (
                                     <tr><td colSpan="11" className="text-center p-8 text-gray-400">No products match your filters.</td></tr>
                                 ) : (
                                     filteredProducts.map(product => (
                                        <tr key={product.id} className={`border-b border-gray-700 hover:bg-gray-700/50 ${selectedIds.has(product.id) ? 'bg-blue-900/50' : ''}`}>
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(product.id)}
                                                    onChange={(e) => handleSelectSingle(product.id, e.target.checked)}
                                                    className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <img 
                                                    src={product.photoUrl || `https://placehold.co/100x75/1f2937/9ca3af?text=No+Image`} 
                                                    alt={product.name}
                                                    className="w-20 h-14 object-cover rounded-md"
                                                />
                                            </td>
                                            <td className="p-3 text-white font-medium">{product.name}</td>
                                            <td className="p-3 text-gray-300 font-mono">{product.partNumber}</td>
                                            <td className="p-3 text-gray-400">{makeMap.get(product.make) || 'N/A'}</td>
                                            <td className="p-3 text-gray-400">{modelMap.get(product.model) || 'N/A'}</td>
                                            <td className="p-3 text-white font-mono text-center">{product.currentStock || 0}</td>
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