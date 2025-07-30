// src/components/features/recipes/ConsumableEditor.jsx (New Reusable Component)

import React, { useState, useEffect, useRef } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Search } from 'lucide-react';

const ConsumableEditor = ({ allConsumables, selectedConsumables, onAdd, onRemove }) => {
    // State for the component's internal UI
    const [consumableType, setConsumableType] = useState('fixed');

    // State for the "Fixed Quantity" mode
    const [fixedSearchTerm, setFixedSearchTerm] = useState('');
    const [fixedQty, setFixedQty] = useState('');
    const [filteredFixedOptions, setFilteredFixedOptions] = useState([]);
    const [selectedFixedItemDetails, setSelectedFixedItemDetails] = useState(null);

    // State for the "Dimensional Cuts" mode
    const [dimSearchTerm, setDimSearchTerm] = useState('');
    const [cuts, setCuts] = useState([]);
    const [cutRule, setCutRule] = useState({ dimensions: '', notes: '' });
    const [filteredDimOptions, setFilteredDimOptions] = useState([]);
    const [selectedDimItemDetails, setSelectedDimItemDetails] = useState(null);

    // Refs to handle clicking outside the search results
    const searchRefFixed = useRef(null);
    const searchRefDim = useRef(null);

    // Effect for filtering fixed consumables based on search term
    useEffect(() => {
        if (fixedSearchTerm.length > 0) {
            const lowerCaseSearchTerm = fixedSearchTerm.toLowerCase();
            const filtered = allConsumables.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm))
            ).slice(0, 10);
            setFilteredFixedOptions(filtered);
        } else {
            setFilteredFixedOptions([]);
        }
    }, [fixedSearchTerm, allConsumables]);

    // Effect for filtering dimensional consumables based on search term
    useEffect(() => {
        if (dimSearchTerm.length > 0) {
            const lowerCaseSearchTerm = dimSearchTerm.toLowerCase();
            const filtered = allConsumables.filter(item =>
                (item.category === 'Raw Material' || item.name.toLowerCase().includes('mat')) &&
                (item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm)))
            ).slice(0, 10);
            setFilteredDimOptions(filtered);
        } else {
            setFilteredDimOptions([]);
        }
    }, [dimSearchTerm, allConsumables]);
    
    // Effect to close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRefFixed.current && !searchRefFixed.current.contains(event.target)) setFilteredFixedOptions([]);
            if (searchRefDim.current && !searchRefDim.current.contains(event.target)) setFilteredDimOptions([]);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddConsumable = () => {
        let newConsumable;
        let itemToAddDetails;

        if (consumableType === 'fixed') {
            if (!selectedFixedItemDetails || !fixedQty || parseFloat(fixedQty) <= 0) return toast.error("Please select an item and enter a valid quantity.");
            itemToAddDetails = selectedFixedItemDetails;
            newConsumable = { type: 'fixed', itemId: itemToAddDetails.id, quantity: Number(fixedQty) };
        } else if (consumableType === 'dimensional') {
            if (!selectedDimItemDetails || cuts.length === 0) return toast.error("Please select a material and add at least one cutting instruction.");
            itemToAddDetails = selectedDimItemDetails;
            newConsumable = { type: 'dimensional', itemId: itemToAddDetails.id, cuts };
        } else {
            return;
        }

        // Add full item details to the consumable object before passing it up
        const consumableWithDetails = {
            ...newConsumable,
            name: itemToAddDetails.name,
            unit: itemToAddDetails.unit || 'units',
            price: itemToAddDetails.price || 0,
            itemCode: itemToAddDetails.itemCode || '',
            category: itemToAddDetails.category || '',
            requiresCatalyst: itemToAddDetails.requiresCatalyst || false,
        };

        if (!selectedConsumables.find(c => c.itemId === consumableWithDetails.itemId)) {
            onAdd(consumableWithDetails);
            // Reset all form fields
            setFixedSearchTerm('');
            setFixedQty('');
            setSelectedFixedItemDetails(null);
            setDimSearchTerm('');
            setCuts([]);
            setCutRule({ dimensions: '', notes: '' });
            setSelectedDimItemDetails(null);
        } else {
            toast.error("This consumable has already been added.");
        }
    };

    return (
        <div>
            <h5 className="font-semibold mb-2 text-gray-200">Required Consumables</h5>
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                <div className="flex gap-2 bg-gray-800 p-1 rounded-md">
                    <button type="button" onClick={() => setConsumableType('fixed')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'fixed' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Fixed Quantity</button>
                    <button type="button" onClick={() => setConsumableType('dimensional')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'dimensional' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Dimensional Cuts</button>
                </div>
                
                {consumableType === 'fixed' && (
                    <div className="flex items-end gap-2 animate-fade-in" ref={searchRefFixed}>
                        <div className="flex-grow relative">
                            <Input
                                label="Item"
                                value={fixedSearchTerm}
                                onChange={e => { setFixedSearchTerm(e.target.value); setSelectedFixedItemDetails(null); }}
                                placeholder="Search by name or code..."
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            {filteredFixedOptions.length > 0 && (
                                <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                     {filteredFixedOptions.map(item => (
                                        <li key={item.id} className="p-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer" onClick={() => { setSelectedFixedItemDetails(item); setFixedSearchTerm(item.name); setFilteredFixedOptions([]); }}>
                                            {item.name} ({item.itemCode || 'N/A'})
                                        </li>
                                    ))}
                                 </ul>
                            )}
                        </div>
                        <div className="w-24">
                             <Input label="Qty" type="number" value={fixedQty} onChange={e => setFixedQty(e.target.value)} placeholder="e.g., 5"/>
                        </div>
                        <Button type="button" onClick={handleAddConsumable} disabled={!selectedFixedItemDetails || parseFloat(fixedQty) <= 0 || isNaN(parseFloat(fixedQty))}>Add</Button>
                    </div>
                )}
                
                {consumableType === 'dimensional' && (
                    <div className="space-y-3 animate-fade-in" ref={searchRefDim}>
                         <div className="flex-grow relative">
                             <Input label="Material to Cut" value={dimSearchTerm} onChange={e => { setDimSearchTerm(e.target.value); setSelectedDimItemDetails(null); }} placeholder="Search by name or code..."/>
                             <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            {filteredDimOptions.length > 0 && (
                                <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {filteredDimOptions.map(item => (<li key={item.id} className="p-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer" onClick={() => { setSelectedDimItemDetails(item); setDimSearchTerm(item.name); setFilteredDimOptions([]); }}>{item.name} ({item.itemCode || 'N/A'})</li>))}
                                 </ul>
                            )}
                        </div>
                        <div className="p-2 border border-gray-700 rounded-md">
                             <p className="text-xs text-gray-400 mb-2">Cutting Instructions</p>
                            <div className="flex items-end gap-2"><Input label="Dimensions (e.g., 120cm x 80cm)" value={cutRule.dimensions} onChange={e => setCutRule({...cutRule, dimensions: e.target.value})} /><Input label="Notes" value={cutRule.notes} onChange={e => setCutRule({...cutRule, notes: e.target.value})} /><Button type="button" onClick={() => { if(cutRule.dimensions) { setCuts([...cuts, cutRule]); setCutRule({ dimensions: '', notes: '' }); }}}>Add Cut</Button></div>
                            <ul className="text-xs mt-2 space-y-1">{cuts.map((c, i) => <li key={i}>{c.dimensions} ({c.notes})</li>)}</ul>
                        </div>
                         <Button type="button" onClick={handleAddConsumable} className="w-full" disabled={!selectedDimItemDetails || cuts.length === 0}>Add Dimensional Consumable</Button>
                    </div>
                )}
                
                <h6 className="text-sm font-bold pt-2 border-t border-gray-700 text-gray-200">Recipe Consumables</h6>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedConsumables.map((c, i) => (
                         <li key={c.itemId || i} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm text-gray-200">
                            <div>
                                <p className="font-semibold">{c.name}</p>
                                {c.quantity && <span>: {c.quantity.toFixed(3)} {c.unit}</span>}
                                {c.notes && <span className="text-xs italic text-gray-500 ml-1">{c.notes}</span>}
                                {c.cuts && (<ul className="list-square list-inside ml-4 mt-1">{c.cuts.map((cut, j) => <li key={j}>{cut.dimensions} <span className="text-xs italic text-gray-500">{cut.notes}</span></li>)}</ul>)}
                            </div>
                            <Button type="button" onClick={() => onRemove(c.itemId)} variant="danger" className="py-0.5 px-2 text-xs">X</Button>
                        </li>
                    ))}
                     {selectedConsumables.length === 0 && <p className="text-xs text-center text-gray-500">No consumables added.</p>}
                </ul>
            </div>
        </div>
    );
};

export default ConsumableEditor;
