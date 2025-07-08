// src/components/intelligence/PraiseModal.jsx

import React, { useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Dropdown from '../ui/Dropdown';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const PraiseModal = ({ allEmployees, currentUser, onSubmit, onClose }) => {
    const [recipientId, setRecipientId] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter out the current user from the list of recipients
    const recipientOptions = allEmployees.filter(emp => emp.id !== currentUser.uid);

    const handleSubmit = async () => {
        if (!recipientId || !message.trim()) {
            return toast.error("Please select a recipient and write a message.");
        }
        setIsSubmitting(true);
        try {
            const recipient = allEmployees.find(emp => emp.id === recipientId);
            await onSubmit({
                senderId: currentUser.uid,
                senderName: currentUser.email, // Or a display name if available
                recipientId: recipientId,
                recipientName: recipient.name,
                message: message,
            });
            toast.success("Praise sent successfully!");
            onClose();
        } catch (error) {
            console.error("Failed to send praise:", error);
            toast.error("Could not send praise. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Give Praise to a Colleague</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 space-y-4">
                    <Dropdown
                        label="Send Praise To"
                        options={recipientOptions}
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        placeholder="Select an employee..."
                    />
                    <Textarea
                        label="Your Message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g., 'Thanks for your help with the XYZ job, you saved the day!'"
                        rows={4}
                    />
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                        <Send size={16} className="mr-2" />
                        {isSubmitting ? 'Sending...' : 'Send Praise'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PraiseModal;
