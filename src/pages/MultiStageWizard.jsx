// src/pages/MultiStageWizard.jsx

import React, { useEffect, useState } from 'react';
import { getProducts, getDepartments, addJobCard } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react'; // <-- ADD THIS IMPORT

const MultiStageWizard = () => {
    const [products, setProducts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [workflow, setWorkflow] = useState([]);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        getProducts().then(setProducts);
        getDepartments().then(setDepartments);
    }, []);

    const addStage = () => {
        // Add a department to the workflow
        setWorkflow([...workflow, { departmentId: '' }]);
    };

    const updateStage = (index, departmentId) => {
        const updated = [...workflow];
        updated[index] = { departmentId };
        setWorkflow(updated);
    };

    const removeStage = (index) => {
        const updated = workflow.filter((_, i) => i !== index);
        setWorkflow(updated);
    };

    const submitMultiJob = async () => {
        if (!selectedProductId || workflow.length === 0) {
            return toast.error('Please select a product and add at least one stage.');
        }

        const selectedProduct = products.find(p => p.id === selectedProductId);
        if (!selectedProduct) {
            return toast.error('Selected product could not be found.');
        }

        setCreating(true);
        const parentJobId = `ROUTED-${Date.now()}`;

        try {
            for (let i = 0; i < workflow.length; i++) {
                const stage = workflow[i];
                if (!stage.departmentId) {
                    toast.error(`Stage ${i + 1} is missing a department.`);
                    continue; // Skip this stage if no department is selected
                }
                const department = departments.find(d => d.id === stage.departmentId);

                await addJobCard({
                    jobId: `${parentJobId}-${i + 1}`,
                    partId: selectedProduct.id,
                    partName: selectedProduct.name,
                    quantity: Number(quantity),
                    departmentId: stage.departmentId,
                    departmentName: department?.name || 'Unknown',
                    employeeId: 'unassigned',
                    employeeName: 'Unassigned',
                    status: 'Pending',
                    description: `Stage ${i + 1} of ${workflow.length} for ${selectedProduct.name}`,
                    isCustomJob: false,
                    parentJobId: parentJobId,
                });
            }

            toast.success(`Successfully created ${workflow.length} staged jobs for ${selectedProduct.name}.`);
            setWorkflow([]);
            setSelectedProductId('');
            setQuantity(1);

        } catch (err) {
            console.error(err);
            toast.error('Failed to create multi-stage job.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-6 text-white max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Multi-Stage Job Wizard</h1>
            <p className="text-gray-400 mb-6">Create a sequence of jobs for a single product that must pass through multiple departments.</p>

            <div className="space-y-6 bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <Dropdown
                            label="Product"
                            options={products}
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            placeholder="Select a product..."
                        />
                    </div>
                    <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                    />
                </div>

                <div className="border-t border-gray-700 pt-4">
                    <h3 className="font-semibold text-lg text-white mb-2">Production Workflow (in order)</h3>
                    <div className="space-y-4">
                        {workflow.map((stage, index) => (
                            <div key={index} className="flex items-end gap-3 bg-gray-900/50 p-3 rounded-lg">
                                <span className="font-bold text-gray-500">{index + 1}.</span>
                                <div className="flex-grow">
                                    <Dropdown
                                        label={`Stage ${index + 1} Department`}
                                        options={departments}
                                        value={stage.departmentId}
                                        onChange={(e) => updateStage(index, e.target.value)}
                                        placeholder="Select department..."
                                    />
                                </div>
                                <Button onClick={() => removeStage(index)} variant="danger" className="p-2 h-12 w-12">
                                    <Trash2 size={18}/>
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button onClick={addStage} variant="secondary" className="mt-4">
                        Add Stage
                    </Button>
                </div>

                <div className="text-right border-t border-gray-700 pt-4">
                    <Button onClick={submitMultiJob} disabled={creating || workflow.length === 0} variant="primary">
                        {creating ? 'Creating Jobs...' : `Create ${workflow.length}-Stage Job`}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MultiStageWizard;