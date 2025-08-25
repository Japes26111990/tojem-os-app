// src/components/features/portal/ScannedProductDisplay.jsx

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
// --- UPDATED: Import the new function ---
import { bookOutConsignmentItemAndTriggerReplenishment } from '../../../api/firestore';
import Button from '../../ui/Button';
import { Package, DollarSign, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ScannedProductDisplay = ({ product, onBookOutSuccess }) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBookOut = async () => {
        if (!user || !user.uid) {
            return toast.error("Could not identify the current client.");
        }

        toast((t) => (
            <span>
                Confirm booking out one unit of "{product.name}"?
                <Button variant="primary" size="sm" className="ml-2" onClick={async () => {
                    toast.dismiss(t.id);
                    setIsSubmitting(true);
                    try {
                        // --- UPDATED: Simplified logic using the new function ---
                        await bookOutConsignmentItemAndTriggerReplenishment(user, product);
                        toast.success("Item booked out successfully! We have been notified and will restock if necessary.");
                        onBookOutSuccess();

                    } catch (error) {
                        console.error("Error booking out stock:", error);
                        toast.error(`Error: ${error.message}`);
                    } finally {
                        setIsSubmitting(false);
                    }
                }}>
                    Confirm
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ));
    };

    return (
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row gap-8">
                <img 
                    src={product.photoUrl || `https://placehold.co/400x300/1f2937/9ca3af?text=No+Image`} 
                    alt={product.name}
                    className="w-full md:w-1/2 h-64 object-cover rounded-lg"
                />
                <div className="flex-grow flex flex-col">
                    <h3 className="text-3xl font-bold text-white">{product.name}</h3>
                    <p className="text-sm text-gray-400 font-mono">P/N: {product.partNumber}</p>
                    <div className="my-6">
                        <p className="text-gray-400 text-sm">Selling Price</p>
                        <p className="text-4xl font-bold text-green-400">R {product.sellingPrice?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div className="mt-auto">
                        <Button onClick={handleBookOut} variant="primary" className="w-full py-3 text-lg" disabled={isSubmitting}>
                            <CheckCircle size={20} className="mr-2" />
                            {isSubmitting ? 'Processing...' : 'Book Out Stock'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScannedProductDisplay;