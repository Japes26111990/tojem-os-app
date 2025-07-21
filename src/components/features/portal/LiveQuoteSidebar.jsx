// src/components/features/portal/LiveQuoteSidebar.jsx

import React, { useState, useMemo } from 'react';
import Button from '../../ui/Button';
import { ShoppingCart, Trash2, Percent, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { submitCustomerOrder } from '../../../api/firestore';
import OrderConfirmationModal from './OrderConfirmationModal';
import toast from 'react-hot-toast';

const LiveQuoteSidebar = ({ cartItems, onRemoveItem, discountPercentage, onOrderSubmit }) => {
    const { user } = useAuth();
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    
    const totals = useMemo(() => {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
        const discountAmount = subtotal * (discountPercentage / 100);
        const total = subtotal - discountAmount;
        return { subtotal, discountAmount, total };
    }, [cartItems, discountPercentage]);

    const handleConfirmOrder = async (poNumber) => {
        const orderPayload = {
            client: {
                uid: user.uid,
                email: user.email,
                companyName: user.companyName,
            },
            items: cartItems.map(item => ({ id: item.id, name: item.name, sellingPrice: item.sellingPrice, quantity: 1 })), // Assuming quantity of 1 for now
            totals: totals,
            poNumber: poNumber,
        };
        
        const promise = submitCustomerOrder(orderPayload);
        
        toast.promise(promise, {
            loading: 'Submitting order...',
            success: () => {
                onOrderSubmit(); // Clear the cart on the parent page
                return "Order submitted successfully! You will be contacted shortly.";
            },
            error: "There was an error submitting your order. Please try again."
        });

        await promise;
    };

    return (
        <>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 h-full flex flex-col">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <ShoppingCart size={20} />
                    Your Quote
                </h3>
                <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                    {cartItems.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center pt-10">Your quote is empty. Add parts from the list.</p>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                                <span className="text-sm text-gray-200 flex-grow">{item.name}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-gray-300">R {item.sellingPrice.toFixed(2)}</span>
                                    <Button onClick={() => onRemoveItem(item.id)} variant="danger" size="sm" className="p-1 h-6 w-6">
                                        <Trash2 size={12}/>
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="border-t border-gray-600 mt-4 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-300">
                        <span>Subtotal:</span>
                        <span className="font-mono">R {totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-cyan-400">
                        <span>Your Discount ({discountPercentage}%):</span>
                        <span className="font-mono">- R {totals.discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-600/50 mt-2">
                        <span>Total:</span>
                        <span className="font-mono text-green-400">R {totals.total.toFixed(2)}</span>
                    </div>
                </div>
                <Button onClick={() => setConfirmModalOpen(true)} disabled={cartItems.length === 0} className="w-full mt-4">
                    <FileText size={16} className="mr-2"/>
                    Submit Order for Invoicing
                </Button>
            </div>
            {isConfirmModalOpen && (
                <OrderConfirmationModal
                    cartItems={cartItems}
                    totals={totals}
                    onClose={() => setConfirmModalOpen(false)}
                    onConfirm={handleConfirmOrder}
                />
            )}
        </>
    );
};

export default LiveQuoteSidebar;
