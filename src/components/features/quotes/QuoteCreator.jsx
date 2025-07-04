// src/components/features/quotes/QuoteCreator.jsx (FIXED: Missing export)

import React, { useState, useMemo } from 'react';
import { addQuote } from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import { X, PlusCircle, Trash2, DollarSign, Percent, FileText, Package, Wrench, ShoppingBag } from 'lucide-react';
import AddCustomWorkModal from './AddCustomWorkModal';
import AddPurchasedItemModal from './AddPurchasedItemModal';
import toast from 'react-hot-toast';

const QuoteCreator = ({ onClose, calculationData }) => {
    const { products, allRecipes, inventoryItems, averageBurdenedRate } = calculationData;

    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [lineItems, setLineItems] = useState([]);
    const [margin, setMargin] = useState('40');
    
    const [isCustomWorkModalOpen, setCustomWorkModalOpen] = useState(false);
    const [isPurchasedItemModalOpen, setPurchasedItemModalOpen] = useState(false);

    const [catalogProductId, setCatalogProductId] = useState('');

    const handleAddLineItem = (item) => {
        const newItem = { ...item, id: Date.now() };
        if (item.isCustomWork) {
            newItem.isCustomWork = true;
        } else if (item.isPurchasedItem) {
            newItem.isPurchasedItem = true;
        } else {
            newItem.isCatalogItem = true;
        }
        setLineItems(prevItems => [...prevItems, newItem]);
    };

    const handleAddCatalogItem = () => {
        if (!catalogProductId) return;
        const product = products.find(p => p.id === catalogProductId);
        if (!product) return toast.error("Selected product not found.");
        const productRecipes = allRecipes.filter(r => r.productId === product.id);
        if (productRecipes.length === 0) return toast.error("This product has no recipes defined. Cannot calculate cost.");

        const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));
        let totalMaterialCost = 0;
        let totalLaborCost = 0;

        productRecipes.forEach(recipe => {
            totalMaterialCost += (recipe.consumables || []).reduce((sum, consumable) => {
                const inventoryItem = inventoryMap.get(consumable.itemId);
                return sum + ((inventoryItem?.price || 0) * (consumable.quantity || 0));
            }, 0);
            totalLaborCost += (recipe.estimatedTime || 0) / 60 * averageBurdenedRate;
        });
        
        handleAddLineItem({ description: product.name, cost: totalMaterialCost + totalLaborCost, productId: product.id });
        setCatalogProductId('');
    };

    const handleRemoveLineItem = (id) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    const totals = useMemo(() => {
        const subtotal = lineItems.reduce((sum, item) => sum + item.cost, 0);
        const marginDecimal = parseFloat(margin) / 100;
        const total = (marginDecimal < 1 && marginDecimal >= 0) ? subtotal / (1 - marginDecimal) : subtotal;
        const profit = total - subtotal;
        return { subtotal, total, profit };
    }, [lineItems, margin]);

    const handleSaveQuote = async () => {
        if (!customerName) return toast.error("Please enter a customer name.");
        if (lineItems.length === 0) return toast.error("Please add at least one line item.");
        
        const quoteData = { 
            customerName, 
            customerEmail, 
            lineItems: lineItems.map(({ id, ...rest }) => rest), 
            subtotal: totals.subtotal, 
            margin: parseFloat(margin), 
            total: totals.total, 
            quoteId: `Q-${Date.now()}` 
        };

        try {
            await addQuote(quoteData);
            toast.success(`Quote ${quoteData.quoteId} saved successfully!`);
            onClose();
        } catch (error) {
            console.error("Error saving quote:", error);
            toast.error("Failed to save quote. See console for details.");
        }
    };

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText /> Create New Sales Quote</h2>
                        <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Customer Name" placeholder="e.g., John Doe" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            <Input label="Customer Email" type="email" placeholder="e.g., john.doe@example.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold text-white">Quote Line Items</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {lineItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded-md">
                                        <p className="flex-grow text-gray-200">{item.description}</p>
                                        <p className="font-mono text-gray-300" title="Estimated True Cost">R {item.cost.toFixed(2)}</p>
                                        <Button onClick={() => handleRemoveLineItem(item.id)} variant="danger" className="p-1 h-7 w-7"><Trash2 size={14}/></Button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex flex-wrap items-end gap-2 p-4 border-t border-gray-700 bg-gray-900/50 rounded-lg">
                                <div className="flex-grow">
                                    <Dropdown label="Add from Product Catalog" value={catalogProductId} onChange={e => setCatalogProductId(e.target.value)} options={products} placeholder="Select a product..."/>
                                </div>
                                <Button onClick={handleAddCatalogItem} variant="secondary"><Package size={16} className="mr-2"/>Add Product</Button>
                                <div className="border-l border-gray-600 h-10 mx-2"></div>
                                <Button onClick={() => setCustomWorkModalOpen(true)} variant="secondary"><Wrench size={16} className="mr-2"/>Add Custom Work</Button>
                                <Button onClick={() => setPurchasedItemModalOpen(true)} variant="secondary"><ShoppingBag size={16} className="mr-2"/>Add Purchased Item</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-600">
                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                <p className="text-sm text-gray-400 flex items-center gap-1"><DollarSign size={14}/> Subtotal (Cost)</p>
                                <p className="text-2xl font-bold font-mono text-white">R {totals.subtotal.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col justify-center">
                                <Input label="Profit Margin (%)" type="number" value={margin} onChange={e => setMargin(e.target.value)} />
                            </div>
                            <div className="bg-green-900/50 p-4 rounded-lg md:col-span-2">
                                <p className="text-sm text-green-300 flex items-center gap-1"><DollarSign size={14}/> Final Quoted Price</p>
                                <p className="text-4xl font-bold font-mono text-white">R {totals.total.toFixed(2)}</p>
                                <p className="text-xs text-gray-400 mt-1">Projected Profit: R {totals.profit.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-2">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={handleSaveQuote} variant="primary">Save Quote</Button>
                    </div>
                </div>
            </div>
            
            {isCustomWorkModalOpen && (
                <AddCustomWorkModal 
                    onClose={() => setCustomWorkModalOpen(false)}
                    onAdd={(item) => handleAddLineItem({ ...item, isCustomWork: true })}
                    calculationData={calculationData}
                />
            )}

            {isPurchasedItemModalOpen && (
                <AddPurchasedItemModal 
                    onClose={() => setPurchasedItemModalOpen(false)}
                    onAdd={(item) => handleAddLineItem({ ...item, isPurchasedItem: true })}
                />
            )}
        </>
    );
};

export default QuoteCreator; // --- THIS LINE WAS MISSING ---