// src/components/features/portal/OrderConfirmationModal.jsx

import React, { useState } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const OrderConfirmationModal = ({ cartItems, totals, onClose, onConfirm }) => {
    const [poNumber, setPoNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!poNumber.trim()) {
            return toast.error("A Purchase Order (PO) number is required to confirm.");
        }
        setIsSubmitting(true);
        try {
            await onConfirm(poNumber);
            // The success toast is now handled by the parent component (LiveQuoteSidebar)
            onClose();
        } catch (error) {
            // The error toast is also handled by the parent
            console.error("Order submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Confirm Your Order</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-300">Please review your order details and provide your company's Purchase Order number to finalize.</p>
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <div className="flex justify-between text-lg text-white">
                            <span>Total Items:</span>
                            <span className="font-bold">{cartItems.length}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-bold text-green-400 mt-2">
                            <span>Final Total:</span>
                            <span className="font-mono">R {totals.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <Input 
                        label="Your Purchase Order (PO) Number"
                        placeholder="Enter PO Number..."
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        required
                    />
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirm} disabled={isSubmitting || !poNumber.trim()}>
                        <Send size={16} className="mr-2" />
                        {isSubmitting ? 'Submitting...' : 'Confirm & Submit Order'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationModal;
