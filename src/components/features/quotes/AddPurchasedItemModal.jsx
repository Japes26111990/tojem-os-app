// src/components/features/quotes/AddPurchasedItemModal.jsx (New File)

import React, { useState } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, ShoppingBag } from 'lucide-react';

const AddPurchasedItemModal = ({ onClose, onAdd }) => {
    const [description, setDescription] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [quantity, setQuantity] = useState(1);

    const handleAddItemToQuote = () => {
        if (!description || !estimatedCost || !quantity) {
            return alert("Please provide a description, estimated cost, and quantity.");
        }
        if (parseFloat(estimatedCost) <= 0 || parseInt(quantity, 10) <= 0) {
            return alert("Cost and quantity must be greater than zero.");
        }

        // Add the item to the quote's line items
        // We add 'isPurchasedItem: true' to identify it later
        onAdd({
            description,
            cost: parseFloat(estimatedCost) * parseInt(quantity, 10), // The total cost for the quantity
            isPurchasedItem: true,
            quantity: parseInt(quantity, 10),
            unitCost: parseFloat(estimatedCost)
        });

        onClose();
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingBag /> Add Purchased Item to Quote
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    <Input 
                        label="Item Description" 
                        placeholder="e.g., 2x Hella Spotlights" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Estimated Cost (per item)" 
                            type="number" 
                            placeholder="e.g., 1500" 
                            value={estimatedCost} 
                            onChange={e => setEstimatedCost(e.target.value)} 
                        />
                        <Input 
                            label="Quantity" 
                            type="number" 
                            placeholder="e.g., 1" 
                            value={quantity} 
                            onChange={e => setQuantity(e.target.value)} 
                        />
                    </div>
                     <p className="text-xs text-gray-400">
                        This is for items you will buy specifically for this job. The cost you enter here is an estimate for the quote. You will confirm the actual price later.
                    </p>
                </div>

                <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end">
                    <Button onClick={handleAddItemToQuote} variant="primary">Add to Quote</Button>
                </div>
            </div>
        </div>
    );
};

export default AddPurchasedItemModal;