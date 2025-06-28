// C:\Development\TOJEM-OS\tojem-os\src\pages\JobCardAdjustmentPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getJobsAwaitingQC, updateJobCardWithAdjustments, getAllInventoryItems } from '../api/firestore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import Textarea from '../components/ui/Textarea';
import { ArrowLeft } from 'lucide-react';

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
            const qcJobs = await getJobsAwaitingQC();
            setJobsAwaitingQC(qcJobs);
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
            alert('Please select a job to adjust.');
            return;
        }
        if (!adjustmentReason.trim()) {
            alert('Please provide a reason for the adjustment.');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateJobCardWithAdjustments(selectedJobId, timeAdjustment, consumableAdjustments, adjustmentReason, user.uid);
            alert('Job card adjustments submitted successfully!');
            setSelectedJobId('');
        } catch (error) {
            console.error('Error submitting job card adjustments:', error);
            alert('Failed to submit job card adjustments.');
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
                            <p className="text-gray-300">Current Actual Time: {/* Display initial or logged time here */} </p>
                            <Input label="Adjust Time (minutes to add/subtract)" type="number" value={timeAdjustment} onChange={handleTimeAdjustmentChange} />
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Adjust Consumables</h3>
                            {selectedJob.consumablesUsedInitial && Object.keys(selectedJob.consumablesUsedInitial).map(consumableId => (
                                <div key={consumableId} className="flex items-center space-x-2">
                                    <p className="text-gray-300">{/* Display consumable name */} ({consumableId})</p>
                                    <Input
                                        type="number"
                                        label={`Qty Change`}
                                        onChange={(e) => handleQtyChange(consumableId, e)}
                                    />
                                </div>
                            ))}
                            <div className="flex items-center space-x-2">
                                <Dropdown
                                    label="Add New Consumable"
                                    name="newConsumableItem"
                                    value={newConsumable.itemId}
                                    onChange={handleNewConsumableItemChange}
                                    options={allInventoryItems.map(item => ({ id: item.id, name: item.name }))}
                                    placeholder="Select consumable..."
                                />
                                <Input
                                    type="number"
                                    label="Qty Change"
                                    value={newConsumable.qtyChange}
                                    onChange={handleNewConsumableQtyChange}
                                />
                                <Button onClick={handleAddConsumable}>Add</Button>
                            </div>
                        </div>

                        <Textarea label="Reason for Adjustment" value={adjustmentReason} onChange={handleReasonChange} rows={4} />

                        <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Adjustment'}
                        </Button>
                    </div>
                )}

                {!selectedJob && (
                    <p className="text-gray-400">Select a completed job card to view and adjust its details.</p>
                )}
            </div>
        </div>
    );
};

// Placeholder function - you'll need to implement this in your firestore.js or a cloud function
// REMOVE THESE LINES:
// const getJobsAwaitingQC = async () => {
//     // Replace this with your actual Firestore query
//     return [];
// };
//
// // Placeholder function - you'll need to implement this in your firestore.js or a cloud function
// const updateJobCardWithAdjustments = async (jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId) => {
//     // Implement your Firestore update logic here
//     console.log('Submitting adjustments:', jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId);
// };
//
// // Placeholder function - you'll need to implement this in your firestore.js or a cloud function
// const getAllInventoryItems = async () => {
//     // Replace this with your actual Firestore query to get all inventory items
//     return [];
// };

export default JobCardAdjustmentPage;