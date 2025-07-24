import React, { useState, useEffect } from 'react';
import { listenToJobCards, listenToPurchaseQueue, collection, onSnapshot, query, where } from '../../../api/firestore';
import { db } from '../../../api/firebase';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Lightbulb, ShoppingCart, ArrowRight } from 'lucide-react';

// A reusable component for each quadrant in the matrix
const FocusQuadrant = ({ title, items, icon, color, emptyText, linkTo }) => (
    <div className={`bg-gray-900/50 p-4 rounded-lg border-l-4 ${color}`}>
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
            {icon}
            {title} ({items.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {items.length > 0 ? (
                items.map(item => (
                    <div key={item.id} className="bg-gray-800 p-2 rounded-md text-sm">
                        <p className="text-gray-200 font-medium truncate">{item.primaryText}</p>
                        <p className="text-xs text-gray-400">{item.secondaryText}</p>
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500 text-center py-4">{emptyText}</p>
            )}
        </div>
        <Link to={linkTo} className="text-xs text-blue-400 hover:underline mt-3 inline-flex items-center gap-1">
            Go to section <ArrowRight size={12} />
        </Link>
    </div>
);

// Main widget component
const ManagerFocusWidget = () => {
    const [urgentImportant, setUrgentImportant] = useState([]);
    const [importantNotUrgent, setImportantNotUrgent] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // Listener for Halted Jobs and long-waiting QC jobs (Urgent & Important)
        const unsubscribeJobs = listenToJobCards(allJobs => {
            const halted = allJobs
                .filter(j => j.status === 'Halted - Issue')
                .map(j => ({
                    id: j.id,
                    primaryText: j.partName,
                    secondaryText: `Halted: ${j.issueReason || 'No reason given'}`
                }));
            
            const oldQc = allJobs
                .filter(j => j.status === 'Awaiting QC' && j.completedAt?.toDate() < twoHoursAgo)
                .map(j => ({
                    id: j.id,
                    primaryText: j.partName,
                    secondaryText: `Awaiting QC for over 2 hours`
                }));

            setUrgentImportant([...halted, ...oldQc]);
        });

        // Listener for Kaizen Suggestions (Important & Not Urgent)
        const kaizenQuery = query(collection(db, 'kaizenSuggestions'), where('status', '==', 'new'));
        const unsubscribeKaizen = onSnapshot(kaizenQuery, snapshot => {
            const suggestions = snapshot.docs.map(doc => ({
                id: doc.id,
                primaryText: doc.data().partName,
                secondaryText: `Suggestion by ${doc.data().submittedBy}`
            }));
            // We will combine this with purchase queue items later
            setImportantNotUrgent(prev => [
                ...suggestions, 
                ...prev.filter(item => item.type !== 'kaizen') // Keep other types
            ].map(item => ({...item, type: 'kaizen'})));
        });

        // Listener for Purchase Queue (Important & Not Urgent)
        const unsubscribePurchase = listenToPurchaseQueue(items => {
            const purchaseItems = items
                .filter(i => i.status === 'pending')
                .map(i => ({
                    id: i.id,
                    primaryText: i.itemName,
                    secondaryText: 'Awaiting purchase order'
                }));
            
            setImportantNotUrgent(prev => [
                ...purchaseItems,
                ...prev.filter(item => item.type !== 'purchase') // Keep other types
            ].map(item => ({...item, type: 'purchase'})));
        });

        setLoading(false);

        return () => {
            unsubscribeJobs();
            unsubscribeKaizen();
            unsubscribePurchase();
        };
    }, []);

    if (loading) {
        return <p className="text-gray-400">Loading Manager's Focus...</p>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Manager's Focus</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FocusQuadrant
                    title="Urgent & Important"
                    items={urgentImportant}
                    icon={<AlertTriangle size={20} />}
                    color="border-red-500"
                    emptyText="No immediate crises."
                    linkTo="/issues"
                />
                <FocusQuadrant
                    title="Important, Not Urgent"
                    items={importantNotUrgent}
                    icon={<Clock size={20} />}
                    color="border-blue-500"
                    emptyText="No strategic items pending."
                    linkTo="/purchasing"
                />
                <div className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-yellow-500">
                     <h4 className="font-bold text-white mb-3 flex items-center gap-2"><Lightbulb size={20}/> Delegate or Minimize</h4>
                     <p className="text-sm text-gray-400">Review new job assignments, handle non-critical emails, and assess meeting invitations. Empower your team leads.</p>
                </div>
                 <div className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-gray-600">
                     <h4 className="font-bold text-white mb-3 flex items-center gap-2"><ShoppingCart size={20}/> Eliminate</h4>
                     <p className="text-sm text-gray-400">Identify and reduce time spent on low-value activities to free up capacity for strategic work.</p>
                </div>
            </div>
        </div>
    );
};

export default ManagerFocusWidget;
