// src/components/features/portal/FeedbackModal.jsx (NEW FILE)

import React, { useState } from 'react';
import Button from '../../ui/Button';
import Textarea from '../../ui/Textarea';
import { X, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const FeedbackModal = ({ order, user, onSubmit, onClose }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            return toast.error("Please select a star rating.");
        }
        setIsSubmitting(true);
        try {
            await onSubmit({
                rating,
                comment,
                salesOrderId: order.id,
                salesOrderIdentifier: order.salesOrderId,
                customerName: user.companyName || user.email,
                customerId: user.uid,
            });
            toast.success("Thank you for your feedback!");
            onClose();
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            toast.error("Could not submit feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Provide Feedback for {order.salesOrderId}</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm font-medium text-gray-300 mb-2">Overall Quality Rating</p>
                        <div className="flex items-center justify-center space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    size={40}
                                    className={`cursor-pointer transition-colors ${
                                        (hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-600'
                                    }`}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                />
                            ))}
                        </div>
                    </div>
                    <Textarea
                        label="Additional Comments (Optional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tell us about your experience with this order..."
                        rows={4}
                    />
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
