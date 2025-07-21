// src/components/features/tracking/KaizenSuggestionModal.jsx (NEW FILE)

import React, { useState } from 'react';
import Button from '../../ui/Button';
import Textarea from '../../ui/Textarea';
import { X, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';

const KaizenSuggestionModal = ({ job, user, onSubmit, onClose }) => {
    const [suggestion, setSuggestion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!suggestion.trim()) {
            return toast.error("Please enter a suggestion.");
        }
        setIsSubmitting(true);
        try {
            await onSubmit({
                jobId: job.id,
                jobIdentifier: job.jobId,
                partName: job.partName,
                suggestionText: suggestion,
                submittedBy: user.email,
                userId: user.uid,
            });
            toast.success("Thank you! Your suggestion has been submitted.");
            onClose();
        } catch (error) {
            console.error("Failed to submit suggestion:", error);
            toast.error("Could not submit suggestion. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Lightbulb className="text-yellow-400" />
                        Suggest an Improvement
                    </h3>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-400">
                        How could we improve the process for the job: <strong className="text-white">{job.partName} ({job.jobId})</strong>?
                    </p>
                    <Textarea
                        label="Your Suggestion"
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        placeholder="e.g., 'The jig for this part could be improved by...', 'We could save time by doing step 3 before step 2...'"
                        rows={5}
                        autoFocus
                    />
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default KaizenSuggestionModal;
