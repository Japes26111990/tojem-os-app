import React, { useState, useEffect, useMemo } from 'react';
import { getManufacturers, addManufacturer, getMakes, addMake, getModels, addModel, getParts, addPart, updatePart, getDepartments, getTools, getToolAccessories, getAllInventoryItems, getJobStepDetails, setJobStepDetail } from '../../../api/firestore';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import { FilePlus } from 'lucide-react';

const ConsumableEditor = ({ consumables, selectedConsumables, onAdd, onRemove }) => {
    const [consumableType, setConsumableType] = useState('fixed');
    const [fixedId, setFixedId] = useState('');
    const [fixedQty, setFixedQty] = useState('');
    const [dimId, setDimId] = useState('');
    const [cuts, setCuts] = useState([]);
    const [cutRule, setCutRule] = useState({ dimensions: '', notes: '' });

    const handleAddConsumable = () => {
        let newConsumable;
        switch (consumableType) {
            case 'fixed':
                if (!fixedId || !fixedQty) return alert("Please select an item and enter a quantity.");
                newConsumable = { type: 'fixed', itemId: fixedId, quantity: Number(fixedQty) };
                break;
            case 'dimensional':
                if (!dimId || cuts.length === 0) return alert("Please select a material and add at least one cutting instruction.");
                newConsumable = { type: 'dimensional', itemId: dimId, cuts };
                break;
            default: return;
        }

        if (!selectedConsumables.find(c => c.itemId === newConsumable.itemId)) {
            onAdd(newConsumable);
            setFixedId(''); setFixedQty('');
            setDimId(''); setCuts([]); setCutRule({ dimensions: '', notes: '' });
        } else {
            alert("This consumable has already been added to the recipe.");
        }
    };

    const getConsumableName = (id) => consumables.find(c => c.id === id)?.name || 'Unknown Item';

    return (
        <div>
            <h4 className="font-semibold mb-2">Required Consumables</h4>
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                <div className="flex gap-2 bg-gray-800 p-1 rounded-md">
                    <button type="button" onClick={() => setConsumableType('fixed')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'fixed' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Fixed Quantity</button>
                    <button type="button" onClick={() => setConsumableType('dimensional')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'dimensional' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Dimensional Cuts</button>
                </div>

                {consumableType === 'fixed' && (
                    <div className="flex items-end gap-2 animate-fade-in">
                        <div className="flex-grow"><Dropdown label="Item" value={fixedId} onChange={e => setFixedId(e.target.value)} options={consumables} placeholder="Select..."/></div>
                        <div className="w-24"><Input label="Qty" type="number" value={fixedQty} onChange={e => setFixedQty(e.target.value)} placeholder="e.g., 5"/></div>
                        <Button type="button" onClick={handleAddConsumable}>Add</Button>
                    </div>
                )}
                
                {consumableType === 'dimensional' && (
                     <div className="space-y-3 animate-fade-in">
                        <Dropdown label="Material to Cut" value={dimId} onChange={e => setDimId(e.target.value)} options={consumables.filter(c => c.name.toLowerCase().includes('mat'))} placeholder="Select mat..."/>
                        <div className="p-2 border border-gray-700 rounded-md">
                             <p className="text-xs text-gray-400 mb-2">Cutting Instructions</p>
                            <div className="flex items-end gap-2">
                                <Input label="Dimensions (e.g., 120cm x 80cm)" value={cutRule.dimensions} onChange={e => setCutRule({...cutRule, dimensions: e.target.value})} />
                                <Input label="Notes" value={cutRule.notes} onChange={e => setCutRule({...cutRule, notes: e.target.value})} />
                                <Button type="button" onClick={() => { if(cutRule.dimensions) { setCuts([...cuts, cutRule]); setCutRule({ dimensions: '', notes: '' }); }}}>Add Cut</Button>
                            </div>
                            <ul className="text-xs mt-2 space-y-1">{cuts.map((c, i) => <li key={i}>{c.dimensions} ({c.notes})</li>)}</ul>
                        </div>
                        <Button type="button" onClick={handleAddConsumable} className="w-full">Add Dimensional Consumable</Button>
                    </div>
                )}

                <h5 className="text-sm font-bold pt-2 border-t border-gray-700">Recipe Consumables</h5>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedConsumables.map((c, i) => (
                        <li key={i} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm">
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

const PartEditor = ({ part, departments, tools, toolAccessories, consumables, allJobSteps, onSaveRecipe, onPartUpdate }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [steps, setSteps] = useState('');
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [selectedAccessories, setSelectedAccessories] = useState(new Set());
  const [selectedConsumables, setSelectedConsumables] = useState([]);
  const [partName, setPartName] = useState(part.name);
  const [partPhotoUrl, setPartPhotoUrl] = useState(part.photoUrl || '');
  
  useEffect(() => {
    setPartName(part.name);
    setPartPhotoUrl(part.photoUrl || '');
    setActiveTab('details');
    setSelectedDepartmentId('');
  }, [part]);

  useEffect(() => {
    if (selectedDepartmentId) {
      const existingStep = allJobSteps.find(step => step.partId === part.id && step.departmentId === selectedDepartmentId);
      if (existingStep) {
        setDescription(existingStep.description || '');
        setEstimatedTime(existingStep.estimatedTime || '');
        setSteps((existingStep.steps || []).join('\n'));
        setSelectedTools(new Set(existingStep.tools || []));
        setSelectedAccessories(new Set(existingStep.accessories || []));
        setSelectedConsumables(existingStep.consumables || []);
      } else {
        setDescription(''); setEstimatedTime(''); setSteps('');
        setSelectedTools(new Set()); setSelectedAccessories(new Set()); setSelectedConsumables([]);
      }
    }
  }, [selectedDepartmentId, part.id, allJobSteps]);

  const handleSavePartDetails = () => onPartUpdate(part.id, { name: partName, photoUrl: partPhotoUrl });
  
  const handleSaveRecipeDetails = () => {
    const recipeData = { description, estimatedTime: Number(estimatedTime), steps: steps.split('\n').filter(s => s.trim() !== ''), tools: Array.from(selectedTools), accessories: Array.from(selectedAccessories), consumables: selectedConsumables };
    onSaveRecipe(part.id, selectedDepartmentId, recipeData);
  };
  
  const handleToolToggle = (toolId) => {
    const newTools = new Set(selectedTools);
    if (newTools.has(toolId)) {
        newTools.delete(toolId);
        const accessoriesOfTool = toolAccessories.filter(a => a.toolId === toolId).map(a => a.id);
        const newAccessories = new Set(selectedAccessories);
        accessoriesOfTool.forEach(accId => newAccessories.delete(accId));
        setSelectedAccessories(newAccessories);
    } else { newTools.add(toolId); }
    setSelectedTools(newTools);
  };

  const handleAccessoryToggle = (accId) => {
      const newAccessories = new Set(selectedAccessories);
      newAccessories.has(accId) ? newAccessories.delete(accId) : newAccessories.add(accId);
      setSelectedAccessories(newAccessories);
  };

  const handleAddConsumableToList = (consumable) => setSelectedConsumables([...selectedConsumables, consumable]);
  const handleRemoveConsumableFromList = (itemId) => setSelectedConsumables(selectedConsumables.filter(c => c.itemId !== itemId));

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-4">Dossier: <span className="text-blue-400">{part.name}</span></h3>
        <div className="flex border-b border-gray-600 mb-6">
            <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Part Details</button>
            <button onClick={() => setActiveTab('recipe')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'recipe' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Recipe Book</button>
        </div>

        {activeTab === 'details' && ( <div className="space-y-4 animate-fade-in"> <Input label="Part Name" value={partName} onChange={e => setPartName(e.target.value)} /> <Input label="Photo URL" value={partPhotoUrl} onChange={e => setPartPhotoUrl(e.target.value)} placeholder="https://example.com/image.png" /> <Button onClick={handleSavePartDetails} variant="primary">Save Part Details</Button> </div> )}
        {activeTab === 'recipe' && (
            <div className="space-y-6 animate-fade-in">
                <Dropdown label="Select a Department to Define its Recipe" value={selectedDepartmentId} onChange={e => setSelectedDepartmentId(e.target.value)} options={departments} placeholder="Choose department..."/>
                {selectedDepartmentId && (
                     <div className="space-y-6 border-t border-gray-700 pt-6">
                        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Final assembly of side skirt" />
                        <Input label="Estimated Time (minutes)" type="number" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} placeholder="e.g., 45" />
                        <Textarea label="Steps (one per line)" value={steps} onChange={e => setSteps(e.target.value)} rows={5} placeholder="1. Align panels..." />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           <div>
                                <h4 className="font-semibold mb-2">Required Tools & Accessories</h4>
                                <div className="max-h-60 overflow-y-auto space-y-3 p-4 bg-gray-900/50 rounded-lg">
                                {(tools || []).map(tool => ( <div key={tool.id}> <label className="flex items-center space-x-2 text-sm font-semibold"> <input type="checkbox" checked={selectedTools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} /> <span>{tool.name}</span> </label> {selectedTools.has(tool.id) && ( <div className="pl-8 mt-2 space-y-2 border-l-2 border-gray-700"> {(toolAccessories.filter(acc => acc.toolId === tool.id)).map(accessory => ( <label key={accessory.id} className="flex items-center space-x-2 text-sm text-gray-300"> <input type="checkbox" checked={selectedAccessories.has(accessory.id)} onChange={() => handleAccessoryToggle(accessory.id)} /> <span>{accessory.name}</span> </label> ))} </div> )} </div> ))}
                                </div>
                            </div>
                            <ConsumableEditor consumables={consumables} selectedConsumables={selectedConsumables} onAdd={handleAddConsumableToList} onRemove={handleRemoveConsumableFromList} />
                        </div>
                        <div className="text-right"> <Button onClick={handleSaveRecipeDetails} variant="primary" className="bg-green-600 hover:bg-green-700">Save Recipe for this Department</Button> </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

const ProductRecipeManager = () => {
    const [manufacturers, setManufacturers] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [parts, setParts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [tools, setTools] = useState([]);
    const [toolAccessories, setToolAccessories] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [allJobSteps, setAllJobSteps] = useState([]);
    const [selectedManufacturerId, setSelectedManufacturerId] = useState(null);
    const [selectedMakeId, setSelectedMakeId] = useState(null);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [selectedPartId, setSelectedPartId] = useState(null);
    
    const fetchData = async () => {
        const [man, mak, mod, par, dep, t, ta, inv, steps] = await Promise.all([ getManufacturers(), getMakes(), getModels(), getParts(), getDepartments(), getTools(), getToolAccessories(), getAllInventoryItems(), getJobStepDetails() ]);
        setManufacturers(man); setMakes(mak); setModels(mod); setParts(par); setDepartments(dep); setTools(t); setToolAccessories(ta); 
        const inventoryItems = inv.map(item => ({ id: item.id, name: item.name }));
        setConsumables(inventoryItems); 
        setAllJobSteps(steps);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSelect = (level, id) => {
        if (level === 'manufacturer') {
            setSelectedManufacturerId(id);
            setSelectedMakeId(null); setSelectedModelId(null); setSelectedPartId(null);
        } else if (level === 'make') {
            setSelectedMakeId(id);
            setSelectedModelId(null); setSelectedPartId(null);
        } else if (level === 'model') {
            setSelectedModelId(id);
            setSelectedPartId(null);
        } else if (level === 'part') {
            setSelectedPartId(id);
        }
    };

    const handleAdd = async (level) => {
        let name;
        if (level === 'manufacturer') {
            name = prompt("Enter new manufacturer name:");
            if (name) { await addManufacturer(name); }
        } else if (level === 'make') {
            name = prompt(`Enter new make name for ${manufacturers.find(m=>m.id===selectedManufacturerId).name}:`);
            if (name) { await addMake({ name, manufacturerId: selectedManufacturerId }); }
        } else if (level === 'model') {
            name = prompt(`Enter new model name for ${makes.find(m=>m.id===selectedMakeId).name}:`);
            if (name) { await addModel({ name, makeId: selectedMakeId }); }
        } else if (level === 'part') {
            name = prompt(`Enter new part name for ${models.find(m=>m.id===selectedModelId).name}:`);
            if (name) { await addPart({ name, modelId: selectedModelId, photoUrl: '' }); }
        }
        fetchData();
    };
    
    const handleSaveRecipe = async (partId, departmentId, recipeData) => {
        try {
            await setJobStepDetail(partId, departmentId, recipeData);
            alert("Recipe saved successfully!");
            const steps = await getJobStepDetails();
            setAllJobSteps(steps);
        } catch (error) {
            console.error("Error saving recipe:", error);
            alert("Failed to save recipe.");
        }
    };

    const handlePartUpdate = async (partId, updatedData) => {
        try {
            await updatePart(partId, updatedData);
            alert("Part details updated!");
            fetchData();
        } catch(error) {
            console.error("Error updating part:", error);
            alert("Failed to update part.");
        }
    };


    const filteredMakes = useMemo(() => manufacturers.length > 0 ? makes.filter(m => m.manufacturerId === selectedManufacturerId) : [], [makes, selectedManufacturerId]);
    const filteredModels = useMemo(() => makes.length > 0 ? models.filter(m => m.makeId === selectedMakeId) : [], [models, selectedMakeId]);
    const filteredParts = useMemo(() => models.length > 0 ? parts.filter(p => p.modelId === selectedModelId) : [], [parts, selectedModelId]);

    const renderList = (items, selectedId, type) => (
        <ul className="space-y-1">
            {items.map(item => (
                <li key={item.id} onClick={() => handleSelect(type, item.id)} className={`p-2 rounded-md cursor-pointer text-sm transition-colors ${selectedId === item.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                    {item.name}
                </li>
            ))}
        </ul>
    );
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-gray-800 p-4 rounded-xl border border-gray-700 self-start space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-lg text-white">Catalog</h4><Button onClick={() => handleAdd('manufacturer')} className="py-1 px-2 text-xs"><FilePlus size={14} className="mr-1"/>Manufacturer</Button></div>
                    {renderList(manufacturers, selectedManufacturerId, 'manufacturer')}
                </div>
                {selectedManufacturerId && (
                    <div className="border-t border-gray-700 pt-4">
                        <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-md text-gray-300">Makes</h4><Button onClick={() => handleAdd('make')} className="py-1 px-2 text-xs"><FilePlus size={14} className="mr-1"/>Make</Button></div>
                        {renderList(filteredMakes, selectedMakeId, 'make')}
                    </div>
                )}
                {selectedMakeId && (
                    <div className="border-t border-gray-700 pt-4">
                         <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-md text-gray-300">Models</h4><Button onClick={() => handleAdd('model')} className="py-1 px-2 text-xs"><FilePlus size={14} className="mr-1"/>Model</Button></div>
                        {renderList(filteredModels, selectedModelId, 'model')}
                    </div>
                )}
                 {selectedModelId && (
                    <div className="border-t border-gray-700 pt-4">
                         <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-md text-gray-300">Parts</h4><Button onClick={() => handleAdd('part')} className="py-1 px-2 text-xs"><FilePlus size={14} className="mr-1"/>Part</Button></div>
                        {renderList(filteredParts, selectedPartId, 'part')}
                    </div>
                )}
            </div>
            <div className="lg:col-span-2">
                {selectedPartId && parts.find(p => p.id === selectedPartId) ? (
                    <PartEditor 
                        part={parts.find(p => p.id === selectedPartId)}
                        departments={departments}
                        tools={tools}
                        toolAccessories={toolAccessories}
                        consumables={consumables}
                        allJobSteps={allJobSteps}
                        onSaveRecipe={handleSaveRecipe}
                        onPartUpdate={handlePartUpdate}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800 p-6 rounded-xl border-2 border-dashed border-gray-700 text-gray-500">
                        <p>Select a part from the catalog to view its dossier.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductRecipeManager;