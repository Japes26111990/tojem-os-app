// src/components/ui/ConfirmationModal.jsx (NEW FILE)

import React from 'react';
import Button from './Button';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
                <div className="p-6 text-center">
                    <AlertTriangle size={48} className="mx-auto text-yellow-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-400">{message}</p>
                </div>
                <div className="p-4 flex justify-end gap-3 bg-gray-900/50 rounded-b-xl">
                    <Button onClick={onClose} variant="secondary">{cancelText}</Button>
                    <Button onClick={onConfirm} variant="danger">{confirmText}</Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
