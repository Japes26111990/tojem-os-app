import React, { useState, useEffect } from 'react';
import { getParts, getDepartments, getTools, getWorkshopSupplies, getComponents, getRawMaterials, setJobStepDetail, getJobStepDetails } from '../../../api/firestore';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';

const JobStepManager = () => {
  // Master Data
  const [parts, setParts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tools, setTools] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [allJobSteps, setAllJobSteps] = useState([]);
  
  // Form State
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  
  // Individual fields for the recipe
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [steps, setSteps] = useState('');
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [selectedConsumables, setSelectedConsumables] = useState([]);

  // --- NEW STATE FOR THE CONSUMABLE INPUT FORM ---
  const [consumableToAdd, setConsumableToAdd] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [p, d, t, ws, c, rm, allSteps] = await Promise.all([
        getParts(), getDepartments(), getTools(), getWorkshopSupplies(), getComponents(), getRawMaterials(), getJobStepDetails()
      ]);
      setParts(p);
      setDepartments(d);
      setTools(t);
      setConsumables([...ws, ...c, ...rm].sort((a,b) => a.name.localeCompare(b.name)));
      setAllJobSteps(allSteps);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const loadJobStep = () => {
      if (selectedPartId && selectedDepartmentId) {
          const existingStep = allJobSteps.find(step => step.partId === selectedPartId && step.departmentId === selectedDepartmentId);
          if (existingStep) {
              setDescription(existingStep.description || '');
              setEstimatedTime(existingStep.estimatedTime || '');
              setSteps((existingStep.steps || []).join('\n'));
              setSelectedTools(new Set(existingStep.tools || []));
              setSelectedConsumables(existingStep.consumables || []);
          } else {
              setDescription(''); setEstimatedTime(''); setSteps('');
              setSelectedTools(new Set()); setSelectedConsumables([]);
          }
      }
    };
    loadJobStep();
  }, [selectedPartId, selectedDepartmentId, allJobSteps]);

  const handleToolToggle = (toolId) => {
    const newSelection = new Set(selectedTools);
    newSelection.has(toolId) ? newSelection.delete(toolId) : newSelection.add(toolId);
    setSelectedTools(newSelection);
  };

  // --- REWRITTEN to use state, not getElementById ---
  const handleAddConsumable = () => {
    if (!consumableToAdd || !quantityToAdd) return;
    const consumable = consumables.find(c => c.id === consumableToAdd);
    if (!consumable) return;
    // Prevent duplicates
    if (selectedConsumables.find(c => c.id === consumableToAdd)) return;
    
    setSelectedConsumables([...selectedConsumables, { id: consumable.id, name: consumable.name, quantity: Number(quantityToAdd) }]);
    
    // Reset the input fields
    setConsumableToAdd('');
    setQuantityToAdd('');
  };

  const handleRemoveConsumable = (consumableId) => {
    setSelectedConsumables(selectedConsumables.filter(c => c.id !== consumableId));
  };
  
  const handleSave = async () => {
    if (!selectedPartId || !selectedDepartmentId) return alert("Please select a Part and a Department first.");
    const recipeData = {
        description, estimatedTime: Number(estimatedTime),
        steps: steps.split('\n').filter(s => s.trim() !== ''),
        tools: Array.from(selectedTools),
        consumables: selectedConsumables,
    };
    try {
        await setJobStepDetail(selectedPartId, selectedDepartmentId, recipeData);
        alert("Recipe saved successfully!");
        const steps = await getJobStepDetails();
        setAllJobSteps(steps);
    } catch (error) { console.error("Error saving recipe:", error); alert("Failed to save recipe."); }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Job Step Details (The "Recipe Book")</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Dropdown label="Select a Part" name="partId" value={selectedPartId} onChange={e => setSelectedPartId(e.target.value)} options={parts} placeholder="Choose a part..." />
        <Dropdown label="Select a Department" name="departmentId" value={selectedDepartmentId} onChange={e => setSelectedDepartmentId(e.target.value)} options={departments} placeholder="Choose a department..." />
      </div>

      {selectedPartId && selectedDepartmentId && (
        <div className="border-t border-gray-700 pt-6 space-y-6">
          <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Final assembly of side skirt" />
          <Input label="Estimated Time (minutes)" type="number" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} placeholder="e.g., 45" />
          <Textarea label="Steps (one per line)" value={steps} onChange={e => setSteps(e.target.value)} rows={6} placeholder="1. Align panels..." />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Required Tools</h4>
              <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2 p-4 bg-gray-900/50 rounded-lg">
                  {(tools || []).map(tool => ( <label key={tool.id} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={selectedTools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} /><span>{tool.name}</span></label> ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Required Consumables</h4>
              <div className="p-4 bg-gray-900/50 rounded-lg">
                  {/* --- UPDATED FORM LINKED TO STATE --- */}
                  <div className="flex items-end gap-2 mb-4">
                      <Dropdown label="Consumable" name="consumableToAdd" value={consumableToAdd} onChange={e => setConsumableToAdd(e.target.value)} options={consumables} placeholder="Select item..." />
                      <Input label="Quantity" name="quantityToAdd" type="number" value={quantityToAdd} onChange={e => setQuantityToAdd(e.target.value)} placeholder="Qty" />
                      <Button type="button" onClick={handleAddConsumable}>Add</Button>
                  </div>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedConsumables.map(c => ( <li key={c.id} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm"><span>{c.name} (Qty: {c.quantity})</span><Button type="button" onClick={() => handleRemoveConsumable(c.id)} variant="danger" className="py-0.5 px-2 text-xs">X</Button></li> ))}
                  </ul>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <Button onClick={handleSave} variant="primary" className="bg-green-600 hover:bg-green-700">Save Recipe</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobStepManager;