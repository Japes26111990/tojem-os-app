// src/components/features/settings/ReworkReasonsManager.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReworkReasonsManager = () => {
    const [reasons, setReasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [reasonName, setReasonName] = useState('');

    const reasonsCollection = collection(db, 'reworkReasons');

    const fetchData = async () => {
        setLoading(true);
        const q = query(reasonsCollection, orderBy('name'));
        const snapshot = await getDocs(q);
        setReasons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!reasonName.trim()) return toast.error("Reason name is required.");

        try {
            if (editingId) {
                await updateDoc(doc(db, 'reworkReasons', editingId), { name: reasonName.trim() });
                toast.success("Reason updated.");
            } else {
                await addDoc(reasonsCollection, { name: reasonName.trim() });
                toast.success("Reason added.");
            }
            setReasonName('');
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving rework reason:", error);
            toast.error("Failed to save rework reason.");
        }
    };

    const handleEdit = (reason) => {
        setEditingId(reason.id);
        setReasonName(reason.name);
    };

    const handleDelete = (id) => {
        toast((t) => (
            <span>
                Delete this reason?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteDoc(doc(db, 'reworkReasons', id))
                        .then(() => {
                            toast.success("Reason deleted.");
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to delete reason.");
                            console.error(err);
                        });
                    toast.dismiss(t.id);
                }}>
                    Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: 'âš ï¸ ' });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Rework Reasons</h3>
            <p className="text-sm text-gray-400 mb-4">Define the standard failure modes for Quality Control checks. This will power your rework analysis dashboards.</p>
            <form onSubmit={handleAddOrUpdate} className="flex items-center space-x-4 mb-6">
                <Input
                    name="reasonName"
                    value={reasonName}
                    onChange={(e) => setReasonName(e.target.value)}
                    placeholder={editingId ? "Edit reason..." : "New reason (e.g., Poor Surface Finish)"}
                    className="flex-grow"
                />
                {editingId && (<Button type="button" variant="secondary" onClick={() => { setEditingId(null); setReasonName(''); }}>Cancel</Button>)}
                <Button type="submit" variant="primary">
                    {editingId ? <><Edit size={16} className="mr-2"/>Update</> : <><PlusCircle size={16} className="mr-2"/>Add Reason</>}
                </Button>
            </form>
            <div className="space-y-3">
                {loading ? <p>Loading...</p> : reasons.map(reason => (
                    <div key={reason.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        <p className="text-gray-200">{reason.name}</p>
                        <div className="flex space-x-2">
                            <Button onClick={() => handleEdit(reason)} variant="secondary" size="sm" className="py-1 px-2 text-xs">Edit</Button>
                            <Button onClick={() => handleDelete(reason.id)} variant="danger" size="sm" className="py-1 px-2 text-xs">Delete</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReworkReasonsManager;