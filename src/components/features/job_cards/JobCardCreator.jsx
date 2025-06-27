// src/components/features/job_cards/JobCardCreator.jsx (COMBINED & UNIFIED)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    // New unified product catalog functions
    getProducts, getProductCategories,
    // Existing functions that are still needed
    getDepartments, getEmployees, addJobCard, getJobStepDetails, getTools,
    getToolAccessories, getAllInventoryItems, getDepartmentSkills,
    // Function from old code to save new recipes
    setJobStepDetail,
    // Added for recipe definition
    getSkills
} from '../../../api/firestore';
import { processConsumables } from '../../../utils/jobUtils';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import Textarea from '../../ui/Textarea';
import Input from '../../ui/Input';
import { Search } from 'lucide-react';

// --- Components from OLD code integrated here ---

const RecipeConsumableEditor = ({ consumables, selectedConsumables, onAdd, onRemove }) => {
    // This component is taken directly from the old code to handle complex consumable additions for new recipes.
    const [consumableType, setConsumableType] = useState('fixed');
    const [selectedFixedItemId, setSelectedFixedItemId] = useState('');
    const [fixedQty, setFixedQty] = useState('');
    const [selectedDimItemId, setSelectedDimItemId] = useState('');
    const [cuts, setCuts] = useState([]);
    const [cutRule, setCutRule] = useState({ dimensions: '', notes: '' });
    const [fixedSearchTerm, setFixedSearchTerm] = useState('');
    const [filteredFixedOptions, setFilteredFixedOptions] = useState([]);
    const [selectedFixedItemDetails, setSelectedFixedItemDetails] = useState(null);
    const [dimSearchTerm, setDimSearchTerm] = useState('');
    const [filteredDimOptions, setFilteredDimOptions] = useState([]);
    const [selectedDimItemDetails, setSelectedDimItemDetails] = useState(null);
    const searchRefFixed = useRef(null);
    const searchRefDim = useRef(null);

    useEffect(() => {
        if (fixedSearchTerm.length > 0) {
            const lowerCaseSearchTerm = fixedSearchTerm.toLowerCase();
            const filtered = consumables.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearchTerm))
            ).slice(0, 10);
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
            ).slice(0, 10);
            setFilteredDimOptions(filtered);
        } else {
            setFilteredDimOptions([]);
        }
    }, [dimSearchTerm, consumables]);

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
                                                 setSelectedFixedItemId(item.id);
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
                                                 setSelectedDimItemId(item.id);
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


const JobCardPreview = ({ details }) => {
    // This is the more detailed preview component from the old code, adapted for the new data structure.
    if (!details) return null;
    return (
        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Generated Job Card Preview</h2>
            <div id="job-card-print-area" className="bg-white text-gray-800 p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Job Card</h1>
                        {/* ADAPTED: partName -> productName */}
                        <p className="text-gray-600">Product: <span className="font-semibold">{details.productName}</span></p>
                        <p className="text-gray-600">Department: <span className="font-semibold">{details.departmentName}</span></p>
                    </div>
                    <div className="text-right">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(details.jobId)}&size=80x80`} alt="QR Code"/>
                       <p className="text-xs text-gray-500 mt-1">{details.jobId}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    <div>
                        {details.photoUrl ? ( <img src={details.photoUrl} alt={details.productName} className="rounded-lg object-cover w-full h-64 mb-4 border" /> ) : ( <div className="rounded-lg w-full h-64 mb-4 border bg-gray-100 flex items-center justify-center text-gray-400"><span>No Image Available</span></div> )}
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
                                {details.accessories?.length > 0 ? details.accessories.map((acc) => <li key={acc.id} className="ml-4">{acc.name}</li>) : null}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Required Consumables</h3>
                            <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm">
                                {details.processedConsumables?.length > 0 ? details.processedConsumables.map((c, i) => (
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
                     {/* ADAPTED: Ensure steps are mapped correctly */}
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
                        {(details.steps || []).length > 0 ? details.steps.map((step, i) => <li key={i}>{step.text || step}</li>) : <li>No steps defined.</li>}
                    </ol>
                </div>
            </div>
        </div>
    )
};


// --- Main Unified Component ---

const JobCardCreator = ({ campaignId }) => {
    // UNIFIED STATE: Combines state from both versions.
    const [allData, setAllData] = useState({ products: [], categories: [], departments: [], employees: [], allRecipes: [], tools: [], toolAccessories: [], allConsumables: [], allSkills: [] });
    const [loading, setLoading] = useState(true);
    // Uses new selection model
    const [selection, setSelection] = useState({ categoryId: '', productId: '', departmentId: '', employeeId: '' });
    const [jobDetails, setJobDetails] = useState(null);
    const [currentTemp, setCurrentTemp] = useState(20); // Default temp
    // State from old code for defining new recipes
    const [showDefineRecipeForm, setShowDefineRecipeForm] = useState(false);
    const [tempRecipeDetails, setTempRecipeDetails] = useState({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    const [isSavingNewRecipe, setIsSavingNewRecipe] = useState(false);

    // UNIFIED DATA FETCHING: Fetches new product catalog and data needed for recipe creation.
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const weatherResponse = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-33.92&longitude=18.42&current=temperature_2m");
                const weatherData = await weatherResponse.json();
                setCurrentTemp(weatherData.current.temperature_2m);

                const [prods, cats, depts, emps, recipes, tools, toolAccessories, consumables, skills] = await Promise.all([
                    getProducts(), getProductCategories(), getDepartments(), getEmployees(), getJobStepDetails(), getTools(), getToolAccessories(), getAllInventoryItems(), getSkills()
                ]);

                setAllData({ products: prods, categories: cats, departments: depts, employees: emps, allRecipes: recipes, tools, toolAccessories, allConsumables: consumables, allSkills: skills });
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                alert("Error fetching page data. Please check the console and refresh.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // SELECTION LOGIC from new code, with recipe form reset added from old.
    const handleSelection = (e) => {
        const { name, value } = e.target;
        setSelection(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'categoryId') { updated.productId = ''; }
            if (name === 'departmentId') { updated.employeeId = ''; }
            return updated;
        });
        // Reset recipe form when selections change
        setShowDefineRecipeForm(false);
        setTempRecipeDetails({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    };

    const filteredProducts = useMemo(() => allData.products.filter(p => p.categoryId === selection.categoryId), [allData.products, selection.categoryId]);
    const filteredEmployees = useMemo(() => allData.employees.filter(e => e.departmentId === selection.departmentId), [allData.employees, selection.departmentId]);

    // UNIFIED JOB DETAIL GENERATION: Handles both existing and new recipes.
    useEffect(() => {
        const updateJobDetails = async () => {
            const { productId, departmentId, employeeId } = selection;
            if (productId && departmentId) {
                const product = allData.products.find(p => p.id === productId);
                const department = allData.departments.find(d => d.id === departmentId);
                const employee = allData.employees.find(e => e.id === employeeId);

                const recipeId = `${productId}_${departmentId}`;
                const standardRecipe = allData.allRecipes.find(recipe => recipe.id === recipeId);

                let finalRecipeDetails = null;
                let finalRequiredSkills = [];

                if (standardRecipe) {
                    // Recipe exists, use it.
                    setShowDefineRecipeForm(false);
                    finalRecipeDetails = standardRecipe;
                    finalRequiredSkills = standardRecipe.requiredSkills || await getDepartmentSkills(departmentId);
                } else {
                    // No recipe found, show the form to create one.
                    setShowDefineRecipeForm(true);
                    finalRecipeDetails = {
                        description: tempRecipeDetails.description || product.name,
                        estimatedTime: tempRecipeDetails.estimatedTime || 0,
                        steps: tempRecipeDetails.steps.split('\n').filter(s => s.trim() !== ''),
                        tools: Array.from(tempRecipeDetails.tools),
                        accessories: Array.from(tempRecipeDetails.accessories),
                        consumables: tempRecipeDetails.consumables,
                    };
                    finalRequiredSkills = await getDepartmentSkills(departmentId);
                }

                const processed = processConsumables(finalRecipeDetails.consumables, allData.allConsumables, currentTemp);
                const toolsForDisplay = (finalRecipeDetails.tools || []).map(toolId => allData.tools.find(t => t.id === toolId)).filter(Boolean);
                const accessoriesForDisplay = (finalRecipeDetails.accessories || []).map(accId => allData.toolAccessories.find(a => a.id === accId)).filter(Boolean);


                setJobDetails({
                    jobId: `JOB-${Date.now()}`,
                    productName: product.name,
                    photoUrl: product.photoUrl,
                    productId: product.id,
                    departmentId: department.id,
                    departmentName: department.name,
                    employeeId: employee ? employee.id : 'unassigned',
                    employeeName: employee ? employee.name : 'Unassigned',
                    status: 'Pending',
                    description: finalRecipeDetails.description,
                    estimatedTime: parseFloat(finalRecipeDetails.estimatedTime) || 0,
                    // Pass raw steps for new recipe, or mapped steps for existing
                    steps: finalRecipeDetails.steps.map ? (finalRecipeDetails.steps.map(s => s.text || s)) : [],
                    // Pass full objects for preview
                    tools: toolsForDisplay,
                    accessories: accessoriesForDisplay,
                    // Pass raw consumables for saving, and processed for display
                    consumables: finalRecipeDetails.consumables || [],
                    processedConsumables: processed,
                    campaignId: campaignId || null,
                    requiredSkills: finalRequiredSkills,
                });
            } else {
                setJobDetails(null);
            }
        };
        updateJobDetails();
    }, [selection, allData, currentTemp, tempRecipeDetails, campaignId]);


    // --- Handlers from OLD code for recipe creation, adapted for new data model ---

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

    const handleResetFormAndPreview = () => {
        setSelection({ categoryId: '', productId: '', departmentId: '', employeeId: '' });
        setJobDetails(null);
        setShowDefineRecipeForm(false);
        setTempRecipeDetails({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    };

    const handlePrint = () => {
        const printContents = document.getElementById('job-card-print-area')?.innerHTML;
        if (printContents) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Print Job Card ${jobDetails.jobId}</title><style>body { margin: 0; padding: 20px; font-family: Arial, sans-serif; } @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } button { display: none; } }</style></head><body>${printContents}<div style="margin-top: 20px; text-align: center;"><button onclick="window.print()">Print This Job Card</button></div></body></html>`);
                printWindow.document.close();
            }
        }
    };
    
    // UNIFIED HANDLER for generating the job card.
    const handleGenerateNewJobCard = async () => {
        if (!jobDetails) return alert("Please select a product and department.");

        const confirmGenerate = window.confirm(`Create a new Job Card for "${jobDetails.productName}"?`);
        if (!confirmGenerate) return;

        try {
            // Map the unified jobDetails state to the firestore structure
            const finalJobData = {
              jobId: jobDetails.jobId,
              partName: jobDetails.productName, // Firestore expects partName
              partId: jobDetails.productId,   // Firestore expects partId
              departmentId: jobDetails.departmentId,
              departmentName: jobDetails.departmentName,
              employeeId: jobDetails.employeeId,
              employeeName: jobDetails.employeeName,
              status: 'Pending',
              description: jobDetails.description,
              estimatedTime: jobDetails.estimatedTime,
              // Send simple text array for steps
              steps: (jobDetails.steps || []).map(s => (s && s.text) ? s.text : s),
              tools: allData.tools.filter(t => (jobDetails.tools.map(tool => tool.id) || []).includes(t.id)),
              accessories: allData.toolAccessories.filter(a => (jobDetails.accessories.map(acc => acc.id) || []).includes(a.id)),
              processedConsumables: jobDetails.processedConsumables,
              isCustomJob: false,
              campaignId: jobDetails.campaignId,
              requiredSkills: jobDetails.requiredSkills,
              consumables: jobDetails.consumables,
            };

            await addJobCard(finalJobData);
            alert(`New Job Card ${finalJobData.jobId} created successfully!`);
            handlePrint();
            handleResetFormAndPreview();
        } catch (error) {
            console.error("Error generating new job card:", error);
            alert("Failed to generate new job card.");
        }
    };
    
    const saveNewRecipeAndCreateJob = async () => {
        if (!jobDetails || !selection.productId || !selection.departmentId) return;
        if (!tempRecipeDetails.description.trim() || !tempRecipeDetails.estimatedTime || !tempRecipeDetails.steps.trim()) {
            return alert("Please fill in Description, Estimated Time, and Steps for the new recipe.");
        }
        
        setIsSavingNewRecipe(true);
        try {
            // ADAPTED: Uses productId instead of partId
            const recipeData = {
                description: tempRecipeDetails.description.trim(),
                estimatedTime: Number(tempRecipeDetails.estimatedTime),
                // Create step objects as expected by the new model
                steps: tempRecipeDetails.steps.split('\n').filter(s => s.trim() !== '').map((s, i) => ({ text: s, time: 0, order: i })),
                tools: Array.from(tempRecipeDetails.tools),
                accessories: Array.from(tempRecipeDetails.accessories),
                consumables: tempRecipeDetails.consumables,
                requiredSkills: jobDetails.requiredSkills || [],
            };
            // Uses productId now
            await setJobStepDetail(selection.productId, selection.departmentId, recipeData);
            alert("New recipe saved successfully! Now creating the job card.");

            // Create the job
            await handleGenerateNewJobCard();

            // Refresh local recipe data
            const updatedRecipes = await getJobStepDetails();
            setAllData(prev => ({ ...prev, allRecipes: updatedRecipes }));
            
        } catch (error) {
            console.error("Error saving new recipe or creating job:", error);
            alert("Failed to save new recipe or create job. Please try again.");
        } finally {
            setIsSavingNewRecipe(false);
        }
    };

    // RENDER LOGIC from old code to switch between buttons.
    const renderActionButton = () => {
        if (!jobDetails) return null;
        if (showDefineRecipeForm) {
            return (
                <Button onClick={saveNewRecipeAndCreateJob} variant="primary" disabled={isSavingNewRecipe}>
                    {isSavingNewRecipe ? 'Saving...' : 'Define Recipe & Create Job'}
                </Button>
            );
        } else {
            return (
                <Button onClick={handleGenerateNewJobCard} variant="primary">
                    Generate New Job Card
                </Button>
            );
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading Product Catalog & Recipes...</p>;

    // UNIFIED RENDERED JSX
    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mt-8">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">
                    Create New Job from Catalog
                </h3>
                 {/* Uses new dropdown structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Dropdown label="1. Product Category" name="categoryId" value={selection.categoryId} onChange={handleSelection} options={allData.categories} placeholder="Select Category" />
                    <Dropdown label="2. Product" name="productId" value={selection.productId} onChange={handleSelection} options={filteredProducts} placeholder="Select Product" disabled={!selection.categoryId} />
                    <Dropdown label="3. Department" name="departmentId" value={selection.departmentId} onChange={handleSelection} options={allData.departments} placeholder="Select Department" />
                    <Dropdown label="4. Employee (Optional)" name="employeeId" value={selection.employeeId} onChange={handleSelection} options={filteredEmployees} placeholder="Select Employee..." disabled={!selection.departmentId} />
                </div>
                
                 {/* The recipe definition form, shown conditionally */}
                {showDefineRecipeForm && selection.productId && selection.departmentId && (
                    <div className="mt-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700 animate-fade-in">
                        <h4 className="text-xl font-bold text-white mb-4">Define Recipe for New Product-Department Combination</h4>
                        <p className="text-gray-400 text-sm mb-4">No standard recipe found. Please define it now to create the first job card and save for future use.</p>
                        <div className="space-y-4">
                            <Input label="Description" name="description" value={tempRecipeDetails.description} onChange={handleTempRecipeInputChange} placeholder="e.g., Final assembly of side skirt" />
                            <Input label="Estimated Time (minutes)" name="estimatedTime" type="number" value={tempRecipeDetails.estimatedTime} onChange={handleTempRecipeInputChange} placeholder="e.g., 45" />
                            <Textarea label="Steps (one per line)" name="steps" value={tempRecipeDetails.steps} onChange={handleTempRecipeInputChange} rows={5} placeholder="1. Align panels...&#10;2. Apply adhesive..." />
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
                
                 {jobDetails && (
                    <div className="mt-8 text-center">
                        {renderActionButton()}
                    </div>
                )}
            </div>
            {jobDetails && <JobCardPreview details={jobDetails} />}
        </>
    );
};

export default JobCardCreator;