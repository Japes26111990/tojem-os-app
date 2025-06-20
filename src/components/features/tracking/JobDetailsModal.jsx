import React, { useState, useEffect, useMemo, useRef } from 'react'; // Added useMemo
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Dropdown from '../../ui/Dropdown';
import { Search, X, CheckCircle2, DollarSign, Clock, Zap, Edit, Trash2, Save, XCircle } from 'lucide-react';

// Utility to process consumables (copied from JobCardCreator for consistency within this modal)
// It's important to keep this utility here if you want to display processed consumables in the modal
// or recalculate them if estimatedTime changes (though not implemented here for brevity of first edit)
const processConsumablesForModal = (consumablesFromRecipe, allConsumablesList, temp) => {
    if (!consumablesFromRecipe) return [];

    const processedList = [];
    const CATALYST_RULES = [
        { temp_max: 18, percentage: 3.0 },
        { temp_max: 28, percentage: 2.0 },
        { temp_max: 100, percentage: 1.0 }
    ];

    const catalystItem = allConsumablesList.find(c => c.name.toLowerCase().includes('catalyst') || c.name.toLowerCase().includes('hardener'));

    for (const consumable of consumablesFromRecipe) {
        const masterItem = allConsumablesList.find(c => c.id === consumable.itemId);
        const itemDetails = masterItem || consumable; // Fallback to consumable itself if not found in master list
        if (!itemDetails) continue;

        if (consumable.type === 'fixed') {
            processedList.push({ ...itemDetails, quantity: consumable.quantity, notes: '' });
            if (itemDetails.requiresCatalyst && catalystItem) {
                let percentage = 0;
                for(const rule of CATALYST_RULES) {
                    if (temp <= rule.temp_max) {
                        percentage = rule.percentage;
                        break;
                    }
                }
                if (percentage > 0) {
                    const calculatedQty = consumable.quantity * (percentage / 100);
                    processedList.push({ ...catalystItem, quantity: calculatedQty, notes: `(Auto-added at ${percentage}% for ${temp}°C)` });
                }
            }
        } else if (consumable.type === 'dimensional') {
            processedList.push({ ...itemDetails, cuts: consumable.cuts, notes: `See ${consumable.cuts.length} cutting instruction(s)` });
        }
    }
    return processedList;
};


// Helper component for Consumable editing within the modal
const ConsumableEditorInModal = ({ allConsumables, selectedConsumables, onAdd, onRemove }) => {
    const [consumableType, setConsumableType] = useState('fixed');
    const [fixedSearchTerm, setFixedSearchTerm] = useState('');
    const [fixedQty, setFixedQty] = useState('');
    const [filteredFixedOptions, setFilteredFixedOptions] = useState([]);
    const [selectedFixedItemDetails, setSelectedFixedItemDetails] = useState(null);

    const [dimSearchTerm, setDimSearchTerm] = useState('');
    const [cuts, setCuts] = useState([]);
    const [cutRule, setCutRule] = useState({ dimensions: '', notes: '' });
    const [filteredDimOptions, setFilteredDimOptions] = useState([]);
    const [selectedDimItemDetails, setSelectedDimItemDetails] = useState(null);

    const searchRefFixed = useRef(null);
    const searchRefDim = useRef(null);

    // Search filtering effects
    useEffect(() => {
        if (fixedSearchTerm.length > 0) {
            const lowerCaseSearchTerm = fixedSearchTerm.toLowerCase();
            const filtered = allConsumables.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm))
            ).slice(0, 10);
            setFilteredFixedOptions(filtered);
        } else {
            setFilteredFixedOptions([]);
        }
    }, [fixedSearchTerm, allConsumables]);

    useEffect(() => {
        if (dimSearchTerm.length > 0) {
            const lowerCaseSearchTerm = dimSearchTerm.toLowerCase();
            const filtered = allConsumables.filter(item =>
                (item.category === 'Raw Material' || item.name.toLowerCase().includes('mat')) && // Filter for materials
                (item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm)))
            ).slice(0, 10);
            setFilteredDimOptions(filtered);
        } else {
            setFilteredDimOptions([]);
        }
    }, [dimSearchTerm, allConsumables]);

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRefFixed.current && !searchRefFixed.current.contains(event.target)) {
                setFilteredFixedOptions([]);
            }
            if (searchRefDim.current && !searchRefDim.current.contains(event.target)) {
                setFilteredDimOptions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddConsumable = () => {
        let newConsumable;
        let itemToAddDetails;

        if (consumableType === 'fixed') {
            if (!selectedFixedItemDetails || !fixedQty || parseFloat(fixedQty) <= 0) return alert("Please select an item and enter a valid quantity.");
            itemToAddDetails = selectedFixedItemDetails;
            newConsumable = { type: 'fixed', itemId: itemToAddDetails.id, quantity: Number(fixedQty) };
        } else if (consumableType === 'dimensional') {
            if (!selectedDimItemDetails || cuts.length === 0) return alert("Please select a material and add at least one cutting instruction.");
            itemToAddDetails = selectedDimItemDetails;
            newConsumable = { type: 'dimensional', itemId: itemToAddDetails.id, cuts };
        } else {
            return;
        }

        // Add display properties directly from itemToAddDetails
        const consumableWithDetails = {
            ...newConsumable,
            name: itemToAddDetails.name,
            unit: itemToAddDetails.unit || 'units',
            price: itemToAddDetails.price || 0,
            itemCode: itemToAddDetails.itemCode || '',
            category: itemToAddDetails.category || '', // Crucial for stock deduction later
            requiresCatalyst: itemToAddDetails.requiresCatalyst || false,
        };

        if (!selectedConsumables.find(c => c.itemId === consumableWithDetails.itemId)) {
            onAdd(consumableWithDetails);
            setFixedSearchTerm('');
            setFixedQty('');
            setSelectedFixedItemDetails(null);

            setDimSearchTerm('');
            setCuts([]);
            setCutRule({ dimensions: '', notes: '' });
            setSelectedDimItemDetails(null);
        } else {
            alert("This consumable has already been added to the recipe.");
        }
    };

    const getConsumableName = (id) => allConsumables.find(c => c.id === id)?.name || 'Unknown Item';

    return (
        <div>
            <h5 className="font-semibold mb-2 text-gray-200">Required Consumables</h5>
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                <div className="flex gap-2 bg-gray-800 p-1 rounded-md">
                    <button type="button" onClick={() => setConsumableType('fixed')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'fixed' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Fixed Quantity</button>
                    <button type="button" onClick={() => setConsumableType('dimensional')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'dimensional' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Dimensional Cuts</button>
                </div>
                {consumableType === 'fixed' && (
                    <div className="flex items-end gap-2 animate-fade-in" ref={searchRefFixed}>
                        <div className="flex-grow relative">
                            <Input
                                label="Item"
                                value={fixedSearchTerm}
                                onChange={e => {
                                    setFixedSearchTerm(e.target.value);
                                    setSelectedFixedItemDetails(null);
                                }}
                                placeholder="Search by name or code..."
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            {fixedSearchTerm.length > 0 && filteredFixedOptions.length > 0 && (
                                <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {filteredFixedOptions.map(item => (
                                        <li
                                            key={item.id}
                                            className="p-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer"
                                            onClick={() => {
                                                setSelectedFixedItemDetails(item);
                                                setFixedSearchTerm(item.name);
                                                setFilteredFixedOptions([]);
                                            }}
                                        >
                                            {item.name} ({item.itemCode || 'N/A'}) - {item.unit || 'units'} (R{item.price?.toFixed(2) || '0.00'})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="w-24">
                            <Input
                                label="Qty"
                                type="number"
                                value={fixedQty}
                                onChange={e => setFixedQty(e.target.value)}
                                placeholder="e.g., 5"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={handleAddConsumable}
                            disabled={!selectedFixedItemDetails || parseFloat(fixedQty) <= 0 || isNaN(parseFloat(fixedQty))}
                        >
                            Add
                        </Button>
                    </div>
                )}

                {consumableType === 'dimensional' && (
                    <div className="space-y-3 animate-fade-in" ref={searchRefDim}>
                         <div className="flex-grow relative">
                            <Input
                                label="Material to Cut"
                                value={dimSearchTerm}
                                onChange={e => {
                                    setDimSearchTerm(e.target.value);
                                    setSelectedDimItemDetails(null);
                                }}
                                placeholder="Search by name or code..."
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            {dimSearchTerm.length > 0 && filteredDimOptions.length > 0 && (
                                <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {filteredDimOptions.map(item => (
                                        <li
                                            key={item.id}
                                            className="p-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white cursor-pointer"
                                            onClick={() => {
                                                setSelectedDimItemDetails(item);
                                                setDimSearchTerm(item.name);
                                                setFilteredDimOptions([]);
                                            }}
                                        >
                                            {item.name} ({item.itemCode || 'N/A'}) - {item.unit || 'units'} (R{item.price?.toFixed(2) || '0.00'})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="p-2 border border-gray-700 rounded-md">
                            <p className="text-xs text-gray-400 mb-2">Cutting Instructions</p>
                            <div className="flex items-end gap-2">
                                <Input label="Dimensions (e.g., 120cm x 80cm)" value={cutRule.dimensions} onChange={e => setCutRule({...cutRule, dimensions: e.target.value})} />
                                <Input label="Notes" value={cutRule.notes} onChange={e => setCutRule({...cutRule, notes: e.target.value})} />
                                <Button type="button" onClick={() => { if(cutRule.dimensions) { setCuts([...cuts, cutRule]); setCutRule({ dimensions: '', notes: '' }); }}}>Add Cut</Button>
                            </div>
                            <ul className="text-xs mt-2 space-y-1">{cuts.map((c, i) => <li key={i}>{c.dimensions} ({c.notes})</li>)}</ul>
                        </div>
                        <Button
                            type="button"
                            onClick={handleAddConsumable}
                            className="w-full"
                            disabled={!selectedDimItemDetails || cuts.length === 0}
                        >
                            Add Dimensional Consumable
                        </Button>
                    </div>
                )}

                <h6 className="text-sm font-bold pt-2 border-t border-gray-700 text-gray-200">Recipe Consumables</h6>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedConsumables.map((c, i) => (
                        <li key={i} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm text-gray-200">
                            <div>
                                <p className="font-semibold">{c.name}</p>
                                {c.quantity && <span>: {c.quantity.toFixed(3)} {c.unit}</span>}
                                {c.notes && <span className="text-xs italic text-gray-500 ml-1">{c.notes}</span>}
                                {c.cuts && (
                                    <ul className="list-square list-inside ml-4 mt-1">
                                        {c.cuts.map((cut, j) => <li key={j}>{cut.dimensions} <span className="text-xs italic text-gray-500">{cut.notes}</span></li>)}
                                    </ul>
                                )}
                            </div>
                            <Button type="button" onClick={() => onRemove(c.itemId)} variant="danger" className="py-0.5 px-2 text-xs">X</Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Helper component for displaying details rows
const DetailRow = ({ label, value, className = 'text-gray-300' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-sm font-semibold ${className}`}>{value}</p>
    </div>
);

// JobDetailsModal component
const JobDetailsModal = ({ job, onClose, currentTime, employeeHourlyRates, allEmployees, onUpdateJob, onDeleteJob, allInventoryItems, allTools, allToolAccessories }) => {
    // State to manage edit mode
    const [isEditing, setIsEditing] = useState(false);
    // State to hold editable data for the form
    const [editableJobData, setEditableJobData] = useState(() => ({
        partName: job.partName,
        description: job.description || '',
        estimatedTime: job.estimatedTime || 0,
        employeeId: job.employeeId,
        employeeName: job.employeeName,
        steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
        selectedTools: new Set(job.tools?.map(t => t.id) || []),
        selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
        selectedConsumables: job.consumables || [], // Assume job.consumables is the raw recipe consumable format
    }));

    // Effect to reset editableJobData when job prop changes (e.g., modal opens for a new job)
    useEffect(() => {
        setEditableJobData({
            partName: job.partName,
            description: job.description || '',
            estimatedTime: job.estimatedTime || 0,
            employeeId: job.employeeId,
            employeeName: job.employeeName,
            steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
            selectedTools: new Set(job.tools?.map(t => t.id) || []),
            selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
            selectedConsumables: job.consumables || [],
        });
        setIsEditing(false); // Always start in view mode
    }, [job]);


    // Recalculate processed consumables for display in view mode, or when needed in edit mode
    const processedConsumablesForDisplay = useMemo(() => {
        // We pass a dummy temperature (20) for consistent calculation in the modal,
        // unless you need actual live temperature to affect already created jobs' consumables display.
        return processConsumablesForModal(job.consumables, allInventoryItems, 20);
    }, [job.consumables, allInventoryItems]);


    // Utility functions for formatting (already present)
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    const formatDuration = (j, cTime) => {
        if (!j.startedAt) return 'N/A';
        let durationSeconds;
        const startTime = j.startedAt.seconds * 1000;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;
        if (j.status === 'Complete' || j.status === 'Awaiting QC' || j.status === 'Issue' || j.status === 'Archived - Issue') {
            if (!j.completedAt) return 'N/A';
            durationSeconds = (j.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'In Progress') {
            durationSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'Paused' && j.pausedAt) {
            durationSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }
        
        if (durationSeconds < 0) return 'N/A';
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        return `${minutes}m ${seconds}s`;
    };

    const formatEfficiency = (j, cTime) => {
        if (!j.estimatedTime || !j.startedAt) return 'N/A';
        let actualSeconds;
        const startTime = j.startedAt.seconds * 1000;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;
        if (j.status === 'Complete' || j.status === 'Awaiting QC' || j.status === 'Issue' || j.status === 'Archived - Issue') {
            if (!j.completedAt) return 'N/A';
            actualSeconds = (j.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'In Progress') {
            actualSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'Paused' && j.pausedAt) {
            actualSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }
        actualSeconds = Math.max(0, actualSeconds);
        if (actualSeconds === 0) return 'N/A';
        const estimatedMinutes = j.estimatedTime;
        const actualMinutes = actualSeconds / 60;
        return `${Math.round((estimatedMinutes / actualMinutes) * 100)}%`;
    };

    const calculateLiveTotalCost = (j, cTime, rates) => {
        if (j.totalCost !== undefined && j.totalCost !== null) {
            return `R${j.totalCost.toFixed(2)}`;
        }
        if (!j.employeeId || !rates[j.employeeId]) {
            return 'N/A';
        }
        const hourlyRate = rates[j.employeeId];
        let activeSeconds = 0;
        const startTime = j.startedAt ?
        j.startedAt.seconds * 1000 : null;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;
        if (j.status === 'In Progress') {
            if (startTime) {
                activeSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
            }
        } else if (j.status === 'Paused' && j.pausedAt && startTime) {
            activeSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }
        activeSeconds = Math.max(0, activeSeconds);
        const activeHours = activeSeconds / 3600;
        const liveLaborCost = activeHours * hourlyRate;
        
        const currentMaterialCost = j.materialCost || 0;
        const totalLiveCost = liveLaborCost + currentMaterialCost;
        return `R${totalLiveCost.toFixed(2)}`;
    };

    const liveDurationFormatted = formatDuration(job, currentTime);
    const liveEfficiencyFormatted = formatEfficiency(job, currentTime);
    const liveTotalCostFormatted = calculateLiveTotalCost(job, currentTime, employeeHourlyRates);

    // Determine if job is editable/deletable
    const isJobActive = ['In Progress', 'Awaiting QC'].includes(job.status);
    // Can edit if Pending, Paused, Complete, Issue, Archived-Issue. NOT In Progress or Awaiting QC.
    const canEdit = !isJobActive && ['Pending', 'Paused', 'Complete', 'Issue', 'Archived - Issue'].includes(job.status);
    // Can delete if Pending, Paused, Complete, Issue, Archived-Issue. NOT In Progress or Awaiting QC.
    const canDelete = !isJobActive && ['Pending', 'Paused', 'Complete', 'Issue', 'Archived - Issue'].includes(job.status);


    // Handlers for editing features
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditableJobData(prev => ({ ...prev, [name]: value }));
    };

    const handleEmployeeChange = (e) => {
        const newEmployeeId = e.target.value;
        const selectedEmployee = allEmployees.find(emp => emp.id === newEmployeeId);
        setEditableJobData(prev => ({
            ...prev,
            employeeId: newEmployeeId,
            employeeName: selectedEmployee ? selectedEmployee.name : 'Unassigned'
        }));
    };

    const handleToolToggle = (toolId) => {
        setEditableJobData(prev => {
            const newTools = new Set(prev.selectedTools);
            if (newTools.has(toolId)) {
                newTools.delete(toolId);
                // Also remove accessories of this tool
                // Filter allToolAccessories directly from props
                const accessoriesOfTool = allToolAccessories.filter(item => item.toolId === toolId).map(a => a.id);
                const newAccessories = new Set(prev.selectedAccessories);
                accessoriesOfTool.forEach(accId => newAccessories.delete(accId));
                return { ...prev, selectedTools: newTools, selectedAccessories: newAccessories };
            } else {
                newTools.add(toolId);
                return { ...prev, selectedTools: newTools };
            }
        });
    };

    const handleAccessoryToggle = (accId) => {
        setEditableJobData(prev => {
            const newAccessories = new Set(prev.selectedAccessories);
            newAccessories.has(accId) ? newAccessories.delete(accId) : newAccessories.add(accId);
            return { ...prev, selectedAccessories: newAccessories };
        });
    };

    const handleAddConsumableToList = (consumable) => {
        setEditableJobData(prev => ({ ...prev, selectedConsumables: [...prev.selectedConsumables, consumable] }));
    };

    const handleRemoveConsumableFromList = (itemId) => {
        setEditableJobData(prev => ({ ...prev, selectedConsumables: prev.selectedConsumables.filter(c => c.itemId !== itemId) }));
    };


    const handleSave = async () => {
        // Basic validation
        if (!editableJobData.partName.trim()) {
            alert("Part Name cannot be empty.");
            return;
        }
        if (editableJobData.estimatedTime < 0) {
            alert("Estimated time cannot be negative.");
            return;
        }
        if (!editableJobData.steps.trim()) {
            alert("Steps cannot be empty.");
            return;
        }

        const updatedData = {
            partName: editableJobData.partName.trim(),
            description: editableJobData.description.trim(),
            estimatedTime: Number(editableJobData.estimatedTime),
            employeeId: editableJobData.employeeId || 'unassigned',
            employeeName: editableJobData.employeeName,
            steps: editableJobData.steps.split('\n').filter(s => s.trim() !== ''),
            // Save the updated tools, accessories, and consumables for this job instance
            tools: Array.from(editableJobData.selectedTools),
            accessories: Array.from(editableJobData.selectedAccessories),
            consumables: editableJobData.selectedConsumables, // Raw consumable objects as they are stored
            // Note: departmentId and photoUrl are generally not editable here as they're part of the recipe or initial job creation.
        };

        try {
            await onUpdateJob(job.id, updatedData);
            alert("Job updated successfully!");
            setIsEditing(false); // Exit edit mode
            // onClose(); // Optionally close modal, or let user review changes
        } catch (error) {
            console.error("Error updating job:", error);
            alert("Failed to update job.");
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to permanently delete job "${job.jobId}"? This action cannot be undone.`)) {
            try {
                await onDeleteJob(job.id);
                alert("Job deleted successfully!");
                onClose(); // Close modal after deletion
            } catch (error) {
                console.error("Error deleting job:", error);
                alert("Failed to delete job.");
            }
        }
    };

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isEditing ? `Editing: ${job.jobId}` : job.partName}
                        </h2>
                        <p className="text-xs font-mono text-gray-500">{job.jobId}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {isEditing ? (
                        // Edit Mode
                        <div className="space-y-4">
                            <Input 
                                label="Part Name" 
                                name="partName" 
                                value={editableJobData.partName} 
                                onChange={handleInputChange} 
                            />
                            <Dropdown
                                label="Assigned Employee"
                                name="employeeId"
                                value={editableJobData.employeeId}
                                onChange={handleEmployeeChange}
                                options={allEmployees}
                                placeholder="Select Employee..."
                            />
                            <Input
                                label="Estimated Time (minutes)"
                                name="estimatedTime"
                                type="number"
                                value={editableJobData.estimatedTime}
                                onChange={handleInputChange}
                            />
                            <Textarea
                                label="Description"
                                name="description"
                                value={editableJobData.description}
                                onChange={handleInputChange}
                                rows={3}
                            />
                             <Textarea
                                label="Steps (one per line)"
                                name="steps"
                                value={editableJobData.steps}
                                onChange={handleInputChange}
                                rows={5}
                            />

                            {/* Tools & Accessories for Recipe Definition */}
                            <div>
                                <h5 className="font-semibold text-white mb-2">Required Tools & Accessories</h5>
                                <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-800 rounded-lg">
                                    {/* Filter allTools directly from props */}
                                    {(allTools || []).map(tool => (
                                        <div key={tool.id}>
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                                                <input type="checkbox" checked={editableJobData.selectedTools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                <span>{tool.name}</span>
                                            </label>
                                            {editableJobData.selectedTools.has(tool.id) && (
                                                <div className="pl-6 mt-1 space-y-1 text-xs border-l-2 border-gray-700">
                                                    {/* Filter allToolAccessories directly from props */}
                                                    {(allToolAccessories.filter(acc => acc.toolId === tool.id)).map(accessory => (
                                                        <label key={accessory.id} className="flex items-center space-x-2 text-xs text-gray-300">
                                                            <input type="checkbox" checked={editableJobData.selectedAccessories.has(accessory.id)} onChange={() => handleAccessoryToggle(accessory.id)} className="h-3 w-3 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                            <span>{accessory.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Consumables for Job Editing */}
                            <div>
                                <ConsumableEditorInModal
                                    // Pass filtered inventory items to ConsumableEditorInModal
                                    allConsumables={allInventoryItems.filter(item => ['Component', 'Raw Material', 'Workshop Supply'].includes(item.category))}
                                    selectedConsumables={editableJobData.selectedConsumables}
                                    onAdd={handleAddConsumableToList}
                                    onRemove={handleRemoveConsumableFromList}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <Button onClick={() => setIsEditing(false)} variant="secondary">
                                    <XCircle size={18} className="mr-2"/> Cancel
                                </Button>
                                <Button onClick={handleSave} variant="primary">
                                    <Save size={18} className="mr-2"/> Save Changes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // View Mode
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <DetailRow label="Employee" value={job.employeeName} />
                                <DetailRow label="Status" value={job.status} />
                                <DetailRow label="Created On" value={formatDate(job.createdAt)} />
                                <DetailRow label="Started On" value={formatDate(job.startedAt)} />
                                <DetailRow label="Completed On" value={formatDate(job.completedAt)} />
                                {job.status === 'Paused' && job.pausedAt && (
                                    <DetailRow label="Paused At" value={formatDate(job.pausedAt)} />
                                )}
                                {job.status === 'Issue' && <DetailRow label="Issue Reason" value={job.issueReason || 'N/A'} className="text-red-400 font-semibold" />}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <Clock size={20} className="mx-auto mb-2 text-blue-400" />
                                    <p className="text-xs text-gray-400">Est. Time</p>
                                    <p className="font-bold">{job.estimatedTime || 'N/A'} min</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <CheckCircle2 size={20} className="mx-auto mb-2 text-green-400" />
                                    <p className="text-xs text-gray-400">Actual Time</p>
                                    <p className="font-bold">{liveDurationFormatted}</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <Zap size={20} className="mx-auto mb-2 text-purple-400" />
                                    <p className="text-xs text-gray-400">Efficiency</p>
                                    <p className="font-bold">{liveEfficiencyFormatted}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <p className="text-xs text-gray-400">Material Cost</p>
                                    <p className="font-bold font-mono">R{job.materialCost?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <p className="text-xs text-gray-400">Labor Cost</p>
                                    <p className="font-bold font-mono">R{((job.laborCost === undefined || job.laborCost === null) && job.startedAt && employeeHourlyRates[job.employeeId] !== undefined) ?
                                    (
                                            (formatDuration(job, currentTime).split('m')[0] * employeeHourlyRates[job.employeeId] / 60).toFixed(2)
                                        ) : job.laborCost?.toFixed(2) || '0.00'}
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <DollarSign size={20} className="mx-auto mb-2 text-yellow-400" />
                                    <p className="text-xs text-gray-400">Total Job Cost</p>
                                    <p className="font-bold font-mono">{liveTotalCostFormatted}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-200 mb-2">Consumables Used</h4>
                                <ul className="text-sm text-gray-400 list-disc list-inside bg-gray-900/50 p-4 rounded-lg">
                                    {processedConsumablesForDisplay?.length > 0 ?
                                    processedConsumablesForDisplay.map((c, i) => (
                                        <li key={i}>
                                            {c.name} (Qty: {c.quantity?.toFixed(3) || 'N/A'} {c.unit || ''}) (R{c.price?.toFixed(2) || '0.00'}) {/* CORRECTED LINE */}
                                        </li>
                                    )) : <li>None</li>}
                                </ul>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 mt-6">
                                {canEdit && (
                                    <Button onClick={() => setIsEditing(true)} variant="secondary">
                                        <Edit size={18} className="mr-2"/> Edit Job
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button onClick={handleDelete} variant="danger">
                                        <Trash2 size={18} className="mr-2"/> Delete Job
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobDetailsModal;