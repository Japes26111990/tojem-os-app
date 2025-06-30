// src/pages/ProductViabilityPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, getLinkedRecipesForProduct, getJobStepDetails, getAllInventoryItems, getEmployees, getOverheadCategories, getOverheadExpenses } from '../api/firestore';
import Dropdown from '../components/ui/Dropdown';
import Input from '../components/ui/Input';
import { DollarSign, Percent, Plus } from 'lucide-react';

const ProductViabilityKpiCard = ({ icon, title, value, color }) => (
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

const ProductViabilityPage = () => {
    const [products, setProducts] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [averageBurdenedRate, setAverageBurdenedRate] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [linkedRecipes, setLinkedRecipes] = useState([]);
    const [sellingPrice, setSellingPrice] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [prods, recipes, inventory, employees, overheadCats] = await Promise.all([
                    getProducts(),
                    getJobStepDetails(),
                    getAllInventoryItems(),
                    getEmployees(),
                    getOverheadCategories()
                ]);

                setProducts(prods);
                setAllRecipes(recipes);
                setInventoryItems(inventory);

                const expensePromises = overheadCats.map(cat => getOverheadExpenses(cat.id));
                const expenseResults = await Promise.all(expensePromises);
                const totalMonthlyOverheads = expenseResults.flat().reduce((sum, exp) => sum + (exp.amount || 0), 0);
                const totalCompanyProductiveHours = (employees.length || 1) * 45 * 4.33;
                const overheadCostPerHour = totalCompanyProductiveHours > 0 ? totalMonthlyOverheads / totalCompanyProductiveHours : 0;
                const totalHourlyRate = employees.reduce((sum, emp) => sum + (emp.hourlyRate || 0), 0);
                const avgDirectRate = employees.length > 0 ? totalHourlyRate / employees.length : 0;
                setAverageBurdenedRate(avgDirectRate + overheadCostPerHour);
            } catch (error) {
                console.error("Failed to load viability data:", error);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchLinks = async () => {
            if (selectedProductId) {
                const product = products.find(p => p.id === selectedProductId);
                if (product) {
                    setSellingPrice(product.sellingPrice || '');
                }
                const links = await getLinkedRecipesForProduct(selectedProductId);
                
                // For each link, find the corresponding full recipe details
                const detailedRecipes = links.map(link => {
                    return allRecipes.find(r => r.id === link.jobStepDetailId);
                }).filter(Boolean); // Filter out any undefined recipes

                setLinkedRecipes(detailedRecipes);
            } else {
                setLinkedRecipes([]);
            }
        };
        fetchLinks();
    }, [selectedProductId, products, allRecipes]);

    const analysis = useMemo(() => {
        const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));
        let totalMaterialCost = 0;
        let totalLaborCost = 0;
        const detailedCosts = [];

        linkedRecipes.forEach(recipe => {
            const recipeMaterialCost = (recipe.consumables || []).reduce((sum, consumable) => {
                const inventoryItem = inventoryMap.get(consumable.itemId);
                const price = inventoryItem?.price || 0;
                
                // Handle both fixed and dimensional consumables
                let quantity = 0;
                if(consumable.type === 'fixed') {
                    quantity = consumable.quantity || 0;
                } else if (consumable.type === 'dimensional') {
                    // This is a simplified cost for dimensional - a better model could be built
                    // For now, let's assume the 'quantity' field is stored for cost estimation
                    quantity = consumable.quantity || 1; 
                } else {
                    quantity = consumable.quantity || 0;
                }

                return sum + (price * quantity);
            }, 0);

            const recipeLaborCost = (recipe.estimatedTime || 0) / 60 * averageBurdenedRate;
            
            totalMaterialCost += recipeMaterialCost;
            totalLaborCost += recipeLaborCost;

            detailedCosts.push({
                id: recipe.id,
                partName: recipe.description || 'Recipe Step',
                departmentName: products.find(p=>p.id === recipe.productId)?.name || 'N/A',
                cost: recipeMaterialCost + recipeLaborCost
            });
        });
        
        const totalCost = totalMaterialCost + totalLaborCost;
        const price = parseFloat(sellingPrice) || 0;
        const profit = price > 0 ? price - totalCost : 0;
        const margin = price > 0 ? (profit / price) * 100 : 0;

        return { totalCost, profit, margin, detailedCosts };
    }, [linkedRecipes, sellingPrice, inventoryItems, averageBurdenedRate, products]);

    if (loading) return <p className="text-center text-gray-400">Loading Profitability Engine...</p>;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Product Profitability Dashboard</h2>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <Dropdown
                    label="Select a Product to Analyze"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    options={products}
                    placeholder="Choose a product..."
                />
            </div>
            
            {selectedProductId && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ProductViabilityKpiCard icon={<DollarSign size={24}/>} title="True Manufacturing Cost" value={`R ${analysis.totalCost.toFixed(2)}`} color="bg-orange-500/20 text-orange-400" />
                        <div className="md:col-span-1">
                            <Input label="Enter Selling Price" type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="e.g., 50000" />
                        </div>
                        <ProductViabilityKpiCard icon={<Plus size={24}/>} title="Net Profit" value={`R ${analysis.profit.toFixed(2)}`} color={analysis.profit >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} />
                        <ProductViabilityKpiCard icon={<Percent size={24}/>} title="Profit Margin" value={`${analysis.margin.toFixed(1)}%`} color={analysis.margin >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"} />
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <h3 className="text-xl font-bold text-white mb-4">Cost Breakdown</h3>
                         <div className="space-y-3">
                            {analysis.detailedCosts.length > 0 ? (
                                analysis.detailedCosts.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-200">{item.partName}</p>
                                        </div>
                                        <p className="font-mono text-lg text-gray-300">R {item.cost.toFixed(2)}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-center py-4">No linked recipes found for this product. Go to Settings to link recipes.</p>
                            )}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductViabilityPage;
