import React, { useState, useEffect, useMemo } from 'react';
import { getManufacturers, getMakes, getModels, getParts, getDepartments, getEmployees, addJobCard, getJobStepDetails, getTools, getToolAccessories, getAllInventoryItems } from '../../../api/firestore';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';

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
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">{details.steps?.length > 0 ? details.steps.map((step, i) => <li key={i}>{step}</li>) : <li>No steps defined.</li>}</ol>
                </div>
            </div>
        </div>
    )
};

const JobCardCreator = () => {
    const [allData, setAllData] = useState({ manufacturers:[], makes:[], models:[], parts:[], departments:[], employees:[], jobSteps: [], tools: [], toolAccessories: [], allConsumables: [] });
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({ manufacturerId: '', makeId: '', modelId: '', partId: '', departmentId: '', employeeId: '' });
    const [jobDetails, setJobDetails] = useState(null);
    const [currentTemp, setCurrentTemp] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const weatherResponse = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-33.92&longitude=18.42&current=temperature_2m");
                const weatherData = await weatherResponse.json();
                setCurrentTemp(weatherData.current.temperature_2m);

                const [man, mak, mod, par, dep, emp, steps, t, ta, inv] = await Promise.all([
                    getManufacturers(), getMakes(), getModels(), getParts(), getDepartments(), getEmployees(), getJobStepDetails(), getTools(), getToolAccessories(), getAllInventoryItems()
                ]);
                
                setAllData({ manufacturers: man, makes: mak, models: mod, parts: par, departments: dep, employees: emp, jobSteps: steps, tools: t, toolAccessories: ta, allConsumables: inv });

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                alert("Error fetching page data. Please check the console and refresh.");
                if (currentTemp === null) setCurrentTemp(20); 
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const processRecipeConsumables = (consumablesFromRecipe, allConsumablesList, temp) => {
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
            if (!masterItem) continue;

            if (consumable.type === 'fixed') {
                processedList.push({ ...masterItem, quantity: consumable.quantity, notes: '' });
                
                if (masterItem.requiresCatalyst && catalystItem) {
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
            } 
            else if (consumable.type === 'dimensional') {
                processedList.push({ ...masterItem, cuts: consumable.cuts, notes: `See ${consumable.cuts.length} cutting instruction(s)` });
            }
        }
        return processedList;
    };

    const handleSelection = (e) => {
        const { name, value } = e.target;
        setSelection(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'manufacturerId') { updated.makeId = ''; updated.modelId = ''; updated.partId = ''; }
            if (name === 'makeId') { updated.modelId = ''; updated.partId = ''; }
            if (name === 'modelId') { updated.partId = ''; }
            if (name === 'departmentId') { updated.employeeId = ''; }
            return updated;
        });
    };

    const filteredMakes = useMemo(() => allData.makes.filter(m => m.manufacturerId === selection.manufacturerId), [allData.makes, selection.manufacturerId]);
    const filteredModels = useMemo(() => allData.models.filter(m => m.makeId === selection.makeId), [allData.models, selection.makeId]);
    const filteredParts = useMemo(() => allData.parts.filter(p => p.modelId === selection.modelId), [allData.parts, selection.modelId]);
    const filteredEmployees = useMemo(() => allData.employees.filter(e => e.departmentId === selection.departmentId), [allData.employees, selection.departmentId]);

    useEffect(() => {
        const { partId, departmentId, employeeId } = selection;
        if (partId && departmentId && employeeId && currentTemp !== null) {
            const part = allData.parts.find(p => p.id === partId);
            const department = allData.departments.find(d => d.id === departmentId);
            const employee = allData.employees.find(e => e.id === employeeId);
            const recipe = allData.jobSteps.find(step => step.partId === partId && step.departmentId === departmentId);

            if (part && department && employee) {
              const processedConsumables = processRecipeConsumables(recipe?.consumables, allData.allConsumables, currentTemp);
              
              setJobDetails({
                  jobId: `JOB-${Date.now()}`,
                  partName: part.name, photoUrl: part.photoUrl || '', departmentName: department.name, employeeId: employee.id, employeeName: employee.name, status: 'Pending',
                  description: recipe?.description || 'N/A', estimatedTime: recipe?.estimatedTime || 0, steps: recipe?.steps || [],
                  tools: (recipe?.tools || []).map(toolId => allData.tools.find(t => t.id === toolId)).filter(Boolean),
                  accessories: (recipe?.accessories || []).map(accId => allData.toolAccessories.find(a => a.id === accId)).filter(Boolean),
                  consumables: recipe?.consumables || [],
                  processedConsumables: processedConsumables,
              });
            }
        } else {
            setJobDetails(null);
        }
    }, [selection, allData, currentTemp]);

    const handlePrintAndCreate = async () => {
        if (!jobDetails) return;
        try {
            await addJobCard(jobDetails);
            alert(`Job Card ${jobDetails.jobId} created successfully!`);
            const printContents = document.getElementById('job-card-print-area').innerHTML;
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow.document.write(`<html><head><title>Print Job Card</title><script src="https://cdn.tailwindcss.com/"></script></head><body><div class="p-8">${printContents}</div></body></html>`);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } catch (error) {
            console.error("Error creating job card:", error);
            alert("Failed to create job card.");
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading settings data...</p>;

    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Dropdown label="1. Manufacturer" name="manufacturerId" value={selection.manufacturerId} onChange={handleSelection} options={allData.manufacturers} placeholder="Select Manufacturer" />
                    <Dropdown label="2. Make" name="makeId" value={selection.makeId} onChange={handleSelection} options={filteredMakes} placeholder="Select Make" disabled={!selection.manufacturerId} />
                    <Dropdown label="3. Model" name="modelId" value={selection.modelId} onChange={handleSelection} options={filteredModels} placeholder="Select Model" disabled={!selection.makeId} />
                    <Dropdown label="4. Part" name="partId" value={selection.partId} onChange={handleSelection} options={filteredParts} placeholder="Select Part" disabled={!selection.modelId} />
                    <Dropdown label="5. Department" name="departmentId" value={selection.departmentId} onChange={handleSelection} options={allData.departments} placeholder="Select Department" />
                    <Dropdown label="6. Employee" name="employeeId" value={selection.employeeId} onChange={handleSelection} options={filteredEmployees} placeholder="Select Employee" disabled={!selection.departmentId} />
                </div>
                {jobDetails && (
                    <div className="mt-8 text-center">
                        <Button onClick={handlePrintAndCreate} variant="primary">Print & Create Job</Button>
                    </div>
                )}
            </div>
            {jobDetails && <JobCardPreview details={jobDetails} />}
        </>
    );
};

export default JobCardCreator;