// src/pages/ProductCatalogPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    getAllInventoryItems,
    deleteInventoryItem,
    getMakes,
    getModels,
    getProductCategories,
    getUnits,
    getJobStepDetails,
    getDepartments,
    getEmployees,
    addJobCard,
    getTools, // --- FIX: Added getTools
    getToolAccessories // --- FIX: Added getToolAccessories
} from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { Search, PlusCircle, Factory, QrCode, Edit, Trash2, Upload, FilePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductModal from '../components/features/catalog/ProductModal';
import QrCodePrintModal from '../components/features/catalog/QrCodePrintModal';
import ProductImportModal from '../components/features/catalog/ProductImportModal';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../api/firebase';
import SearchInput from '../components/ui/SearchInput';
import { JOB_STATUSES } from '../config';
import QRCode from 'qrcode';
import { processConsumables } from '../utils/jobUtils'; // Import the utility function

// Base64 encoded logo to ensure it prints correctly
const tojemLogoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA... (base64 string would be very long)"; // Replace with your actual full base64 string


// --- NEW COMPONENT: Quick Job Creator Modal ---
const QuickJobCreatorModal = ({ product, recipes, departments, employees, allTools, allToolAccessories, allInventoryItems, onClose, onSuccess }) => {
    const [selections, setSelections] = useState({});
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSelectionChange = (recipeId, employeeId) => {
        setSelections(prev => {
            const newSelections = { ...prev };
            if (employeeId) {
                newSelections[recipeId] = employeeId;
            } else {
                delete newSelections[recipeId];
            }
            return newSelections;
        });
    };

    const handleCreateJobs = async () => {
        const selectedRecipeIds = Object.keys(selections);
        if (selectedRecipeIds.length === 0) {
            return toast.error("Please select at least one department/recipe to create a job for.");
        }
        if (!quantity || quantity < 1) {
            return toast.error("Please enter a valid quantity.");
        }

        setIsSubmitting(true);
        const parentJobId = `ROUTED-${Date.now()}`;
        const jobsToCreate = [];
        const createdJobsData = [];

        for (const recipeId of selectedRecipeIds) {
            const recipe = recipes.find(r => r.id === recipeId);
            const department = departments.find(d => d.id === recipe.departmentId);
            const employeeId = selections[recipeId];
            const employee = employees.find(e => e.id === employeeId);

            // Find full tool and accessory objects for printing
            const toolsForJobCard = allTools.filter(t => (recipe.tools || []).includes(t.id));
            const accessoriesForJobCard = allToolAccessories.filter(a => (recipe.accessories || []).includes(a.id));
            
            // Process consumables to get calculated quantities and catalyst additions
            const processedConsumablesForJob = processConsumables(recipe.consumables, allInventoryItems, 20); // Assuming 20C for quick creation

            const jobData = {
                jobId: `${parentJobId}-${jobsToCreate.length + 1}`,
                partId: product.id,
                partName: product.name,
                photoUrl: product.photoUrl,
                quantity: Number(quantity),
                departmentId: recipe.departmentId,
                departmentName: department?.name || 'Unknown',
                employeeId: employee?.id || 'unassigned',
                employeeName: employee?.name || 'Unassigned',
                status: JOB_STATUSES.PENDING,
                description: recipe.description,
                estimatedTime: recipe.estimatedTime,
                steps: (recipe.steps || []).map(s => s.text || s),
                tools: toolsForJobCard,
                accessories: accessoriesForJobCard,
                consumables: recipe.consumables || [],
                processedConsumables: processedConsumablesForJob,
                isCustomJob: false,
                parentJobId: selectedRecipeIds.length > 1 ? parentJobId : null,
            };
            jobsToCreate.push(addJobCard(jobData));
            createdJobsData.push(jobData);
        }

        try {
            await Promise.all(jobsToCreate);
            toast.success(`${jobsToCreate.length} job card(s) created successfully!`);
            
            // --- UPDATED PRINTING LOGIC ---
            let printContents = '';
            for (const job of createdJobsData) {
                const qrCodeDataUrl = await QRCode.toDataURL(job.jobId, { width: 80 });
                const imageSection = job.photoUrl
                    ? `<img src="${job.photoUrl}" alt="${job.partName}" style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover; margin-bottom: 15px; border: 1px solid #ddd;" />`
                    : `<div style="border-radius: 8px; width: 100%; height: 150px; margin-bottom: 15px; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #aaa; border: 1px solid #ddd;"><span>No Image</span></div>`;

                printContents += `
                    <div style="font-family: sans-serif; padding: 20px; color: #333; page-break-after: always;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                            <div>
                                <img src="${tojemLogoBase64}" alt="Company Logo" style="height: 50px; margin-bottom: 10px;"/>
                                <h1 style="font-size: 28px; font-weight: bold; margin: 0;">Job Card</h1>
                                <p style="font-size: 14px; color: #666; margin: 0;">Part: <span style="font-weight: 600;">${job.partName} (x${job.quantity})</span></p>
                                <p style="font-size: 14px; color: #666; margin: 0;">Department: <span style="font-weight: 600;">${job.departmentName}</span></p>
                            </div>
                            <div style="text-align: right;">
                                <img src="${qrCodeDataUrl}" alt="QR Code" style="margin-bottom: 5px;"/>
                                <p style="font-size: 10px; color: #999; margin: 0;">${job.jobId}</p>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                            <div>
                                ${imageSection}
                                <div style="font-size: 13px; line-height: 1.6;">
                                    <p style="margin: 0;"><b>Employee:</b> ${job.employeeName}</p>
                                    <p style="margin: 0;"><b>Est. Time:</b> ${job.estimatedTime || 'N/A'} mins</p>
                                    <p style="margin: 0;"><b>Description:</b> ${job.description || 'No description.'}</p>
                                </div>
                            </div>
                            <div style="font-size: 13px; line-height: 1.6;">
                                <div>
                                    <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Tools & Accessories</h3>
                                    <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                                        ${job.tools?.length > 0 ? job.tools.map(tool => `<li>${tool.name}</li>`).join('') : '<li>No tools specified.</li>'}
                                        ${job.accessories?.length > 0 ? job.accessories.map(acc => `<li style="margin-left: 15px;">${acc.name}</li>`).join('') : ''}
                                    </ul>
                                </div>
                                <div style="margin-top: 20px;">
                                    <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Consumables</h3>
                                    <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                                        ${job.processedConsumables?.length > 0 ? job.processedConsumables.map(c => `<li><span style="font-weight: 600;">${c.name}</span>: ${c.quantity.toFixed(2)} ${c.unit}</li>`).join('') : '<li>No consumables required.</li>'}
                                    </ul>
                                </div>
                            </div>
                        </div>
                         <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Steps</h3>
                            <ol style="list-style: decimal; padding-left: 20px; margin: 0;">
                                ${job.steps?.length > 0 ? job.steps.map(step => `<li>${step}</li>`).join('') : '<li>No steps defined.</li>'}
                            </ol>
                        </div>
                    </div>
                `;
            }
            
            const printWindow = window.open('', '_blank', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Print Job Cards</title></head><body>${printContents}</body></html>`);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.addEventListener('afterprint', () => printWindow.close());
                }, 500);
            } else {
                toast("Print window blocked. Please allow popups.", { icon: 'ℹ️' });
            }

            onSuccess();
        } catch (error) {
            console.error("Error creating job cards:", error);
            toast.error("Failed to create one or more job cards.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Quick Job Creation for: {product.name}</h3>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <Input label="Quantity to Produce" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
                    <h4 className="font-semibold text-gray-300">Select Departments & Assign Employees:</h4>
                    <div className="space-y-3">
                        {recipes.map(recipe => {
                            const department = departments.find(d => d.id === recipe.departmentId);
                            const employeesInDept = employees.filter(e => e.departmentId === recipe.departmentId);
                            const isSelected = !!selections[recipe.id];

                            return (
                                <div key={recipe.id} className={`p-3 rounded-lg border transition-all ${isSelected ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-900/50 border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => handleSelectionChange(recipe.id, e.target.checked ? 'unassigned' : null)}
                                            className="h-5 w-5 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-bold text-white">{department?.name || 'Unknown Department'}</span>
                                    </div>
                                    {isSelected && (
                                        <div className="pl-8 mt-2">
                                            <Dropdown
                                                label="Assign Employee (Optional)"
                                                value={selections[recipe.id] || 'unassigned'}
                                                onChange={(e) => handleSelectionChange(recipe.id, e.target.value)}
                                                options={[{ id: 'unassigned', name: 'Unassigned' }, ...employeesInDept]}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleCreateJobs} variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : `Create & Print ${Object.keys(selections).length} Job(s)`}
                    </Button>
                </div>
            </div>
        </div>
    );
};


const ProductCatalogPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ categoryId: '', make: '', model: '' });
    
    // State for modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isQuickJobModalOpen, setIsQuickJobModalOpen] = useState(false);
    
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Data for dropdowns and job creation
    const [productCategories, setProductCategories] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [units, setUnits] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [allTools, setAllTools] = useState([]);
    const [allToolAccessories, setAllToolAccessories] = useState([]);

    const [makeMap, setMakeMap] = useState(new Map());
    const [modelMap, setModelMap] = useState(new Map());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                allItems, fetchedCategories, fetchedMakes, fetchedModels, 
                fetchedUnits, fetchedRecipes, fetchedDepartments, fetchedEmployees,
                fetchedTools, fetchedToolAccessories
            ] = await Promise.all([
                getAllInventoryItems(), getProductCategories(), getMakes(), getModels(), 
                getUnits(), getJobStepDetails(), getDepartments(), getEmployees(),
                getTools(), getToolAccessories()
            ]);
            
            setProducts(allItems.filter(item => item.category === 'Product'));
            setAllInventoryItems(allItems);
            setProductCategories(fetchedCategories);
            setMakes(fetchedMakes);
            setModels(fetchedModels);
            setUnits(fetchedUnits);
            setAllRecipes(fetchedRecipes);
            setAllDepartments(fetchedDepartments);
            setAllEmployees(fetchedEmployees);
            setAllTools(fetchedTools);
            setAllToolAccessories(fetchedToolAccessories);

            setMakeMap(new Map(fetchedMakes.map(m => [m.id, m.name])));
            setModelMap(new Map(fetchedModels.map(m => [m.id, m.name])));

        } catch (error) {
            toast.error("Failed to load catalog data.");
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const recipesByProduct = useMemo(() => {
        return allRecipes.reduce((acc, recipe) => {
            if (!acc[recipe.productId]) {
                acc[recipe.productId] = [];
            }
            acc[recipe.productId].push(recipe);
            return acc;
        }, {});
    }, [allRecipes]);

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
                        fetchData();
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
        ), { icon: '⚠️' });
    };

    const handleOpenModal = (product = null) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleOpenQrModal = (product) => {
        setSelectedProduct(product);
        setIsQrModalOpen(true);
    };
    
    const handleOpenQuickJobModal = (product) => {
        setSelectedProduct(product);
        setIsQuickJobModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        fetchData();
    };

    const handleDelete = (productId) => {
        toast((t) => (
            <span>
                Delete this product permanently?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteInventoryItem(productId)
                        .then(() => {
                            toast.success("Product deleted.");
                            fetchData();
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
                                     filteredProducts.map(product => {
                                        const hasRecipe = recipesByProduct[product.id] && recipesByProduct[product.id].length > 0;
                                        return (
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
                                                        {hasRecipe && (
                                                            <Button onClick={() => handleOpenQuickJobModal(product)} variant="success" size="sm" className="p-2" title="Quick Create Job Card">
                                                                <FilePlus size={16}/>
                                                            </Button>
                                                        )}
                                                        <Button onClick={() => handleOpenModal(product)} variant="secondary" size="sm" className="p-2" title="Edit Product"><Edit size={16}/></Button>
                                                        <Button onClick={() => handleDelete(product.id)} variant="danger" size="sm" className="p-2" title="Delete Product"><Trash2 size={16}/></Button>
                                                        <Button onClick={() => handleOpenQrModal(product)} variant="primary" size="sm" className="p-2" title="Print QR Code"><QrCode size={16} /></Button>
                                                    </div>
                                                </td>
                                             </tr>
                                        );
                                    })
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
                    onImportSuccess={fetchData}
                />
            )}

            {isQuickJobModalOpen && selectedProduct && (
                <QuickJobCreatorModal
                    product={selectedProduct}
                    recipes={recipesByProduct[selectedProduct.id] || []}
                    departments={allDepartments}
                    employees={allEmployees}
                    allTools={allTools}
                    allToolAccessories={allToolAccessories}
                    allInventoryItems={allInventoryItems}
                    onClose={() => setIsQuickJobModalOpen(false)}
                    onSuccess={() => {
                        setIsQuickJobModalOpen(false);
                    }}
                />
            )}
        </>
    );
};

export default ProductCatalogPage;
