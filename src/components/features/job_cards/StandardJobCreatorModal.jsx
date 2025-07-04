// src/components/features/job_cards/StandardJobCreatorModal.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { getDepartments, getEmployees, addJobCard, getRecipeForProductDepartment, getProducts, getAllInventoryItems, getTools, getToolAccessories } from '../../../api/firestore';
import { processConsumables } from '../../../utils/jobUtils';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import { X, Package } from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const StandardJobCreatorModal = ({ salesOrder, lineItem, onClose }) => {
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allInventory, setAllInventory] = useState([]);
    const [allTools, setAllTools] = useState([]);
    const [allAccessories, setAllAccessories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({ departmentId: '', employeeId: '' });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [depts, emps, prods, inventory, tools, accessories] = await Promise.all([
                    getDepartments(), 
                    getEmployees(), 
                    getProducts(),
                    getAllInventoryItems(),
                    getTools(),
                    getToolAccessories()
                ]);
                setDepartments(depts);
                setEmployees(emps);
                setAllProducts(prods);
                setAllInventory(inventory);
                setAllTools(tools);
                setAllAccessories(accessories);
            } catch (error) {
                toast.error("Failed to load necessary data for job creation."); // --- REPLACE ALERT ---
                console.error(error);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleSelectionChange = (e) => {
        const { name, value } = e.target;
        setSelection(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async () => {
        if (!selection.departmentId) {
            return toast.error("Please select a department."); // --- REPLACE ALERT ---
        }
        
        const product = allProducts.find(p => p.id === lineItem.productId);
        if (!product) {
            return toast.error("Could not find the product details for this line item."); // --- REPLACE ALERT ---
        }
        
        const recipe = await getRecipeForProductDepartment(lineItem.productId, selection.departmentId);
        if (!recipe) {
            return toast.error(`No recipe found for "${product.name}" in the selected department. Please define one in Settings first.`); // --- REPLACE ALERT ---
        }
        
        const department = departments.find(d => d.id === selection.departmentId);
        const employee = employees.find(e => e.id === selection.employeeId);
        const newJobId = `JOB-${Date.now()}`;

        const toolsForJobCard = allTools.filter(t => (recipe.tools || []).includes(t.id));
        const accessoriesForJobCard = allAccessories.filter(a => (recipe.accessories || []).includes(a.id));
        const processedConsumables = processConsumables(recipe.consumables, allInventory, 20);

        const finalJobData = {
            jobId: newJobId,
            partName: product.name,
            partId: product.id,
            departmentId: selection.departmentId,
            departmentName: department?.name || 'Unknown',
            employeeId: selection.employeeId || 'unassigned',
            employeeName: employee?.name || 'Unassigned',
            status: 'Pending',
            description: recipe.description,
            estimatedTime: recipe.estimatedTime,
            steps: recipe.steps.map(s => s.text || s),
            tools: toolsForJobCard,
            accessories: accessoriesForJobCard,
            consumables: recipe.consumables,
            processedConsumables: processedConsumables,
            isCustomJob: false,
            salesOrderId: salesOrder.id,
            requiredSkills: recipe.requiredSkills || [],
        };
        
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(newJobId, { width: 80 });

            await addJobCard(finalJobData);
            toast.success(`Job card created successfully for ${product.name}!`); // --- REPLACE ALERT ---
            
            const imageSection = product.photoUrl
                ? `<img src="${product.photoUrl}" alt="${product.name}" style="width: 100%; height: 200px; border-radius: 8px; object-fit: cover; margin-bottom: 15px; border: 1px solid #ddd;" />`
                : `<div style="border-radius: 8px; width: 100%; height: 200px; margin-bottom: 15px; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #aaa; border: 1px solid #ddd;"><span>No Image Available</span></div>`;

            const printContents = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <div>
                            <h1 style="font-size: 28px; font-weight: bold; margin: 0;">Job Card</h1>
                            <p style="font-size: 14px; color: #666; margin: 0;">Part: <span style="font-weight: 600;">${finalJobData.partName}</span></p>
                            <p style="font-size: 14px; color: #666; margin: 0;">Department: <span style="font-weight: 600;">${finalJobData.departmentName}</span></p>
                        </div>
                        <div style="text-align: right;">
                            <img src="${qrCodeDataUrl}" alt="QR Code" style="margin-bottom: 5px;"/>
                            <p style="font-size: 10px; color: #999; margin: 0;">${newJobId}</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                            ${imageSection}
                            <div style="font-size: 13px; line-height: 1.6;">
                                <p style="margin: 0;"><b>Employee:</b> ${finalJobData.employeeName}</p>
                                <p style="margin: 0;"><b>Est. Time:</b> ${finalJobData.estimatedTime || 'N/A'} mins</p>
                                <p style="margin: 0;"><b>Description:</b> ${finalJobData.description || 'No description.'}</p>
                            </div>
                        </div>
                        <div style="font-size: 13px; line-height: 1.6;">
                            <div>
                                <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Tools & Accessories</h3>
                                <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                                    ${finalJobData.tools?.length > 0 ? finalJobData.tools.map(tool => `<li>${tool.name}</li>`).join('') : '<li>No tools required.</li>'}
                                    ${finalJobData.accessories?.length > 0 ? finalJobData.accessories.map(acc => `<li style="margin-left: 15px;">${acc.name}</li>`).join('') : ''}
                                </ul>
                            </div>
                            <div style="margin-top: 20px;">
                                <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Consumables</h3>
                                <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                                    ${finalJobData.processedConsumables?.length > 0 ? finalJobData.processedConsumables.map(c => `<li><span style="font-weight: 600;">${c.name}</span>: ${c.quantity.toFixed(2)} ${c.unit}</li>`).join('') : '<li>No consumables required.</li>'}
                                </ul>
                            </div>
                        </div>
                    </div>
                     <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Steps</h3>
                        <ol style="list-style: decimal; padding-left: 20px; margin: 0;">
                            ${finalJobData.steps?.length > 0 ? finalJobData.steps.map(step => `<li>${step}</li>`).join('') : '<li>No steps defined.</li>'}
                        </ol>
                    </div>
                </div>
            `;
            
            const printWindow = window.open('', '_blank', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Job Card ${newJobId}</title></head><body>${printContents}</body></html>`);
                printWindow.document.close();
                printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
            }

            onClose();
        } catch (error) {
            console.error("Error creating job card:", error);
            toast.error("Failed to create job card."); // --- REPLACE ALERT ---
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                 <div className="relative bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg">
                    <p className="text-center text-white">Loading data...</p>
                 </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-lg">
                <Button onClick={onClose} variant="danger" className="absolute -top-3 -right-3 z-10 rounded-full h-8 w-8 p-1">
                    <X size={16}/>
                </Button>
                
                <div className="flex items-center gap-3 mb-4">
                    <Package size={24} className="text-blue-400" />
                    <div>
                        <h3 className="text-xl font-bold text-white">Create Standard Job</h3>
                        <p className="text-gray-300">For Product: {lineItem.description}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <Dropdown
                        label="Assign to Department"
                        name="departmentId"
                        value={selection.departmentId}
                        onChange={handleSelectionChange}
                        options={departments}
                        placeholder="Select a department..."
                    />
                    <Dropdown
                        label="Assign to Employee (Optional)"
                        name="employeeId"
                        value={selection.employeeId}
                        onChange={handleSelectionChange}
                        options={employees.filter(e => e.departmentId === selection.departmentId)}
                        placeholder="Select an employee..."
                        disabled={!selection.departmentId}
                    />
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSubmit} variant="primary">Generate Job Card & Print</Button>
                </div>
            </div>
        </div>
    );
};

export default StandardJobCreatorModal;