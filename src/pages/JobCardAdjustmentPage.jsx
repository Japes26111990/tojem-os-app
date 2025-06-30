// src/pages/JobCardAdjustmentPage.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getJobsAwaitingQC, updateJobCardWithAdjustments, getAllInventoryItems } from '../api/firestore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Textarea from '../components/ui/Textarea';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const JobCardAdjustmentPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [jobsAwaitingQC, setJobsAwaitingQC] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [selectedJob, setSelectedJob] = useState(null);
    const [timeAdjustment, setTimeAdjustment] = useState(0);
    const [consumableAdjustments, setConsumableAdjustments] = useState({});
    const [newConsumable, setNewConsumable] = useState({ itemId: '', qtyChange: 0 });
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchQCJobs = async () => {
            setLoading(true);
            try {
                const qcJobs = await getJobsAwaitingQC();
                setJobsAwaitingQC(qcJobs);
            } catch (error) {
                toast.error("Failed to load completed jobs.");
                console.error(error);
            }
            setLoading(false);
        };

        fetchQCJobs();

        const fetchInventory = async () => {
            const inventory = await getAllInventoryItems();
            setAllInventoryItems(inventory);
        };
        fetchInventory();
    }, []);

    useEffect(() => {
        if (selectedJobId && jobsAwaitingQC.length > 0) {
            const job = jobsAwaitingQC.find(j => j.id === selectedJobId);
            setSelectedJob(job);
        } else {
            setSelectedJob(null);
            setTimeAdjustment(0);
            setConsumableAdjustments({});
            setAdjustmentReason('');
        }
    }, [selectedJobId, jobsAwaitingQC]);

    const handleTimeAdjustmentChange = (e) => setTimeAdjustment(parseInt(e.target.value) || 0);
    const handleReasonChange = (e) => setAdjustmentReason(e.target.value);
    const handleSelectJob = (e) => setSelectedJobId(e.target.value);

    const handleQtyChange = (consumableId, e) => {
        setConsumableAdjustments(prev => ({
            ...prev,
            [consumableId]: parseInt(e.target.value) || 0,
        }));
    };

    const handleNewConsumableItemChange = (e) => {
        setNewConsumable(prev => ({ ...prev, itemId: e.target.value }));
    };

    const handleNewConsumableQtyChange = (e) => {
        setNewConsumable(prev => ({ ...prev, qtyChange: parseInt(e.target.value) || 0 }));
    };

    const handleAddConsumable = () => {
        if (newConsumable.itemId && newConsumable.qtyChange !== 0) {
            setConsumableAdjustments(prev => ({
                ...prev,
                [newConsumable.itemId]: (prev[newConsumable.itemId] || 0) + newConsumable.qtyChange,
            }));
            setNewConsumable({ itemId: '', qtyChange: 0 });
        }
    };

    const handleSubmit = async () => {
        if (!selectedJobId) {
            toast.error('Please select a job to adjust.'); // --- REPLACE ALERT ---
            return;
        }
        if (!adjustmentReason.trim()) {
            toast.error('Please provide a reason for the adjustment.'); // --- REPLACE ALERT ---
            return;
        }

        setIsSubmitting(true);
        try {
            await updateJobCardWithAdjustments(selectedJobId, timeAdjustment, consumableAdjustments, adjustmentReason, user.uid);
            toast.success('Job card adjustments submitted successfully!'); // --- REPLACE ALERT ---
            setSelectedJobId('');
        } catch (error) {
            console.error('Error submitting job card adjustments:', error);
            toast.error('Failed to submit job card adjustments.'); // --- REPLACE ALERT ---
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <Button onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2" /> Back
            </Button>
            <h2 className="text-2xl font-bold text-white mb-4">Job Card Adjustment</h2>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4 max-w-xl">
                <Dropdown
                    label="Select Completed Job Card"
                    name="jobId"
                    value={selectedJobId}
                    onChange={handleSelectJob}
                    options={jobsAwaitingQC.map(job => ({ id: job.id, name: `${job.partName} (${job.jobId.substring(0, 8)})` }))}
                    placeholder="Select a job..."
                />

                {selectedJob && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-300">Original Estimated Time: {selectedJob.estimatedTime} minutes</p>
                            <Input label="Adjust Time (minutes to add/subtract)" type="number" value={timeAdjustment} onChange={handleTimeAdjustmentChange} />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Adjust Consumables</h3>
                            {selectedJob.processedConsumables && selectedJob.processedConsumables.map(consumable => (
                                <div key={consumable.id} className="flex items-center space-x-2 mb-2">
                                    <p className="text-gray-300 flex-grow">{consumable.name} (Used: {consumable.quantity})</p>
                                    <div className="w-48">
                                        <Input
                                            type="number"
                                            label={`Qty Change`}
                                            onChange={(e) => handleQtyChange(consumable.id, e)}
                                            placeholder="e.g., -1 or 2"
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-end space-x-2 border-t border-gray-700 pt-4 mt-4">
                                <div className="flex-grow">
                                    <Dropdown
                                        label="Add New Consumable"
                                        name="newConsumableItem"
                                        value={newConsumable.itemId}
                                        onChange={handleNewConsumableItemChange}
                                        options={allInventoryItems.map(item => ({ id: item.id, name: item.name }))}
                                        placeholder="Select consumable..."
                                    />
                                </div>
                                <div className="w-32">
                                    <Input
                                        type="number"
                                        label="Qty"
                                        value={newConsumable.qtyChange}
                                        onChange={handleNewConsumableQtyChange}
                                        placeholder="e.g., 1"
                                    />
                                </div>
                                <Button onClick={handleAddConsumable}>Add</Button>
                            </div>
                        </div>

                        <Textarea label="Reason for Adjustment" value={adjustmentReason} onChange={handleReasonChange} rows={4} />

                        <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Adjustment'}
                        </Button>
                    </div>
                )}

                {!selectedJob && !loading && (
                    <p className="text-gray-400">Select a completed job card to view and adjust its details.</p>
                )}
                 {loading && (
                    <p className="text-gray-400">Loading completed jobs...</p>
                )}
            </div>
        </div>
    );
};

export default JobCardAdjustmentPage;
