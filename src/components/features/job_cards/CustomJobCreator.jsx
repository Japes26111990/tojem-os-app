// src/components/features/job_cards/CustomJobCreator.jsx (Upgraded with Category, VIN, and Standardized Printing)

import React, { useState, useEffect, useRef } from 'react';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import { 
    addJobCard, 
    getDepartments, 
    getEmployees, 
    getTools, 
    getToolAccessories, 
    getAllInventoryItems, 
    getDepartmentSkills, 
    listenToJobCards 
} from '../../../api/firestore';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import PrintConfirmationModal from './PrintConfirmationModal';
import QRCode from 'qrcode';

// Base64 encoded logo to ensure it prints correctly
const tojemLogoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA... (base64 string would be very long)"; // Replace with your actual full base64 string

const CustomJobCreator = ({ campaignId }) => {
    const [jobData, setJobData] = useState({
        jobName: '',
        departmentId: '',
        employeeId: '',
        quantity: 1,
        description: '',
        estimatedTime: '',
        steps: '',
        selectedTools: new Set(),
        selectedAccessories: new Set(),
        consumables: [],
        jobCategory: 'Production',
        requiresVin: false,
        vinNumber: '',
    });

    const [allPastJobs, setAllPastJobs] = useState([]);
    const [similarJobResults, setSimilarJobResults] = useState([]);
    const searchRef = useRef(null);
    
    const [allDepartments, setAllDepartments] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [allTools, setAllTools] = useState([]);
    const [allToolAccessories, setAllToolAccessories] = useState([]);
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [consumableSearchTerm, setConsumableSearchTerm] = useState('');
    const [filteredConsumableOptions, setFilteredConsumableOptions] = useState([]);
    const [selectedConsumableItem, setSelectedConsumableItem] = useState(null);
    const [consumableQuantity, setConsumableQuantity] = useState('');
    const consumableSearchRef = useRef(null);
    const [jobToConfirm, setJobToConfirm] = useState(null);

    const jobCategoryOptions = [
        { id: 'Production', name: 'Production' },
        { id: 'Development', name: 'Development' },
        { id: 'Maintenance', name: 'Maintenance' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [departments, employees, tools, toolAccessories, inventoryItems] = await Promise.all([
                    getDepartments(), getEmployees(), getTools(), getToolAccessories(), getAllInventoryItems()
                ]);
                setAllDepartments(departments);
                setAllEmployees(employees);
                setAllTools(tools);
                setAllToolAccessories(toolAccessories);
                setAllInventoryItems(inventoryItems);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load necessary data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        const unsubscribe = listenToJobCards(setAllPastJobs);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (jobData.jobName.length > 2) {
            const searchLower = jobData.jobName.toLowerCase();
            const results = allPastJobs
                .filter(job => job.partName && job.partName.toLowerCase().includes(searchLower))
                .slice(0, 5);
            setSimilarJobResults(results);
        } else {
            setSimilarJobResults([]);
        }
    }, [jobData.jobName, allPastJobs]);
    
    const handleSelectSimilarJob = (job) => {
        toast.success(`Loaded details from job: ${job.jobId}`);
        setJobData({
            ...jobData,
            jobName: job.partName,
            description: job.description,
            estimatedTime: job.estimatedTime,
            steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
            selectedTools: new Set(job.tools?.map(t => t.id) || []),
            selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
            consumables: job.processedConsumables || [],
        });
        setSimilarJobResults([]);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSimilarJobResults([]);
            }
            if (consumableSearchRef.current && !consumableSearchRef.current.contains(event.target)) {
                setFilteredConsumableOptions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setJobData(prev => ({ ...prev, [name]: val }));
    };

    const handleToolToggle = (toolId) => {
        setJobData(prev => {
            const newTools = new Set(prev.selectedTools);
            if (newTools.has(toolId)) {
                newTools.delete(toolId);
                const accessoriesOfTool = allToolAccessories.filter(a => a.toolId === toolId).map(a => a.id);
                const newAccessories = new Set(prev.selectedAccessories);
                accessoriesOfTool.forEach(accId => newAccessories.delete(accId));
                return { ...prev, selectedTools: newTools, selectedAccessories: newAccessories };
            } else {
                newTools.add(toolId);
                return { ...prev, selectedTools: newTools };
            }
        });
    };

    const handleAccessoryToggle = (accessoryId) => {
        setJobData(prev => {
            const newAccessories = new Set(prev.selectedAccessories);
            newAccessories.has(accessoryId) ? newAccessories.delete(accessoryId) : newAccessories.add(accessoryId);
            return { ...prev, selectedAccessories: newAccessories };
        });
    };

    const selectConsumableFromSearch = (item) => {
        setSelectedConsumableItem(item);
        setConsumableSearchTerm(item.name);
        setFilteredConsumableOptions([]);
    };

    const addConsumable = () => {
        if (!selectedConsumableItem || parseFloat(consumableQuantity) <= 0 || isNaN(parseFloat(consumableQuantity))) {
            toast.error("Please select a consumable and enter a valid quantity.");
            return;
        }
        const isDuplicate = jobData.consumables.some(c => c.id === selectedConsumableItem.id);
        if (isDuplicate) {
            toast.error("This consumable has already been added.");
            return;
        }
        setJobData(prev => ({
            ...prev,
            consumables: [...prev.consumables, {
                id: selectedConsumableItem.id,
                name: selectedConsumableItem.name,
                quantity: parseFloat(consumableQuantity),
                unit: selectedConsumableItem.unit || 'units',
                price: selectedConsumableItem.price || 0
            }]
        }));
        setSelectedConsumableItem(null);
        setConsumableQuantity('');
        setConsumableSearchTerm('');
        setFilteredConsumableOptions([]);
    };

    const removeConsumable = (indexToRemove) => {
        setJobData(prev => ({
            ...prev,
            consumables: prev.consumables.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!jobData.jobName.trim() || !jobData.departmentId || !jobData.description.trim() || !jobData.steps.trim()) {
            toast.error("Please fill in Job Name, Department, Description, and Steps.");
            return;
        }
        // --- ADDED: Time validation ---
        if (!jobData.estimatedTime || parseFloat(jobData.estimatedTime) <= 0) {
            toast.error("Please enter a valid estimated time for the job.");
            return;
        }
        if (jobData.requiresVin && !jobData.vinNumber.trim()) {
            return toast.error("A VIN number is required for this job.");
        }
        
        let departmentRequiredSkills = await getDepartmentSkills(jobData.departmentId);

        const newJobId = `CUSTOM-${Date.now()}`;
        const finalJobData = {
            jobId: newJobId,
            partName: jobData.jobName.trim(),
            departmentId: jobData.departmentId,
            departmentName: allDepartments.find(d => d.id === jobData.departmentId)?.name || 'Unknown',
            employeeId: jobData.employeeId || 'unassigned',
            employeeName: allEmployees.find(e => e.id === jobData.employeeId)?.name || 'Unassigned',
            quantity: Number(jobData.quantity) || 1,
            status: 'Pending',
            description: jobData.description.trim(),
            estimatedTime: parseFloat(jobData.estimatedTime) || 0,
            steps: jobData.steps.split('\n').filter(s => s.trim() !== ''),
            tools: Array.from(jobData.selectedTools).map(toolId => allTools.find(t => t.id === toolId)).filter(Boolean),
            accessories: Array.from(jobData.selectedAccessories).map(accId => allToolAccessories.find(a => a.id === accId)).filter(Boolean),
            processedConsumables: jobData.consumables,
            isCustomJob: true,
            campaignId: campaignId || null,
            requiredSkills: departmentRequiredSkills,
            jobCategory: jobData.jobCategory,
            vinNumber: jobData.requiresVin ? jobData.vinNumber.trim() : null,
        };
        
        setJobToConfirm(finalJobData);
    };

    const handleConfirmPrint = async () => {
        if (!jobToConfirm) return;

        try {
            await addJobCard(jobToConfirm);
            toast.success(`Custom Job Card ${jobToConfirm.jobId} created successfully!`);
            
            const qrCodeDataUrl = await QRCode.toDataURL(jobToConfirm.jobId, { width: 80 });
            
            // --- UPDATED: Using base64 logo ---
            const printContents = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <div>
                            <img src="${tojemLogoBase64}" alt="Company Logo" style="height: 50px; margin-bottom: 10px;"/>
                            <h1 style="font-size: 28px; font-weight: bold; margin: 0;">Job Card (Custom)</h1>
                            <p style="font-size: 14px; color: #666; margin: 0;">Part: <span style="font-weight: 600;">${jobToConfirm.partName} (x${jobToConfirm.quantity})</span></p>
                            <p style="font-size: 14px; color: #666; margin: 0;">Department: <span style="font-weight: 600;">${jobToConfirm.departmentName}</span></p>
                            ${jobToConfirm.vinNumber ? `<p style="font-size: 14px; color: #666; margin: 0;">VIN: <span style="font-weight: 600;">${jobToConfirm.vinNumber}</span></p>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <img src="${qrCodeDataUrl}" alt="QR Code" style="margin-bottom: 5px;"/>
                            <p style="font-size: 10px; color: #999; margin: 0;">${jobToConfirm.jobId}</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div style="font-size: 13px; line-height: 1.6;">
                            <p style="margin: 0;"><b>Employee:</b> ${jobToConfirm.employeeName}</p>
                            <p style="margin: 0;"><b>Est. Time:</b> ${jobToConfirm.estimatedTime || 'N/A'} mins</p>
                            <p style="margin: 0;"><b>Description:</b> ${jobToConfirm.description || 'No description.'}</p>
                        </div>
                        <div style="font-size: 13px; line-height: 1.6;">
                            <div>
                                <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Tools & Accessories</h3>
                                <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                                    ${jobToConfirm.tools?.length > 0 ? jobToConfirm.tools.map(tool => `<li>${tool.name}</li>`).join('') : '<li>No tools specified.</li>'}
                                    ${jobToConfirm.accessories?.length > 0 ? jobToConfirm.accessories.map(acc => `<li style="margin-left: 15px;">${acc.name}</li>`).join('') : ''}
                                </ul>
                            </div>
                            <div style="margin-top: 20px;">
                                <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Consumables</h3>
                                <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                                    ${jobToConfirm.processedConsumables?.length > 0 ? jobToConfirm.processedConsumables.map(c => `<li><span style="font-weight: 600;">${c.name}</span>: ${c.quantity} ${c.unit}</li>`).join('') : '<li>No consumables specified.</li>'}
                                </ul>
                            </div>
                        </div>
                    </div>
                     <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Steps</h3>
                        <ol style="list-style: decimal; padding-left: 20px; margin: 0;">
                            ${jobToConfirm.steps?.length > 0 ? jobToConfirm.steps.map(step => `<li>${step}</li>`).join('') : '<li>No steps defined.</li>'}
                        </ol>
                    </div>
                </div>
            `;
            
            const printWindow = window.open('', '_blank', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Custom Job Card ${jobToConfirm.jobId}</title></head><body>${printContents}</body></html>`);
                printWindow.document.close();
                printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
            } else {
                toast("The print window was blocked. Please allow popups.", { icon: 'ℹ️' });
            }

            setJobData({ jobName: '', departmentId: '', employeeId: '', quantity: 1, description: '', estimatedTime: '', steps: '', selectedTools: new Set(), selectedAccessories: new Set(), consumables: [], jobCategory: 'Production', requiresVin: false, vinNumber: '' });
            setSelectedConsumableItem(null);
            setConsumableQuantity('');
            setConsumableSearchTerm('');
            setFilteredConsumableOptions([]);
            setJobToConfirm(null);

        } catch (error) {
            console.error("Error creating custom job card:", error);
            toast.error("Failed to create custom job card.");
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading custom job form data...</p>;
    
    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold text-white mb-4">Create a One-Off / Custom Job Card</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative" ref={searchRef}>
                        <Input 
                            label="Job Name / Part Description" 
                            name="jobName" 
                            value={jobData.jobName} 
                            onChange={handleInputChange} 
                            placeholder="e.g., Repair Customer's Custom Bracket" 
                            autoComplete="off"
                        />
                        {similarJobResults.length > 0 && (
                            <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
                                {similarJobResults.map(job => (
                                    <li 
                                        key={job.id} 
                                        onClick={() => handleSelectSimilarJob(job)}
                                        className="p-3 hover:bg-blue-600 cursor-pointer"
                                    >
                                        <p className="font-semibold text-white">{job.partName}</p>
                                        <p className="text-xs text-gray-400">Job ID: {job.jobId}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Quantity" name="quantity" type="number" min="1" value={jobData.quantity} onChange={handleInputChange} />
                        <Dropdown label="Department" name="departmentId" value={jobData.departmentId} onChange={handleInputChange} options={allDepartments} placeholder="Select Department..." />
                        <Dropdown label="Job Category" name="jobCategory" value={jobData.jobCategory} onChange={handleInputChange} options={jobCategoryOptions} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <Dropdown label="Employee (Optional)" name="employeeId" value={jobData.employeeId} onChange={handleInputChange} options={allEmployees.filter(e => e.departmentId === jobData.departmentId)} placeholder="Select Employee..." />
                        <div className="flex items-center pt-6">
                            <input type="checkbox" id="requiresVin" name="requiresVin" checked={jobData.requiresVin} onChange={handleInputChange} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"/>
                            <label htmlFor="requiresVin" className="ml-2 text-sm font-medium text-gray-300">This job requires a VIN number</label>
                        </div>
                    </div>

                    {jobData.requiresVin && (
                        <div className="animate-fade-in">
                            <Input label="VIN Number" name="vinNumber" value={jobData.vinNumber} onChange={handleInputChange} placeholder="Enter Vehicle Identification Number..." />
                        </div>
                    )}

                    <Textarea label="Job Description" name="description" value={jobData.description} onChange={handleInputChange} placeholder="e.g., Weld crack in bracket and repaint" rows={3} />
                    
                    <Input label="Estimated Time (Minutes)" name="estimatedTime" type="number" min="1" value={jobData.estimatedTime} onChange={handleInputChange} placeholder="e.g., 90" />

                    <Textarea label="Steps (one per line)" name="steps" value={jobData.steps} onChange={handleInputChange} placeholder="1. Clean area&#10;2. Weld crack&#10;3. Sand smooth&#10;4. Paint" rows={5} />

                    <div>
                        <h4 className="font-semibold text-white mb-2">Required Tools & Accessories</h4>
                        <div className="max-h-60 overflow-y-auto space-y-3 p-4 bg-gray-900/50 rounded-lg">
                            {(allTools || []).map(tool => (
                                <div key={tool.id}>
                                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                                        <input type="checkbox" checked={jobData.selectedTools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                        <span>{tool.name}</span>
                                    </label>
                                    {jobData.selectedTools.has(tool.id) && (
                                        <div className="pl-6 mt-1 space-y-1 text-xs border-l-2 border-gray-700">
                                            {(allToolAccessories.filter(acc => acc.toolId === tool.id)).map(accessory => (
                                                <label key={accessory.id} className="flex items-center space-x-2 text-xs text-gray-300">
                                                    <input type="checkbox" checked={jobData.selectedAccessories.has(accessory.id)} onChange={() => handleAccessoryToggle(accessory.id)} className="h-3 w-3 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                    <span>{accessory.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-2">Required Consumables (Select from Inventory)</h4>
                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                            <div className="flex items-end gap-2" ref={consumableSearchRef}>
                                <div className="flex-grow relative">
                                    <Input
                                        label="Consumable Item"
                                        name="consumableSearch"
                                        value={consumableSearchTerm}
                                        onChange={(e) => {
                                            setConsumableSearchTerm(e.target.value);
                                            setSelectedConsumableItem(null);
                                        }}
                                        placeholder="Search by name or code..."
                                    />
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    {consumableSearchTerm.length > 0 && filteredConsumableOptions.length > 0 && (
                                        <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                            {filteredConsumableOptions.map(item => (
                                                <li
                                                    key={item.id}
                                                    className="p-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer"
                                                    onClick={() => selectConsumableFromSearch(item)}
                                                    >
                                                    {item.name} ({item.itemCode || 'N/A'}) - {item.unit} (R{item.price.toFixed(2)})
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="w-24">
                                    <Input
                                        label="Quantity"
                                        name="quantity"
                                        type="number"
                                        step="any"
                                        value={consumableQuantity}
                                        onChange={(e) => setConsumableQuantity(e.target.value)}
                                        placeholder="e.g., 0.5"
                                    />
                                </div>
                                <Button type="button" onClick={addConsumable} disabled={!selectedConsumableItem || parseFloat(consumableQuantity) <= 0 || isNaN(parseFloat(consumableQuantity))}>Add</Button>
                            </div>
                            <ul className="space-y-2 max-h-40 overflow-y-auto border-t border-gray-700 pt-3">
                                {jobData.consumables.length > 0 ? (
                                    jobData.consumables.map((c, index) => (
                                        <li key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm text-gray-200">
                                            <span>{c.name} : {c.quantity} {c.unit} (R{c.price.toFixed(2)})</span>
                                            <Button type="button" onClick={() => removeConsumable(index)} variant="danger" className="py-0.5 px-2 text-xs">X</Button>
                                        </li>
                                    ))
                                    ) : (
                                    <li className="text-gray-400 text-sm">No consumables added yet.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button type="submit" variant="primary">Create Custom Job Card</Button>
                    </div>
                </form>
            </div>
            
            {jobToConfirm && (
                <PrintConfirmationModal 
                    jobDetails={jobToConfirm}
                    onClose={() => setJobToConfirm(null)}
                    onConfirmPrint={handleConfirmPrint}
                />
            )}
        </>
    );
};

export default CustomJobCreator;
