// src/components/features/job_cards/JobCardCreator.jsx (Upgraded with Print Confirmation)

import React, { useState, useEffect, useMemo } from 'react';
import {
    getProducts, getProductCategories,
    getDepartments, getEmployees, addJobCard, getJobStepDetails, getTools,
    getToolAccessories, getAllInventoryItems, getDepartmentSkills,
    setJobStepDetail,
    getSkills // --- IMPORT ADDED ---
} from '../../../api/firestore';
import { processConsumables } from '../../../utils/jobUtils';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import Textarea from '../../ui/Textarea';
import Input from '../../ui/Input';
import ConsumableEditor from '/src/components/features/recipes/ConsumableEditor.jsx';
import PrintConfirmationModal from './PrintConfirmationModal';
import toast from 'react-hot-toast';

const JobCardPreview = ({ details }) => {
    if (!details) return null;
    return (
        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Generated Job Card Preview</h2>
            <div id="job-card-print-area" className="bg-white text-gray-800 p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Job Card</h1>
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
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
                        {(details.steps || []).length > 0 ? details.steps.map((step, i) => <li key={i}>{step.text || step}</li>) : <li>No steps defined.</li>}
                    </ol>
                </div>
            </div>
        </div>
    )
};

const JobCardCreator = ({ campaignId }) => {
    const [allData, setAllData] = useState({ products: [], categories: [], departments: [], employees: [], allRecipes: [], tools: [], toolAccessories: [], allConsumables: [], allSkills: [] });
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({ categoryId: '', productId: '', departmentId: '', employeeId: '' });
    const [jobDetails, setJobDetails] = useState(null);
    const [currentTemp, setCurrentTemp] = useState(20);
    const [showDefineRecipeForm, setShowDefineRecipeForm] = useState(false);
    const [tempRecipeDetails, setTempRecipeDetails] = useState({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    const [isSavingNewRecipe, setIsSavingNewRecipe] = useState(false);
    const [jobToConfirm, setJobToConfirm] = useState(null);

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
                toast.error("Error fetching page data.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const handleSelection = (e) => {
        const { name, value } = e.target;
        setSelection(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'categoryId') { updated.productId = ''; }
            if (name === 'departmentId') { updated.employeeId = ''; }
            return updated;
        });
        setShowDefineRecipeForm(false);
        setTempRecipeDetails({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    };

    const filteredProducts = useMemo(() => allData.products.filter(p => p.categoryId === selection.categoryId), [allData.products, selection.categoryId]);
    const filteredEmployees = useMemo(() => allData.employees.filter(e => e.departmentId === selection.departmentId), [allData.employees, selection.departmentId]);

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
                    setShowDefineRecipeForm(false);
                    finalRecipeDetails = standardRecipe;
                    finalRequiredSkills = standardRecipe.requiredSkills || await getDepartmentSkills(departmentId);
                } else {
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
                    steps: finalRecipeDetails.steps.map ? (finalRecipeDetails.steps.map(s => s.text || s)) : [],
                    tools: toolsForDisplay,
                    accessories: accessoriesForDisplay,
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
        setJobToConfirm(null);
    };

    const handlePrint = () => {
        const printContents = document.getElementById('job-card-print-area')?.innerHTML;
        if (printContents) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Print Job Card ${jobDetails.jobId}</title></head><body>${printContents}</body></html>`);
                printWindow.document.close();
                printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
            }
        }
    };
    
    const handleGenerateNewJobCard = () => {
        if (!jobDetails) return toast.error("Please select a product and department.");
        setJobToConfirm(jobDetails);
    };
    
    const saveNewRecipeAndCreateJob = async () => {
        if (!jobDetails || !selection.productId || !selection.departmentId) return;
        if (!tempRecipeDetails.description.trim() || !tempRecipeDetails.estimatedTime || !tempRecipeDetails.steps.trim()) {
            return toast.error("Please fill in Description, Estimated Time, and Steps for the new recipe.");
        }
        
        setIsSavingNewRecipe(true);
        try {
            const recipeData = {
                description: tempRecipeDetails.description.trim(),
                estimatedTime: Number(tempRecipeDetails.estimatedTime),
                steps: tempRecipeDetails.steps.split('\n').filter(s => s.trim() !== '').map((s, i) => ({ text: s, time: 0, order: i })),
                tools: Array.from(tempRecipeDetails.tools),
                accessories: Array.from(tempRecipeDetails.accessories),
                consumables: tempRecipeDetails.consumables,
                requiredSkills: jobDetails.requiredSkills || [],
            };
            await setJobStepDetail(selection.productId, selection.departmentId, recipeData);
            toast.success("New recipe saved successfully!");
            
            setJobToConfirm(jobDetails);

        } catch (error) {
            console.error("Error saving new recipe:", error);
            toast.error("Failed to save new recipe.");
        } finally {
            setIsSavingNewRecipe(false);
        }
    };

    const handleConfirmPrint = async () => {
        if (!jobToConfirm) return;
        try {
            await addJobCard(jobToConfirm);
            toast.success(`Job Card ${jobToConfirm.jobId} created successfully!`);
            handlePrint();
            handleResetFormAndPreview();
        } catch (error) {
            console.error("Error generating job card:", error);
            toast.error("Failed to generate job card.");
        }
    };

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

    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mt-8">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">
                    Create New Job from Catalog
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Dropdown label="1. Product Category" name="categoryId" value={selection.categoryId} onChange={handleSelection} options={allData.categories} placeholder="Select Category..." />
                    <Dropdown label="2. Product" name="productId" value={selection.productId} onChange={handleSelection} options={filteredProducts} placeholder="Select Product..." disabled={!selection.categoryId} />
                    <Dropdown label="3. Department" name="departmentId" value={selection.departmentId} onChange={handleSelection} options={allData.departments} placeholder="Select Department..." />
                    <Dropdown label="4. Employee (Optional)" name="employeeId" value={selection.employeeId} onChange={handleSelection} options={filteredEmployees} placeholder="Select Employee..." disabled={!selection.departmentId} />
                </div>
                
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
                                <ConsumableEditor
                                    allConsumables={allData.allConsumables}
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

export default JobCardCreator;
