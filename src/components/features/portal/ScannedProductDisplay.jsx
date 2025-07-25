// src/components/features/portal/ScannedProductDisplay.jsx

import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
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
                        // Find the specific consignment stock item for this client and product
                        const consignmentRef = collection(db, 'consignmentStock');
                        const q = query(consignmentRef, 
                            where("clientId", "==", user.uid), 
                            where("productId", "==", product.id)
                        );
                        
                        const querySnapshot = await getDocs(q);

                        if (querySnapshot.empty) {
                            throw new Error("This item was not found in your consignment stock.");
                        }

                        const batch = writeBatch(db);
                        let notificationNeeded = false;

                        querySnapshot.forEach(docSnap => {
                            const item = docSnap.data();
                            const newQuantity = (item.quantity || 0) - 1;

                            if (newQuantity < 0) {
                                toast.error("Cannot book out. Stock level is already zero.");
                                return;
                            }
                            
                            batch.update(docSnap.ref, { quantity: newQuantity });

                            // Create a notification for the admin/manager
                            const notificationsRef = collection(db, 'notifications');
                            const newNotifRef = doc(notificationsRef);
                            batch.set(newNotifRef, {
                                type: 'consignment_sold',
                                message: `${user.companyName} sold one unit of ${product.name}.`,
                                targetRole: 'Manager', // Or a specific role that handles this
                                read: false,
                                createdAt: new Date(),
                                productId: product.id,
                                clientId: user.uid,
                            });
                            notificationNeeded = true;
                        });

                        if (notificationNeeded) {
                            await batch.commit();
                            toast.success("Item booked out successfully! We have been notified.");
                            onBookOutSuccess();
                        }

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
