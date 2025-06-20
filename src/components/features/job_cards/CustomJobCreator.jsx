import React, { useState, useEffect, useRef } from 'react';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Dropdown from '../../ui/Dropdown'; // Still used for Department/Employee
import Button from '../../ui/Button';
import { addJobCard, getDepartments, getEmployees, getTools, getToolAccessories, getAllInventoryItems } from '../../../api/firestore';
import { Search } from 'lucide-react'; // Import Search icon

const CustomJobCreator = () => {
    const [jobData, setJobData] = useState({
        jobName: '', // This will be the partName for custom jobs
        departmentId: '',
        employeeId: '',
        description: '',
        estimatedTime: '',
        steps: '', // Stored as a single string, split by newline
        selectedTools: new Set(),
        selectedAccessories: new Set(),
        consumables: [], // List of { id, name, quantity, unit, price } for custom jobs linked to inventory
    });

    const [allDepartments, setAllDepartments] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [allTools, setAllTools] = useState([]);
    const [allToolAccessories, setAllToolAccessories] = useState([]);
    const [allInventoryItems, setAllInventoryItems] = useState([]); // For consumables selection
    const [loading, setLoading] = useState(true);

    // State for the searchable consumable input
    const [consumableSearchTerm, setConsumableSearchTerm] = useState('');
    const [filteredConsumableOptions, setFilteredConsumableOptions] = useState([]);
    const [selectedConsumableItem, setSelectedConsumableItem] = useState(null); // Full item object
    const [consumableQuantity, setConsumableQuantity] = useState('');

    // Ref to handle clicks outside the search results
    const consumableSearchRef = useRef(null);

    // Ref to hold the dynamically generated Job Card Preview content for printing
    const customJobPreviewRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [departments, employees, tools, toolAccessories, inventoryItems] = await Promise.all([
                    getDepartments(),
                    getEmployees(),
                    getTools(),
                    getToolAccessories(),
                    getAllInventoryItems()
                ]);
                setAllDepartments(departments);
                setAllEmployees(employees);
                setAllTools(tools);
                setAllToolAccessories(toolAccessories);
                setAllInventoryItems(inventoryItems);
            } catch (error) {
                console.error("Error fetching data for custom job creator:", error);
                alert("Failed to load necessary data for custom job creation.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Effect for consumable search filtering
    useEffect(() => {
        if (consumableSearchTerm.length > 0) {
            const lowerCaseSearchTerm = consumableSearchTerm.toLowerCase();
            const filtered = allInventoryItems.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm))
            ).slice(0, 10); // Limit results for performance
            setFilteredConsumableOptions(filtered);
        } else {
            setFilteredConsumableOptions([]);
        }
    }, [consumableSearchTerm, allInventoryItems]);

    // Handle clicks outside the consumable search results to close them
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (consumableSearchRef.current && !consumableSearchRef.current.contains(event.target)) {
                setFilteredConsumableOptions([]); // Close the dropdown
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setJobData(prev => ({ ...prev, [name]: value }));
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

    // When a consumable item is selected from the search results
    const selectConsumableFromSearch = (item) => {
        setSelectedConsumableItem(item); // Store the full item object
        setConsumableSearchTerm(item.name); // Display the name in the search box
        setFilteredConsumableOptions([]); // Hide search results
    };

    // Adds the selected consumable to the list
    const addConsumable = () => {
        if (!selectedConsumableItem || parseFloat(consumableQuantity) <= 0 || isNaN(parseFloat(consumableQuantity))) {
            alert("Please select a consumable from the list and enter a valid quantity.");
            return;
        }

        // Check if consumable already exists in the list to prevent duplicates
        const isDuplicate = jobData.consumables.some(c => c.id === selectedConsumableItem.id);
        if (isDuplicate) {
            alert("This consumable has already been added. Please remove it first if you want to change its quantity.");
            return;
        }

        setJobData(prev => ({
            ...prev,
            // Add id for stock deduction, and name/unit/price for display/costing
            consumables: [...prev.consumables, {
                id: selectedConsumableItem.id, // Crucial for stock deduction
                name: selectedConsumableItem.name,
                quantity: parseFloat(consumableQuantity),
                unit: selectedConsumableItem.unit || 'units', // Use inventory item's unit or default
                price: selectedConsumableItem.price || 0 // Use inventory item's price
            }]
        }));
        // Reset consumable inputs after adding
        setSelectedConsumableItem(null);
        setConsumableQuantity('');
        setConsumableSearchTerm('');
        setFilteredConsumableOptions([]);
    };

    // Removes a consumable from the list
    const removeConsumable = (indexToRemove) => {
        setJobData(prev => ({
            ...prev,
            consumables: prev.consumables.filter((_, index) => index !== indexToRemove)
        }));
    };

    // Handles the form submission for creating the custom job card
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation for essential fields
        if (!jobData.jobName.trim()) { alert("Please enter a Job Name / Part Description."); return; }
        if (!jobData.departmentId) { alert("Please select a Department."); return; }
        if (!jobData.description.trim()) { alert("Please enter a Job Description."); return; }
        if (!jobData.steps.trim()) { alert("Please enter the Job Steps."); return; }
        
        // Prepare data for Firestore
        const newJobId = `CUSTOM-${Date.now()}`;
        const finalJobData = {
            jobId: newJobId, // Unique ID for custom jobs
            partName: jobData.jobName.trim(), // Use jobName as partName for custom jobs
            departmentId: jobData.departmentId,
            departmentName: allDepartments.find(d => d.id === jobData.departmentId)?.name || 'Unknown Department',
            employeeId: jobData.employeeId || 'unassigned', // Allow unassigned, but record 'unassigned' string
            employeeName: allEmployees.find(e => e.id === jobData.employeeId)?.name || 'Unassigned',
            status: 'Pending', // Initial status for all new jobs
            description: jobData.description.trim(),
            estimatedTime: parseFloat(jobData.estimatedTime) || 0,
            steps: jobData.steps.split('\n').filter(s => s.trim() !== ''), // Split steps by new line
            // Convert Sets of IDs to arrays of full tool/accessory objects for job card data
            tools: Array.from(jobData.selectedTools).map(toolId => allTools.find(t => t.id === toolId)).filter(Boolean),
            accessories: Array.from(jobData.selectedAccessories).map(accId => allToolAccessories.find(a => a.id === accId)).filter(Boolean),
            processedConsumables: jobData.consumables, // Consumables with linked IDs, quantities, and prices
            isCustomJob: true, // Flag this job as custom for future filtering/logic
        };

        try {
            await addJobCard(finalJobData);
            alert(`Custom Job Card ${finalJobData.jobId} created successfully!`);

            // --- Print Logic for Custom Job Card ---
            // Construct the HTML for the job card preview dynamically
            const departmentName = allDepartments.find(d => d.id === jobData.departmentId)?.name || 'Unknown Department';
            const employeeName = allEmployees.find(e => e.id === jobData.employeeId)?.name || 'Unassigned';

            const printContents = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <div>
                            <h1 style="font-size: 28px; font-weight: bold; margin: 0;">Job Card</h1>
                            <p style="font-size: 14px; color: #666; margin: 0;">Part: <span style="font-weight: 600;">${finalJobData.partName}</span></p>
                            <p style="font-size: 14px; color: #666; margin: 0;">Department: <span style="font-weight: 600;">${departmentName}</span></p>
                        </div>
                        <div style="text-align: right;">
                           <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(newJobId)}&size=80x80" alt="QR Code" style="margin-bottom: 5px;"/>
                           <p style="font-size: 10px; color: #999; margin: 0;">${newJobId}</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                            <div style="border-radius: 8px; width: 100%; height: 200px; margin-bottom: 15px; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #aaa; border: 1px solid #ddd;">
                                <span>No Image Available</span>
                            </div>
                            <div style="font-size: 13px; line-height: 1.6;">
                                <p style="margin: 0;"><b>Employee:</b> ${employeeName}</p>
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
                                    ${finalJobData.processedConsumables?.length > 0 ? finalJobData.processedConsumables.map(c => `<li><span style="font-weight: 600;">${c.name}</span>: ${c.quantity} ${c.unit} (R${c.price.toFixed(2)})</li>`).join('') : '<li>No consumables required.</li>'}
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
            printWindow.document.write(`
                <html>
                <head>
                    <title>Custom Job Card ${newJobId}</title>
                    <style>
                        /* Basic print styles to make it look decent */
                        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                        h1, h3 { color: #333; }
                        p, li { color: #555; }
                        @media print {
                            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                            button { display: none; /* Hide print button when printing */ }
                        }
                    </style>
                </head>
                <body>
                    ${printContents}
                    <div style="margin-top: 20px; text-align: center;">
                        <button onclick="window.print()" style="padding: 10px 20px; background-color: #3b82f6; color: white; border-radius: 8px; border: none; cursor: pointer;">Print This Job Card</button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            // Wait for the window content to load before attempting to print automatically
            printWindow.onload = () => {
                setTimeout(() => printWindow.print(), 500); // Attempt auto-print after a short delay
            };
            // --- End Print Logic ---

            // Reset form fields after successful creation
            setJobData({
                jobName: '',
                departmentId: '',
                employeeId: '',
                description: '',
                estimatedTime: '',
                steps: '',
                selectedTools: new Set(),
                selectedAccessories: new Set(),
                consumables: [],
            });
            setSelectedConsumableItem(null);
            setConsumableQuantity('');
            setConsumableSearchTerm('');
            setFilteredConsumableOptions([]);

        } catch (error) {
            console.error("Error creating custom job card:", error);
            alert("Failed to create custom job card.");
        }
    };

    // Display loading message while data is being fetched
    if (loading) return <p className="text-center text-gray-400">Loading custom job form data...</p>;

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Create a One-Off / Custom Job Card</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Job Name / Part Description" name="jobName" value={jobData.jobName} onChange={handleInputChange} placeholder="e.g., Repair Customer's Custom Bracket" />
                <Dropdown label="Department" name="departmentId" value={jobData.departmentId} onChange={handleInputChange} options={allDepartments} placeholder="Select Department" />
                <Dropdown label="Employee (Optional)" name="employeeId" value={jobData.employeeId} onChange={handleInputChange} options={allEmployees} placeholder="Select Employee..." />
                <Textarea label="Job Description" name="description" value={jobData.description} onChange={handleInputChange} placeholder="e.g., Weld crack in bracket and repaint" rows={3} />
                <Input label="Estimated Time (minutes)" name="estimatedTime" type="number" value={jobData.estimatedTime} onChange={handleInputChange} placeholder="e.g., 90" />
                <Textarea label="Steps (one per line)" name="steps" value={jobData.steps} onChange={handleInputChange} placeholder="1. Clean area&#10;2. Weld crack&#10;3. Sand smooth&#10;4. Paint" rows={5} />

                {/* Tools & Accessories Selection */}
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

                {/* Consumables Input - Now a searchable dropdown linked to inventory */}
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
                                        setSelectedConsumableItem(null); // Clear selected item if typing
                                    }}
                                    placeholder="Search by name or code..."
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                {/* Search Results */}
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
    );
};

export default CustomJobCreator;