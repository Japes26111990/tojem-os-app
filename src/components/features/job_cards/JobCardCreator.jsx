// src/components/features/job_cards/JobCardCreator.jsx (Upgraded with Print Confirmation, Quantity, VIN, and Category)

import React, { useState, useEffect, useMemo } from 'react';
import {
    getProducts, getProductCategories,
    getDepartments, getEmployees, addJobCard, getJobStepDetails, getTools,
    getToolAccessories, getAllInventoryItems, getDepartmentSkills,
    setJobStepDetail,
    getSkills
} from '../../../api/firestore';
import { processConsumables } from '../../../utils/jobUtils';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import Textarea from '../../ui/Textarea';
import Input from '../../ui/Input';
import ConsumableEditor from '/src/components/features/recipes/ConsumableEditor.jsx';
import PrintConfirmationModal from './PrintConfirmationModal';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

// Base64 encoded logo to ensure it prints correctly
const tojemLogoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA... (base64 string would be very long)"; // Replace with your actual full base64 string

const JobCardCreator = ({ campaignId }) => {
    const [allData, setAllData] = useState({ products: [], categories: [], departments: [], employees: [], allRecipes: [], tools: [], toolAccessories: [], allConsumables: [], allSkills: [] });
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({ categoryId: '', productId: '', departmentId: '', employeeId: '', quantity: 1, vinNumber: '', jobCategory: 'Production' });
    const [jobDetails, setJobDetails] = useState(null);
    const [currentTemp, setCurrentTemp] = useState(20);
    const [showDefineRecipeForm, setShowDefineRecipeForm] = useState(false);
    const [tempRecipeDetails, setTempRecipeDetails] = useState({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
    const [isSavingNewRecipe, setIsSavingNewRecipe] = useState(false);
    const [jobToConfirm, setJobToConfirm] = useState(null);

    const jobCategoryOptions = [
        { id: 'Production', name: 'Production' },
        { id: 'Development', name: 'Development' },
        { id: 'Maintenance', name: 'Maintenance' },
    ];

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

    const recipeRequiresVin = useMemo(() => {
        const { productId, departmentId } = selection;
        if (productId && departmentId) {
            const recipeId = `${productId}_${departmentId}`;
            const standardRecipe = allData.allRecipes.find(recipe => recipe.id === recipeId);
            return standardRecipe?.requiresVin || false;
        }
        return false;
    }, [selection, allData.allRecipes]);

    useEffect(() => {
        const updateJobDetails = async () => {
            const { productId, departmentId, employeeId, quantity, vinNumber, jobCategory } = selection;
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
                    quantity: Number(quantity) || 1,
                    vinNumber: recipeRequiresVin ? vinNumber : null,
                    jobCategory: jobCategory,
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
    }, [selection, allData, currentTemp, tempRecipeDetails, campaignId, recipeRequiresVin]);

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
        setSelection({ categoryId: '', productId: '', departmentId: '', employeeId: '', quantity: 1, vinNumber: '', jobCategory: 'Production' });
        setJobDetails(null);
        setShowDefineRecipeForm(false);
        setTempRecipeDetails({ description: '', estimatedTime: '', steps: '', tools: new Set(), accessories: new Set(), consumables: [] });
        setJobToConfirm(null);
    };
    
    const handleGenerateNewJobCard = () => {
        if (!jobDetails) return toast.error("Please select a product and department.");
        // --- ADDED: Time validation ---
        if (!jobDetails.estimatedTime || jobDetails.estimatedTime <= 0) {
            return toast.error("A valid estimated time is required to create this job card.");
        }
        if (recipeRequiresVin && !selection.vinNumber.trim()) {
            return toast.error("This job requires a VIN number.");
        }
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
            
            const qrCodeDataUrl = await QRCode.toDataURL(jobToConfirm.jobId, { width: 80 });

            // --- UPDATED: Using base64 logo ---
            const printContents = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <div>
                            <img src="${tojemLogoBase64}" alt="Company Logo" style="height: 50px; margin-bottom: 10px;"/>
                            <h1 style="font-size: 28px; font-weight: bold; margin: 0;">Job Card</h1>
                            <p style="font-size: 14px; color: #666; margin: 0;">Part: <span style="font-weight: 600;">${jobToConfirm.productName} (x${jobToConfirm.quantity})</span></p>
                            <p style="font-size: 14px; color: #666; margin: 0;">Department: <span style="font-weight: 600;">${jobToConfirm.departmentName}</span></p>
                            ${jobToConfirm.vinNumber ? `<p style="font-size: 14px; color: #666; margin: 0;">VIN: <span style="font-weight: 600;">${jobToConfirm.vinNumber}</span></p>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <img src="${qrCodeDataUrl}" alt="QR Code" style="margin-bottom: 5px;"/>
                            <p style="font-size: 10px; color: #999; margin: 0;">${jobToConfirm.jobId}</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                            ${jobToConfirm.photoUrl ? `<img src="${jobToConfirm.photoUrl}" alt="${jobToConfirm.productName}" style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover; margin-bottom: 15px; border: 1px solid #ddd;" />` : `<div style="border-radius: 8px; width: 100%; height: 150px; margin-bottom: 15px; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #aaa; border: 1px solid #ddd;"><span>No Image</span></div>`}
                            <div style="font-size: 13px; line-height: 1.6;">
                                <p style="margin: 0;"><b>Employee:</b> ${jobToConfirm.employeeName}</p>
                                <p style="margin: 0;"><b>Est. Time:</b> ${jobToConfirm.estimatedTime || 'N/A'} mins</p>
                                <p style="margin: 0;"><b>Description:</b> ${jobToConfirm.description || 'No description.'}</p>
                            </div>
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
                printWindow.document.write(`<html><head><title>Job Card ${jobToConfirm.jobId}</title></head><body>${printContents}</body></html>`);
                printWindow.document.close();
                printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
            } else {
                toast("The print window was blocked. Please allow popups.", { icon: 'ℹ️' });
            }

            handleResetFormAndPreview();

        } catch (error) {
            console.error("Error creating job card:", error);
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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Dropdown label="1. Product Category" name="categoryId" value={selection.categoryId} onChange={handleSelection} options={allData.categories} placeholder="Select Category..." />
                    <Dropdown label="2. Product" name="productId" value={selection.productId} onChange={handleSelection} options={filteredProducts} placeholder="Select Product..." disabled={!selection.categoryId} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="3. Quantity" name="quantity" type="number" min="1" value={selection.quantity} onChange={handleSelection} />
                        <Dropdown label="4. Department" name="departmentId" value={selection.departmentId} onChange={handleSelection} options={allData.departments} placeholder="Select Dept..." />
                    </div>
                    <Dropdown label="5. Employee (Optional)" name="employeeId" value={selection.employeeId} onChange={handleSelection} options={filteredEmployees} placeholder="Select Employee..." disabled={!selection.departmentId} />
                    <Dropdown label="6. Job Category" name="jobCategory" value={selection.jobCategory} onChange={handleSelection} options={jobCategoryOptions} />
                    {recipeRequiresVin && (
                        <Input label="7. VIN Number" name="vinNumber" value={selection.vinNumber} onChange={handleSelection} placeholder="Enter Vehicle VIN..." />
                    )}
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
