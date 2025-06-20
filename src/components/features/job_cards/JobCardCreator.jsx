import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getManufacturers, getMakes, getModels, getParts, getDepartments, getEmployees, addJobCard, getJobStepDetails, getTools, getToolAccessories, getAllInventoryItems, checkExistingJobRecipe, setJobStepDetail } from '../../../api/firestore';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import Textarea from '../../ui/Textarea';
import Input from '../../ui/Input';
import { Search } from 'lucide-react'; // Import Search icon


// Utility to process consumables for the job card preview
const processRecipeConsumables = (consumablesFromRecipe, allConsumablesList, temp) => {
    if (!consumablesFromRecipe) return [];

    const processedList = [];
    const CATALYST_RULES = [
        { temp_max: 18, percentage: 3.0 },
        { temp_max: 28, percentage: 2.0 },
        { temp_max: 100, percentage: 1.0 }
    ];

    // Find a generic catalyst item, assuming 'catalyst' or 'hardener' in its name
    const catalystItem = allConsumablesList.find(c => c.name.toLowerCase().includes('catalyst') || c.name.toLowerCase().includes('hardener'));

    for (const consumable of consumablesFromRecipe) {
        const masterItem = allConsumablesList.find(c => c.id === consumable.itemId);

        // If masterItem is found, use its details. Otherwise, use what's on the consumable itself.
        const itemDetails = masterItem || consumable;
        if (!itemDetails) continue;

        if (consumable.type === 'fixed') {
            processedList.push({ ...itemDetails, quantity: consumable.quantity, notes: '' });

            // Apply catalyst if required and catalyst item exists
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


// Helper component for Consumable editing within the inline recipe form
const RecipeConsumableEditor = ({ consumables, selectedConsumables, onAdd, onRemove }) => {
    const [consumableType, setConsumableType] = useState('fixed');
    const [selectedFixedItemId, setSelectedFixedItemId] = useState('');
    const [fixedQty, setFixedQty] = useState('');
    const [selectedDimItemId, setSelectedDimItemId] = useState('');
    const [cuts, setCuts] = useState([]);
    const [cutRule, setCutRule] = useState({ dimensions: '', notes: '' });

    // NEW SEARCH RELATED STATES
    const [fixedSearchTerm, setFixedSearchTerm] = useState('');
    const [filteredFixedOptions, setFilteredFixedOptions] = useState([]);
    const [selectedFixedItemDetails, setSelectedFixedItemDetails] = useState(null); // To store full item object

    const [dimSearchTerm, setDimSearchTerm] = useState('');
    const [filteredDimOptions, setFilteredDimOptions] = useState([]);
    const [selectedDimItemDetails, setSelectedDimItemDetails] = useState(null); // To store full item object

    const searchRefFixed = useRef(null);
    const searchRefDim = useRef(null);
    // END NEW SEARCH RELATED STATES


    // NEW SEARCH RELATED EFFECTS
    useEffect(() => {
        if (fixedSearchTerm.length > 0) {
            const lowerCaseSearchTerm = fixedSearchTerm.toLowerCase();
            const filtered = consumables.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm))
            ).slice(0, 10); // Limit results
            setFilteredFixedOptions(filtered);
        } else {
            setFilteredFixedOptions([]);
        }
    }, [fixedSearchTerm, consumables]);

    useEffect(() => {
        if (dimSearchTerm.length > 0) {
            const lowerCaseSearchTerm = dimSearchTerm.toLowerCase();
            const filtered = consumables.filter(item =>
                (item.name.toLowerCase().includes('mat') || item.category === 'Raw Material') &&
                (item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm)))
            ).slice(0, 10); // Limit results
            setFilteredDimOptions(filtered);
        } else {
            setFilteredDimOptions([]);
        }
    }, [dimSearchTerm, consumables]);

    // Click outside handler for fixed quantity search
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRefFixed.current && !searchRefFixed.current.contains(event.target)) {
                setFilteredFixedOptions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Click outside handler for dimensional search
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRefDim.current && !searchRefDim.current.contains(event.target)) {
                setFilteredDimOptions([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    // END NEW SEARCH RELATED EFFECTS


    const handleAddConsumable = () => {
        let newConsumable;

        switch (consumableType) {
            case 'fixed':
                if (!selectedFixedItemDetails || !fixedQty || parseFloat(fixedQty) <= 0) return alert("Please select an item and enter a valid quantity.");
                newConsumable = { type: 'fixed', itemId: selectedFixedItemDetails.id, quantity: Number(fixedQty) };
                break;
            case 'dimensional':
                if (!selectedDimItemDetails || cuts.length === 0) return alert("Please select a material and add at least one cutting instruction.");
                newConsumable = { type: 'dimensional', itemId: selectedDimItemDetails.id, cuts };
                break;
            default: return;
        }
        if (!selectedConsumables.find(c => c.itemId === newConsumable.itemId)) {
            onAdd(newConsumable);
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
    const getConsumableName = (id) => consumables.find(c => c.id === id)?.name || 'Unknown Item';

    return (
        <div>
            <h5 className="font-semibold mb-2 text-gray-200">Required Consumables for Recipe</h5>
            <div className="p-4 bg-gray-800 rounded-lg space-y-4">
                <div className="flex gap-2 bg-gray-700 p-1 rounded-md">
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
                                    setSelectedFixedItemDetails(null); // Clear selected item if typing
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
                                                setSelectedFixedItemDetails(item); // Store full item
                                                setSelectedFixedItemId(item.id); // Store ID for logic
                                                setFixedSearchTerm(item.name); // Set input text to item name
                                                setFilteredFixedOptions([]); // Close results
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
                                    setSelectedDimItemDetails(null); // Clear selected item if typing
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
                                                setSelectedDimItemDetails(item); // Store full item
                                                setSelectedDimItemId(item.id); // Store ID for logic
                                                setDimSearchTerm(item.name); // Set input text to item name
                                                setFilteredDimOptions([]); // Close results
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
                                <p className="font-semibold">{getConsumableName(c.itemId)}</p>
                                {c.type === 'fixed' && <p className="text-xs text-gray-400">Qty: {c.quantity}</p>}
                                {c.type === 'dimensional' && <p className="text-xs text-gray-400">{c.cuts.length} cut(s) required</p>}
                            </div>
                            <Button type="button" onClick={() => onRemove(c.itemId)} variant="danger" className="py-0.5 px-2 text-xs">X</Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


// JobCardPreview component defined BEFORE JobCardCreator
const JobCardPreview = ({ details }) => {
    if (!details) return null;

    return (
        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Generated Job Card Preview</h2>
            <div id="job-card-print-area" className="bg-white text-gray-800 p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Job Card</h1>
                        <p className="text-gray-600">Part: <span className="font-semibold">{details.partName}</span></p>
                        <p className="text-gray-600">Department: <span className="font-semibold">{details.departmentName}</span></p>
                    </div>
                    <div className="text-right">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(details.jobId)}&size=80x80`} alt="QR Code"/>
                       <p className="text-xs text-gray-500 mt-1">{details.jobId}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    <div>
                        {details.photoUrl ? ( <img src={details.photoUrl} alt={details.partName} className="rounded-lg object-cover w-full h-64 mb-4 border" /> ) : ( <div className="rounded-lg w-full h-64 mb-4 border bg-gray-100 flex items-center justify-center text-gray-400"><span>No Image Available</span></div> )}
                        <div className="space-y-2 text-sm">
                            <p><b>Employee:</b> {details.employeeName}</p>
                            <p><b>Est. Time:</b> {details.estimatedTime || 'N/A'} mins</p>
                            <p><b>Description:</b> {details.description || 'No description.'}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Required Tools & Accessories</h3>
                            <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
                                {details.tools?.length > 0 ? details.tools.map((tool) => <li key={tool.id}>{tool.name}</li>) : <li>No tools required.</li>}
                                {details.accessories?.length > 0 ?
                                details.accessories.map((acc) => <li key={acc.id} className="ml-4">{acc.name}</li>) : null}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Required Consumables</h3>
                            <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
                                {details.processedConsumables?.length >
                                0 ? details.processedConsumables.map((c, i) => (
                                    <li key={i}>
                                        <span className="font-semibold">{c.name}</span>
                                        {c.quantity && <span>: {c.quantity.toFixed(3)} {c.unit}</span>}
                                        {c.notes && <span className="text-xs italic text-gray-500 ml-1">{c.notes}</span>}
                                        {c.cuts && (
                                            <ul className="list-square list-inside ml-4 mt-1">
                                                {c.cuts.map((cut, j) => <li key={j}>{cut.dimensions} <span className="text-xs italic text-gray-500">{cut.notes}</span></li>)}
                                            </ul>
                                        )}
                                    </li>
                                )) : <li>No consumables required.</li>}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="mt-6 border-t pt-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Steps</h3>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">{details.steps?.length > 0 ?
                    details.steps.map((step, i) => <li key={i}>{step}</li>) : <li>No steps defined.</li>}</ol>
                </div>
            </div>
        </div>
    )
};

// Main JobCardCreator component
const JobCardCreator = () => {
    // State to hold all master data from Firestore
    const [allData, setAllData] = useState({ manufacturers:[], makes:[], models:[], parts:[], departments:[], employees:[], jobSteps: [], tools: [], toolAccessories: [], allConsumables: [] });
    const [loading, setLoading] = useState(true);
    // State to hold user selections in the dropdowns
    const [selection, setSelection] = useState({ manufacturerId: '', makeId: '', modelId: '', partId: '', departmentId: '', employeeId: '' });
    // State for the generated job card details to be previewed and saved
    const [jobDetails, setJobDetails] = useState(null);
    // State to hold current temperature from weather API for catalyst calculation
    const [currentTemp, setCurrentTemp] = useState(null);
    // Flags and states for "Define Recipe on Demand"
    const [showDefineRecipeForm, setShowDefineRecipeForm] = useState(false);
    const [tempRecipeDetails, setTempRecipeDetails] = useState({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    const [isSavingNewRecipe, setIsSavingNewRecipe] = useState(false); // To prevent double clicks/indicate saving

    // Fetch all necessary data when the component mounts
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch current temperature from Open-Meteo for Cape Town
                const weatherResponse = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-33.92&longitude=18.42&current=temperature_2m");
                const weatherData = await weatherResponse.json();
                setCurrentTemp(weatherData.current.temperature_2m);
                // Fetch all data from Firestore concurrently

                const [man, mak, mod, par, dep, emp, steps, t, ta, inv] = await Promise.all([
                    getManufacturers(), getMakes(), getModels(), getParts(), getDepartments(), getEmployees(), getJobStepDetails(), getTools(), getToolAccessories(), getAllInventoryItems()
                ]);
                setAllData({ manufacturers: man, makes: mak, models: mod, parts: par, departments: dep, employees: emp, jobSteps: steps, tools: t, toolAccessories: ta, allConsumables: inv });
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                alert("Error fetching page data. Please check the console and refresh.");
                if (currentTemp === null) setCurrentTemp(20);
                // Fallback temperature if API fails
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // Handler for dropdown selections
    const handleSelection = (e) => {
        const { name, value } = e.target;
        setSelection(prev => {
            const updated = { ...prev, [name]: value };
            // Reset lower-level selections when a higher-level selection changes
            if (name === 'manufacturerId') { updated.makeId = ''; updated.modelId = ''; updated.partId = ''; }
            if (name === 'makeId') { updated.modelId = ''; updated.partId = ''; }
            if (name === 'modelId') { updated.partId = ''; }
            
            if (name === 'departmentId') { updated.employeeId = ''; }
            return updated;
        });
        // Hide the inline recipe definition form if selections change
        setShowDefineRecipeForm(false);
        setTempRecipeDetails({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    };

    // Memoized filtered options for dropdowns for performance
    const filteredMakes = useMemo(() => allData.makes.filter(m => m.manufacturerId === selection.manufacturerId), [allData.makes, selection.manufacturerId]);
    const filteredModels = useMemo(() => allData.models.filter(m => m.makeId === selection.makeId), [allData.models, selection.makeId]);
    const filteredParts = useMemo(() => allData.parts.filter(p => p.modelId === selection.modelId), [allData.parts, selection.modelId]);
    const filteredEmployees = useMemo(() => allData.employees.filter(e => e.departmentId === selection.departmentId), [allData.employees, selection.departmentId]);

    // Effect to generate job details whenever selections or data change
    useEffect(() => {
        const { partId, departmentId, employeeId } = selection;
        // Only generate if both part and department are selected, and temperature is known
        if (partId && departmentId && currentTemp !== null) {
            const part = allData.parts.find(p => p.id === partId);
            const department = allData.departments.find(d => d.id === departmentId);
            const employee = allData.employees.find(e => e.id === employeeId);
            
            let finalRecipeDetails = null;
            let isRecipeFoundInDb = false;
            // 1. Try to find a standard recipe for the *current* selection
            const standardRecipe = allData.jobSteps.find(step => step.partId === partId && step.departmentId === departmentId);
            if (standardRecipe) {
                finalRecipeDetails = standardRecipe;
                isRecipeFoundInDb = true;
                setShowDefineRecipeForm(false);
                // Hide the define form if a standard recipe exists
            } else {
                // No standard recipe. Prompt to define.
                setShowDefineRecipeForm(true); // Show the inline form to define a new recipe
                // Use tempRecipeDetails for the form, which also acts as the "recipe" for the preview
                finalRecipeDetails = {
                    description: tempRecipeDetails.description || 'No description.',
                    estimatedTime: tempRecipeDetails.estimatedTime || 0,
                    steps: tempRecipeDetails.steps.split('\n').filter(s => s.trim() !== ''),
                    tools: Array.from(tempRecipeDetails.tools),
                    accessories: Array.from(tempRecipeDetails.accessories),
                    consumables: tempRecipeDetails.consumables
                };
            }
            
            if (part && department) {
                // Process consumables based on the final determined recipe details and current temperature
                const processedConsumables = processRecipeConsumables(finalRecipeDetails?.consumables, allData.allConsumables, currentTemp);
                // Map tool and accessory IDs to their full objects for display
                const toolsForDisplay = (finalRecipeDetails?.tools || []).map(toolId => allData.tools.find(t => t.id === toolId)).filter(Boolean);
                const accessoriesForDisplay = (finalRecipeDetails?.accessories || []).map(accId => allData.toolAccessories.find(a => a.id === accId)).filter(Boolean);
                
                setJobDetails({
                    jobId: `JOB-${Date.now()}`, // Generate a unique job ID
                    partName: part.name,
                    partId: part.id,
                    photoUrl: part.photoUrl || '',
                    departmentId: department.id,
                    departmentName: department.name,
                    employeeId: employee ? employee.id : '',
                    employeeName: employee ? employee.name : 'Unassigned',
                    status: 'Pending', // Initial status
                    description: finalRecipeDetails?.description || 'No description.',
                    estimatedTime: finalRecipeDetails?.estimatedTime || 0,
                    steps: finalRecipeDetails?.steps || [],
                    tools: toolsForDisplay,
                    accessories: accessoriesForDisplay,
                    consumables: finalRecipeDetails?.consumables || [], // Raw consumables (for saving recipe)

                    processedConsumables: processedConsumables, // Consumables with quantities adjusted by rules (for job card display/costing)
                    // Flags for conditional rendering of buttons
                    isRecipeFoundInDb: isRecipeFoundInDb,
                });
            }
        } else {
            setJobDetails(null);
            // Clear job details if selections are incomplete
            setShowDefineRecipeForm(false);
            // Hide recipe definition form
        }
    }, [selection, allData, currentTemp, tempRecipeDetails]);

    // Handlers for inline recipe definition form
    const handleTempRecipeInputChange = (e) => {
        const { name, value } = e.target;
        setTempRecipeDetails(prev => ({ ...prev, [name]: value }));
    };
    const handleTempRecipeToolToggle = (toolId) => {
        setTempRecipeDetails(prev => {
            const newTools = new Set(prev.tools);
            newTools.has(toolId) ? newTools.delete(toolId) : newTools.add(toolId);
            return { ...prev, tools: newTools };
        });
    };
    const handleTempRecipeAccessoryToggle = (accId) => {
        setTempRecipeDetails(prev => {
            const newAccessories = new Set(prev.accessories);
            newAccessories.has(accId) ? newAccessories.delete(accId) : newAccessories.add(accId);
            return { ...prev, accessories: newAccessories };
        });
    };
    const handleTempRecipeConsumableAdd = (consumable) => {
        setTempRecipeDetails(prev => ({ ...prev, consumables: [...prev.consumables, consumable] }));
    };
    const handleTempRecipeConsumableRemove = (itemId) => {
        setTempRecipeDetails(prev => ({ ...prev, consumables: prev.consumables.filter(c => c.itemId !== itemId) }));
    };

    // Function to save the new recipe and create the job card
    const saveNewRecipeAndCreateJob = async () => {
        if (!jobDetails || !selection.partId || !selection.departmentId) return;
        // Basic validation for recipe fields
        if (!tempRecipeDetails.description.trim() || !tempRecipeDetails.estimatedTime || !tempRecipeDetails.steps.trim()) {
            alert("Please fill in Description, Estimated Time, and Steps for the new recipe.");
            return;
        }
        
        setIsSavingNewRecipe(true);
        // Disable button
        try {
            const recipeData = {
                description: tempRecipeDetails.description.trim(),
                estimatedTime: Number(tempRecipeDetails.estimatedTime),
                steps: tempRecipeDetails.steps.split('\n').filter(s => s.trim() !== ''),
                tools: Array.from(tempRecipeDetails.tools),
                accessories: Array.from(tempRecipeDetails.accessories),
                consumables: tempRecipeDetails.consumables,
            };
            await setJobStepDetail(selection.partId, selection.departmentId, recipeData);
            alert("New recipe saved successfully!");
            // Now create the job card based on these new recipe details
            const jobCardDataForCreation = {
                ...jobDetails, // Use current jobDetails base
                description: recipeData.description,
                estimatedTime: recipeData.estimatedTime,
                steps: recipeData.steps,
                tools: recipeData.tools.map(toolId => allData.tools.find(t => t.id === toolId)).filter(Boolean), // Full objects
                accessories: recipeData.accessories.map(accId => allData.toolAccessories.find(a => a.id 
                === accId)).filter(Boolean), // Full objects
                consumables: recipeData.consumables, // Raw consumables
                processedConsumables: processRecipeConsumables(recipeData.consumables, allData.allConsumables, currentTemp), // Processed
            };
            await addJobCard(jobCardDataForCreation);
            alert(`Job Card ${jobDetails.jobId} created successfully from new recipe!`);
            
            // --- ADDED PRINTING LOGIC HERE ---
            const printContents = document.getElementById('job-card-print-area').innerHTML;
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow.document.write(`<html><head><title>Print Job Card</title><script src="https://cdn.tailwindcss.com/"></script><style>@media print { body { -webkit-print-color-adjust: exact; } button { display: none; } }</style></head><body><div class="p-8">${printContents}</div><div class="mt-4 text-center"><button onclick="window.print()" style="padding: 10px 20px; background-color: #3b82f6; color: white; border-radius: 8px; border: none; cursor: pointer;">Print This Job Card</button></div></body></html>`);
            printWindow.document.close();
            printWindow.onload = () => {
                setTimeout(() => printWindow.print(), 500);
            };
            // --- END ADDED PRINTING LOGIC ---

            // Refetch job steps to update allData
            const updatedJobSteps = await getJobStepDetails();
            setAllData(prev => ({ ...prev, jobSteps: updatedJobSteps }));
            // Reset UI
            handleResetFormAndPreview();
        } catch (error) {
            console.error("Error saving new recipe or creating job:", error);
            alert("Failed to save new recipe or create job. Please try again.");
        } finally {
            setIsSavingNewRecipe(false);
            // Re-enable button
        }
    };

    // Quick-Repeat: Function to generate a new job card from the current previewed details
    const handleGenerateNewJobCard = async () => {
        if (!jobDetails) {
            alert("No job details to generate. Please select a part and department first.");
            return;
        }
        const confirmGenerate = window.confirm(
            `Are you sure you want to create another Job Card for "${jobDetails.partName}" in "${jobDetails.departmentName}"?` +
            (jobDetails.employeeName !== 'Unassigned' ? ` It will be assigned to ${jobDetails.employeeName}.` : "")
        );
        if (!confirmGenerate) return;
        try {
            // Create a new job card with updated jobId, but same recipe details
            const newJobCardData = {
                ...jobDetails,
                jobId: `JOB-${Date.now()}`, // Generate a NEW unique job ID
                status: 'Pending', // Ensure status is pending for a new job
                // Clear any timestamps/costs from previous instance
                startedAt: null,
                
                completedAt: null,
                pausedAt: null,
                totalPausedMilliseconds: 0,
                materialCost: null,
                laborCost: null,
                totalCost: null,
                issueReason: null,
            };
            await addJobCard(newJobCardData);
            alert(`New Job Card ${newJobCardData.jobId} created successfully!`);
            // --- Printing the new job card ---
            const printContents = document.getElementById('job-card-print-area').innerHTML;
            const printWindow = window.open('', '', 'height=800,width=1000');
            // Adding basic inline styles for printability
            printWindow.document.write(`<html><head><title>Print Job Card</title><script src="https://cdn.tailwindcss.com/"></script><style>@media print { body { -webkit-print-color-adjust: exact; } button { display: none; } }</style></head><body><div class="p-8">${printContents}</div><div class="mt-4 text-center"><button onclick="window.print()" style="padding: 10px 20px; background-color: #3b82f6; color: white; border-radius: 8px; border: none; cursor: pointer;">Print This Job Card</button></div></body></html>`);
            printWindow.document.close();
            printWindow.onload = () => { // Wait for content to load
                setTimeout(() => printWindow.print(), 500);
                // Attempt auto-print
            };
            // --- End Printing ---
            // Keep current selections, but clear jobDetails to prepare for next possible generation
            // This allows user to generate multiple cards without re-selecting
            setJobDetails(prev => ({...prev, jobId: `JOB-${Date.now()}`}));
            // Update preview with new job ID
        } catch (error) {
            console.error("Error generating new job card:", error);
            alert("Failed to generate new job card.");
        }
    };

    // Common reset function
    const handleResetFormAndPreview = () => {
        setSelection({ manufacturerId: '', makeId: '', modelId: '', partId: '', departmentId: '', employeeId: '' });
        setJobDetails(null);
        setShowDefineRecipeForm(false);
        setTempRecipeDetails({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    };

    // Handler for printing (for jobs with existing recipes)
    const handlePrintAndCreate = async () => {
        if (!jobDetails) return;
        // Check for existing job recipe to prevent duplicates (as per your requirement)
        // This check applies to job cards being created from *catalog recipes*
        const recipeExistsInDb = await checkExistingJobRecipe(jobDetails.partId, jobDetails.departmentId);
        if (recipeExistsInDb) {
            const shouldCreateDuplicate = window.confirm("A job recipe with the same part and department already exists. Are you sure you want to create a new job card from this recipe?");
            if (!shouldCreateDuplicate) {
                alert("Job card creation cancelled.");
                return;
            }
        }
        
        try {
            await addJobCard(jobDetails);
            // Save the job card to Firestore
            alert(`Job Card ${jobDetails.jobId} created successfully!`);
            // --- Printing the new job card ---
            const printContents = document.getElementById('job-card-print-area').innerHTML;
            const printWindow = window.open('', '', 'height=800,width=1000');
            // Adding basic inline styles for printability
            printWindow.document.write(`<html><head><title>Print Job Card</title><script src="https://cdn.tailwindcss.com/"></script><style>@media print { body { -webkit-print-color-adjust: exact; } button { display: none; } }</style></head><body><div class="p-8">${printContents}</div><div class="mt-4 text-center"><button onclick="window.print()" style="padding: 10px 20px; background-color: #3b82f6; color: white; border-radius: 8px; border: none; cursor: pointer;">Print This Job Card</button></div></body></html>`);
            printWindow.document.close();
            printWindow.onload = () => { // Wait for content to load
                setTimeout(() => printWindow.print(), 500);
                // Attempt auto-print
            };
            // --- End Printing ---
            handleResetFormAndPreview();
            // Reset form after successful creation and print
        } catch (error) {
            console.error("Error creating job card:", error);
            alert("Failed to create job card.");
        }
    };

    // Display loading message if data is still being fetched
    if (loading) return <p className="text-center text-gray-400">Loading settings data...</p>;

    // Conditional rendering for the print/create button based on recipe existence
    const renderActionButton = () => {
        if (!jobDetails) return null;

        // Scenario: Part and Department selected, but no recipe in DB
        if (showDefineRecipeForm) {
            return (
                <Button onClick={saveNewRecipeAndCreateJob} variant="primary" disabled={isSavingNewRecipe}>
                    {isSavingNewRecipe ? 'Saving Recipe...' : 'Define Recipe & Create First Job'}
                </Button>
            );
        } else {
            // Scenario: Recipe exists or cloned details are being used without defining a new recipe
            return (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handlePrintAndCreate} variant="primary">Print & Create Job</Button>
                    <Button onClick={handleGenerateNewJobCard} variant="secondary">Generate New Job Card</Button>
                </div>
            );
        }
    };

    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mt-8">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">
                    Create New Job from Catalog
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Dropdowns for catalog selection */}
                    <Dropdown label="1. Manufacturer" name="manufacturerId" value={selection.manufacturerId} onChange={handleSelection} options={allData.manufacturers} placeholder="Select Manufacturer" />
                    <Dropdown label="2. Make" name="makeId" value={selection.makeId} onChange={handleSelection} options={filteredMakes} placeholder="Select Make" disabled={!selection.manufacturerId} />
                    <Dropdown label="3. Model" name="modelId" value={selection.modelId} onChange={handleSelection} options={filteredModels} placeholder="Select Model" disabled={!selection.makeId} />
                    <Dropdown label="4. Part" name="partId" value={selection.partId} onChange={handleSelection} options={filteredParts} placeholder="Select Part" disabled={!selection.modelId} />
                    <Dropdown label="5. Department" name="departmentId" value={selection.departmentId} onChange={handleSelection} options={allData.departments} placeholder="Select Department" />
                    <Dropdown label="6. Employee (Optional)" name="employeeId" value={selection.employeeId} onChange={handleSelection} options={filteredEmployees} placeholder="Select Employee..." disabled={!selection.departmentId} />
                </div>
                {/* Inline Recipe Definition Form */}
                {showDefineRecipeForm && selection.partId && selection.departmentId && (
                    <div className="mt-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700 animate-fade-in">
                        <h4 className="text-xl font-bold text-white mb-4">Define Recipe for New Part-Department Combination</h4>
                        <p className="text-gray-400 text-sm mb-4">No standard recipe found. Please define it now to create the first job card and save for future use.</p>
                        
                        <div className="space-y-4">
                            <Input label="Description" name="description" value={tempRecipeDetails.description} onChange={handleTempRecipeInputChange} placeholder="e.g., Final assembly of side skirt" />
                            <Input label="Estimated Time (minutes)" name="estimatedTime" type="number" value={tempRecipeDetails.estimatedTime} onChange={handleTempRecipeInputChange} placeholder="e.g., 45" />
                            <Textarea label="Steps (one per line)" name="steps" value={tempRecipeDetails.steps} onChange={handleTempRecipeInputChange} rows={5} placeholder="1. Align panels...&#10;2. Apply adhesive..." />
                            {/* Tools & Accessories for Recipe Definition */}
                            <div>
                                <h5 className="font-semibold text-white mb-2">Required Tools & Accessories for Recipe</h5>
                                <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-800 rounded-lg">
                                    {(allData.tools || []).map(tool => (
                                        <div key={tool.id}>
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                                                <input type="checkbox" checked={tempRecipeDetails.tools.has(tool.id)} onChange={() => handleTempRecipeToolToggle(tool.id)} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                <span>{tool.name}</span>
                                            </label>
                                            {tempRecipeDetails.tools.has(tool.id) && (
                                                <div className="pl-6 mt-1 space-y-1 text-xs border-l-2 border-gray-700">
                                                    {(allData.toolAccessories.filter(acc => acc.toolId === tool.id)).map(accessory => (
                                                        <label key={accessory.id} className="flex items-center space-x-2 text-xs text-gray-300">
                                                            <input type="checkbox" checked={tempRecipeDetails.accessories.has(accessory.id)} onChange={() => handleTempRecipeAccessoryToggle(accessory.id)} className="h-3 w-3 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                            <span>{accessory.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Consumables for Recipe Definition - using the helper editor */}
                            <div>
                                <RecipeConsumableEditor
                                    consumables={allData.allConsumables}
                                    selectedConsumables={tempRecipeDetails.consumables}
                                    onAdd={handleTempRecipeConsumableAdd}
                                    onRemove={handleTempRecipeConsumableRemove}
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Action Buttons: Define Recipe, Print & Create, Generate New */}
                {jobDetails && (
                    <div className="mt-8 text-center">
                        {renderActionButton()}
                    </div>
                )}
            </div>
            {/* Job Card Preview component, only visible if job details are generated */}
            {jobDetails && <JobCardPreview details={jobDetails} />}
        </>
    );
};

export default JobCardCreator;