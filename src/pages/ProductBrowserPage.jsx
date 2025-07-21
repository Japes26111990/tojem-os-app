// src/pages/ProductBrowserPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, addQuote, getJobStepDetails, listenToJobCards } from '../api/firestore';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { Search, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import LiveQuoteSidebar from '../components/features/portal/LiveQuoteSidebar';
import toast from 'react-hot-toast';

// Helper component to display stock status with appropriate colors and icons
const StockStatus = ({ product, leadTimeDays }) => {
    const stock = product.currentStock || 0;
    const reorder = product.reorderLevel || 0;
    
    if (stock > reorder) {
        return <span className="flex items-center gap-1 text-xs font-semibold text-green-400"><CheckCircle size={14} /> In Stock</span>;
    }
    if (stock > 0 && stock <= reorder) {
        return <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400"><AlertTriangle size={14} /> Low Stock</span>;
    }
    // --- UPDATED LOGIC TO SHOW DYNAMIC LEAD TIME ---
    return (
        <span className="flex items-center gap-1 text-xs font-semibold text-gray-400" title="Estimated time until dispatch based on current workshop load.">
            <Clock size={14} /> 
            {leadTimeDays !== null ? `~${leadTimeDays} Day Lead Time` : 'Made to Order'}
        </span>
    );
};


const ProductBrowserPage = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]); // --- NEW STATE for recipes ---
    const [allJobs, setAllJobs] = useState([]); // --- NEW STATE for jobs ---
    const [loading, setLoading] = useState(true);
    const [cartItems, setCartItems] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        manufacturer: '',
        make: '',
        model: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // --- FETCH ALL NECESSARY DATA ---
                const [fetchedProducts, fetchedRecipes] = await Promise.all([
                    getProducts(),
                    getJobStepDetails()
                ]);
                setProducts(fetchedProducts);
                setAllRecipes(fetchedRecipes);

                // Listen for real-time job updates to keep lead times fresh
                const unsubscribeJobs = listenToJobCards(setAllJobs);
                
                return unsubscribeJobs;
            } catch (error) {
                console.error("Error fetching products:", error);
                toast.error("Could not load product catalog.");
            }
            setLoading(false);
        };
        const unsubscribePromise = fetchData();
        return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }, []);

    // --- NEW: Calculation for lead times ---
    const productLeadTimes = useMemo(() => {
        const leadTimes = new Map();
        if (products.length === 0 || allRecipes.length === 0 || allJobs.length === 0) {
            return leadTimes;
        }

        const pendingJobs = allJobs.filter(j => j.status === 'Pending');
        const backlogByDept = pendingJobs.reduce((acc, job) => {
            const deptId = job.departmentId;
            acc[deptId] = (acc[deptId] || 0) + (job.estimatedTime || 0);
            return acc;
        }, {});

        products.forEach(product => {
            const recipesForProduct = allRecipes.filter(r => r.productId === product.id);
            if (recipesForProduct.length === 0) {
                leadTimes.set(product.id, null);
                return;
            }

            let totalManufacturingMinutes = 0;
            let totalBacklogMinutes = 0;
            const departmentsInvolved = new Set();

            recipesForProduct.forEach(recipe => {
                totalManufacturingMinutes += recipe.estimatedTime || 0;
                if (recipe.departmentId) {
                    departmentsInvolved.add(recipe.departmentId);
                }
            });

            departmentsInvolved.forEach(deptId => {
                totalBacklogMinutes += backlogByDept[deptId] || 0;
            });

            const totalMinutes = totalManufacturingMinutes + totalBacklogMinutes;
            const totalDays = Math.ceil(totalMinutes / (8 * 60)); // Assuming 8-hour work day

            leadTimes.set(product.id, totalDays);
        });

        return leadTimes;

    }, [products, allRecipes, allJobs]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };
            if (name === 'manufacturer') {
                newFilters.make = '';
                newFilters.model = '';
            }
            if (name === 'make') {
                newFilters.model = '';
            }
            return newFilters;
        });
    };
    
    const handleAddToCart = (product) => {
        if (cartItems.find(item => item.id === product.id)) {
            return toast('Item is already in your quote.', { icon: 'ℹ️' });
        }
        setCartItems(prev => [...prev, product]);
        toast.success(`${product.name} added to quote.`);
    };

    const handleRemoveFromCart = (productId) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));
    };
    
    const handleOrderSubmission = () => {
        setCartItems([]);
    };

    const handleInstantQuote = async (product) => {
        const quoteData = {
            customerName: user.companyName || user.email,
            customerEmail: user.email,
            lineItems: [{
                description: product.name,
                cost: product.sellingPrice,
                productId: product.id,
                quantity: 1,
            }],
            subtotal: product.sellingPrice,
            margin: 0,
            total: product.sellingPrice,
            quoteId: `Q-INST-${Date.now()}`,
            status: 'Customer Generated'
        };

        const promise = addQuote(quoteData);
        toast.promise(promise, {
            loading: 'Generating instant quote...',
            success: `Instant quote ${quoteData.quoteId} created!`,
            error: "Failed to create instant quote."
        });
    };

    const manufacturers = useMemo(() => [...new Set(products.map(p => p.manufacturer).filter(Boolean))].map(m => ({id: m, name: m})), [products]);
    
     const makes = useMemo(() => {
        if (!filters.manufacturer) return [];
        return [...new Set(products.filter(p => p.manufacturer === filters.manufacturer).map(p => p.make).filter(Boolean))].map(m => ({id: m, name: m}));
    }, [products, filters.manufacturer]);

    const models = useMemo(() => {
        if (!filters.make) return [];
        return [...new Set(products.filter(p => p.make === filters.make).map(p => p.model).filter(Boolean))].map(m => ({id: m, name: m}));
    }, [products, filters.make]);

    const displayedProducts = useMemo(() => {
        return products.filter(product => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = product.name.toLowerCase().includes(searchLower);
            const partNumberMatch = product.partNumber?.toLowerCase().includes(searchLower);

            const manufacturerMatch = !filters.manufacturer || product.manufacturer === filters.manufacturer;
            const makeMatch = !filters.make || product.make === filters.make;
            const modelMatch = !filters.model || product.model === filters.model;

            return (nameMatch || partNumberMatch) && manufacturerMatch && makeMatch && modelMatch;
        });
    }, [products, searchTerm, filters]);


    if (loading) {
        return <p className="text-center text-gray-400">Loading Product Catalog...</p>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 space-y-6">
                 <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Find Your Parts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative md:col-span-1">
                             <Input 
                                placeholder="Search by name or part number..." 
                                value={searchTerm}
                                 onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                         </div>
                        <Dropdown label="Manufacturer" name="manufacturer" value={filters.manufacturer} onChange={handleFilterChange} options={manufacturers} placeholder="All Manufacturers" />
                        <Dropdown label="Make" name="make" value={filters.make} onChange={handleFilterChange} options={makes} placeholder="All Makes" disabled={!filters.manufacturer} />
                        <Dropdown label="Model" name="model" value={filters.model} onChange={handleFilterChange} options={models} placeholder="All Models" disabled={!filters.make} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayedProducts.map(product => (
                        <div key={product.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
                            <img 
                                src={product.photoUrl || `https://placehold.co/400x300/1f2937/9ca3af?text=No+Image`} 
                                alt={product.name}
                                className="w-full h-48 object-cover"
                            />
                             <div className="p-4 flex flex-col flex-grow">
                                <h4 className="font-bold text-white flex-grow">{product.name}</h4>
                                <p className="text-xs text-gray-500 font-mono mb-2">P/N: {product.partNumber}</p>
                                <div className="flex justify-between items-center mb-4">
                                     <p className="text-lg font-semibold text-green-400">R {product.sellingPrice?.toFixed(2) || 'N/A'}</p>
                                    <StockStatus product={product} leadTimeDays={productLeadTimes.get(product.id)} />
                                </div>
                                 <div className="flex gap-2 mt-auto">
                                    <Button onClick={() => handleAddToCart(product)} variant="primary" className="w-full">Add to Quote</Button>
                                    {product.sellingPrice > 0 && (
                                        <Button 
                                            onClick={() => handleInstantQuote(product)} 
                                            variant="secondary" 
                                            className="p-2"
                                            title="Get Instant Quote for this item"
                                        >
                                            <FileText size={20} />
                                        </Button>
                                    )}
                                 </div>
                            </div>
                        </div>
                    ))}
                </div>
                {displayedProducts.length === 0 && !loading && (
                     <div className="text-center py-16 bg-gray-800 rounded-lg">
                        <p className="text-gray-500">No products match your search criteria.</p>
                    </div>
                )}
            </div>

            <div className="lg:col-span-1">
                 <LiveQuoteSidebar 
                    cartItems={cartItems}
                    onRemoveItem={handleRemoveFromCart}
                    discountPercentage={user?.discountPercentage || 0}
                    onOrderSubmit={handleOrderSubmission}
                />
            </div>
        </div>
    );
};

export default ProductBrowserPage;
