// src/components/features/settings/KaizenManager.jsx (NEW FILE)
// This component provides a management interface for reviewing and actioning
// continuous improvement suggestions submitted by employees.

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Lightbulb, Check, X, Archive, Cpu } from 'lucide-react'; // --- IMPORT Cpu ICON ---
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
    const statusConfig = {
        'new': { label: 'New', color: 'bg-blue-500/20 text-blue-300' },
        'reviewing': { label: 'Under Review', color: 'bg-yellow-500/20 text-yellow-300' },
        'approved': { label: 'Approved', color: 'bg-purple-500/20 text-purple-300' },
        'implemented': { label: 'Implemented', color: 'bg-green-500/20 text-green-300' },
        'rejected': { label: 'Rejected', color: 'bg-red-500/20 text-red-400' },
    };
    const config = statusConfig[status] || { label: 'Unknown', color: 'bg-gray-500/20 text-gray-300' };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.color}`}>{config.label}</span>;
};

const KaizenManager = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // 'active' or 'archived'

    useEffect(() => {
        const q = query(collection(db, 'kaizenSuggestions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSuggestions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSuggestions(fetchedSuggestions);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        const suggestionRef = doc(db, 'kaizenSuggestions', id);
        try {
            await updateDoc(suggestionRef, { status: newStatus });
            toast.success(`Suggestion status updated to "${newStatus}".`);
        } catch (error) {
            console.error("Error updating suggestion status:", error);
            toast.error("Failed to update status.");
        }
    };

    const filteredSuggestions = suggestions.filter(s => {
        if (filter === 'active') {
            return s.status !== 'implemented' && s.status !== 'rejected';
        }
        return s.status === 'implemented' || s.status === 'rejected';
    });

    if (loading) {
        return <p className="text-center text-gray-400">Loading Kaizen suggestions...</p>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lightbulb className="text-yellow-400" />
                    Continuous Improvement (Kaizen)
                </h3>
                <div className="flex gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <Button
                        size="sm"
                        variant={filter === 'active' ? 'primary' : 'secondary'}
                        onClick={() => setFilter('active')}
                    >
                        Active Suggestions
                    </Button>
                    <Button
                        size="sm"
                        variant={filter === 'archived' ? 'primary' : 'secondary'}
                        onClick={() => setFilter('archived')}
                    >
                        Archived
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {filteredSuggestions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No {filter} suggestions found.</p>
                ) : (
                    filteredSuggestions.map(suggestion => (
                        // --- MODIFICATION: Added border color for system-generated suggestions ---
                        <div key={suggestion.id} className={`bg-gray-900/50 p-4 rounded-lg border-l-4 ${suggestion.type === 'system_generated' ? 'border-purple-500' : 'border-transparent'}`}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-400">
                                        Suggestion for: <span className="font-semibold text-gray-300">{suggestion.partName}</span> ({suggestion.jobIdentifier})
                                    </p>
                                    <p className="text-white my-2 italic">"{suggestion.suggestionText}"</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                        {/* --- MODIFICATION: Show "Kaizen Autopilot" for system suggestions --- */}
                                        {suggestion.type === 'system_generated' ? (
                                            <><Cpu size={14} className="text-purple-400"/> {suggestion.submittedBy}</>
                                        ) : (
                                            <>Submitted by: {suggestion.submittedBy} on {suggestion.createdAt?.toDate().toLocaleDateString()}</>
                                        )}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 w-48">
                                    <StatusBadge status={suggestion.status} />
                                    <Dropdown
                                        value={suggestion.status}
                                        onChange={(e) => handleStatusChange(suggestion.id, e.target.value)}
                                        options={[
                                            { id: 'new', name: 'New' },
                                            { id: 'reviewing', name: 'Under Review' },
                                            { id: 'approved', name: 'Approved' },
                                            { id: 'implemented', name: 'Implemented' },
                                            { id: 'rejected', name: 'Rejected' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default KaizenManager;