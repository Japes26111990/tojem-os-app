// src/components/features/quotes/AddCustomWorkModal.jsx (New File)

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, PlusCircle, Trash2, Search } from 'lucide-react';

const AddCustomWorkModal = ({ onClose, onAdd, calculationData }) => {
    const { inventoryItems, averageBurdenedRate } = calculationData;

    const [description, setDescription] = useState('');
    const [estimatedHours, setEstimatedHours] = useState('');
    const [consumables, setConsumables] = useState([]);

    // State for the consumable search dropdown
    const [consumableSearchTerm, setConsumableSearchTerm] = useState('');
    const [filteredConsumableOptions, setFilteredConsumableOptions] = useState([]);
    const [selectedConsumableItem, setSelectedConsumableItem] = useState(null);
    const [consumableQuantity, setConsumableQuantity] = useState('');
    const consumableSearchRef = useRef(null);
    
    useEffect(() => {
        if (consumableSearchTerm.length > 0) {
            const lowerCaseSearchTerm = consumableSearchTerm.toLowerCase();
            const filtered = inventoryItems.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm))
            ).slice(0, 10);
            setFilteredConsumableOptions(filtered);
        } else {
            setFilteredConsumableOptions([]);
        }
    }, [consumableSearchTerm, inventoryItems]);

    const selectConsumableFromSearch = (item) => {
        setSelectedConsumableItem(item);
        setConsumableSearchTerm(item.name);
        setFilteredConsumableOptions([]);
    };

    const addConsumableToList = () => {
        if (!selectedConsumableItem || !consumableQuantity || parseFloat(consumableQuantity) <= 0) return;
        setConsumables([...consumables, { ...selectedConsumableItem, quantity: parseFloat(consumableQuantity) }]);
        setSelectedConsumableItem(null);
        setConsumableSearchTerm('');
        setConsumableQuantity('');
    };

    const removeConsumable = (id) => {
        setConsumables(consumables.filter(c => c.id !== id));
    };

    const calculatedCost = useMemo(() => {
        const materialCost = consumables.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const laborCost = (parseFloat(estimatedHours) || 0) * averageBurdenedRate;
        return materialCost + laborCost;
    }, [consumables, estimatedHours, averageBurdenedRate]);

    const handleAddItemToQuote = () => {
        if (!description) return alert("Please provide a description for this custom work.");
        if (calculatedCost <= 0) return alert("The estimated cost must be greater than zero.");
        
        onAdd({
            description: description,
            cost: calculatedCost,
        });
        onClose();
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Add Custom Work to Quote</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    <Input label="Line Item Description" placeholder="e.g., Repair and reinforce customer bracket" value={description} onChange={e => setDescription(e.target.value)} />
                    <Input label="Estimated Labor (Hours)" type="number" placeholder="e.g., 4.5" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />

                    {/* Consumables Section */}
                    <div>
                        <h4 className="font-semibold text-white mb-2">Materials Needed</h4>
                        <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
                            <div className="flex items-end gap-2" ref={consumableSearchRef}>
                                <div className="flex-grow relative">
                                    <Input label="Search Inventory" value={consumableSearchTerm} onChange={(e) => { setConsumableSearchTerm(e.target.value); setSelectedConsumableItem(null); }} placeholder="Search for a material..." />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 mt-3" size={20} />
                                    {consumableSearchTerm.length > 0 && filteredConsumableOptions.length > 0 && (
                                        <ul className="absolute z-20 bg-gray-700 border border-gray-600 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                            {filteredConsumableOptions.map(item => (
                                                <li key={item.id} className="p-2 text-sm text-gray-200 hover:bg-blue-600 cursor-pointer" onClick={() => selectConsumableFromSearch(item)}>{item.name}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="w-24"><Input label="Quantity" type="number" value={consumableQuantity} onChange={e => setConsumableQuantity(e.target.value)} /></div>
                                <Button type="button" onClick={addConsumableToList} disabled={!selectedConsumableItem}>Add</Button>
                            </div>
                            <ul className="space-y-2 pt-3 border-t border-gray-700">
                                {consumables.map(c => (
                                    <li key={c.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm">
                                        <span>{c.name} : {c.quantity} {c.unit}</span>
                                        <Button type="button" onClick={() => removeConsumable(c.id)} variant="danger" className="py-0.5 px-2 text-xs">X</Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-between items-center">
                    <div>
                        <p className="text-sm text-gray-400">Calculated Item Cost</p>
                        <p className="text-2xl font-bold text-white font-mono">R {calculatedCost.toFixed(2)}</p>
                    </div>
                    <Button onClick={handleAddItemToQuote} variant="primary">Add to Quote</Button>
                </div>
            </div>
        </div>
    );
};

export default AddCustomWorkModal;
