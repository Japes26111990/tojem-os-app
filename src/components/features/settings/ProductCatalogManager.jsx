import React, { useState, useEffect, useMemo } from 'react';
import {
  getManufacturers, addManufacturer,
  getMakes, addMake,
  getModels, addModel,
  getParts, addPart
} from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const ProductCatalogManager = () => {
  // State for the lists of data
  const [manufacturers, setManufacturers] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for the new item input fields
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newPart, setNewPart] = useState('');

  // State for the selected IDs in the dropdowns
  const [selectedManufacturerId, setSelectedManufacturerId] = useState('');
  const [selectedMakeId, setSelectedMakeId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [man, mak, mod, par] = await Promise.all([
      getManufacturers(), getMakes(), getModels(), getParts()
    ]);
    setManufacturers(man || []);
    setMakes(mak || []);
    setModels(mod || []);
    setParts(par || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- DEBUGGING BLOCK ADDED HERE ---
  useEffect(() => {
    // This will log the current value of newManufacturer every time you type
    console.log("The 'newManufacturer' state is now:", newManufacturer);
  }, [newManufacturer]);
  // --- END OF DEBUGGING BLOCK ---

  const handleAddManufacturer = async (e) => {
    e.preventDefault();
    if (!newManufacturer.trim()) return;
    try {
      await addManufacturer(newManufacturer);
      setNewManufacturer('');
      fetchData();
    } catch (error) {
      console.error("Error adding manufacturer:", error);
      alert("Failed to add manufacturer. Check the console for details.");
    }
  };

  const handleAddMake = async (e) => {
    e.preventDefault();
    if (!newMake.trim()) return;
    try {
      await addMake({ name: newMake, manufacturerId: selectedManufacturerId });
      setNewMake('');
      fetchData();
    } catch (error) {
      console.error("Error adding make:", error);
      alert("Failed to add make. Check the console for details.");
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    if (!newModel.trim()) return;
    try {
      await addModel({ name: newModel, makeId: selectedMakeId });
      setNewModel('');
      fetchData();
    } catch (error) {
      console.error("Error adding model:", error);
      alert("Failed to add model. Check the console for details.");
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!newPart.trim()) return;
    try {
      await addPart({ name: newPart, modelId: selectedModelId });
      setNewPart('');
      fetchData();
    } catch (error) {
      console.error("Error adding part:", error);
      alert("Failed to add part. Check the console for details.");
    }
  };

  const filteredMakes = useMemo(() => (makes || []).filter(m => m.manufacturerId === selectedManufacturerId), [makes, selectedManufacturerId]);
  const filteredModels = useMemo(() => (models || []).filter(m => m.makeId === selectedMakeId), [models, selectedMakeId]);
  const filteredParts = useMemo(() => (parts || []).filter(p => p.modelId === selectedModelId), [parts, selectedModelId]);

  if (loading) return <p className="text-center text-gray-400">Loading Product Catalog...</p>;

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Product Catalog</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Column 1: Manufacturers */}
        <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-400">1. Manufacturers</h4>
          <form onSubmit={handleAddManufacturer} className="space-y-2">
            <Input value={newManufacturer} onChange={(e) => setNewManufacturer(e.target.value)} placeholder="Add Manufacturer..." />
            <Button type="submit" className="w-full">Add</Button>
          </form>
          <ul className="space-y-1 text-sm">{(manufacturers || []).map(m => <li key={m.id} className="bg-gray-700 p-2 rounded">{m.name}</li>)}</ul>
        </div>

        {/* Column 2: Makes */}
        <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-400">2. Makes</h4>
          <Dropdown options={manufacturers || []} value={selectedManufacturerId} onChange={e => { setSelectedManufacturerId(e.target.value); setSelectedMakeId(''); setSelectedModelId(''); }} placeholder="Select Manufacturer..." />
          {selectedManufacturerId && (
            <>
              <form onSubmit={handleAddMake} className="space-y-2">
                <Input value={newMake} onChange={(e) => setNewMake(e.target.value)} placeholder="Add Make..." />
                <Button type="submit" className="w-full">Add</Button>
              </form>
              <ul className="space-y-1 text-sm">{(filteredMakes || []).map(m => <li key={m.id} className="bg-gray-700 p-2 rounded">{m.name}</li>)}</ul>
            </>
          )}
        </div>

        {/* Column 3: Models */}
        <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-400">3. Models</h4>
          <Dropdown options={filteredMakes || []} value={selectedMakeId} onChange={e => { setSelectedMakeId(e.target.value); setSelectedModelId(''); }} placeholder="Select Make..." disabled={!selectedManufacturerId} />
          {selectedMakeId && (
             <>
              <form onSubmit={handleAddModel} className="space-y-2">
                <Input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Add Model..." />
                <Button type="submit" className="w-full">Add</Button>
              </form>
              <ul className="space-y-1 text-sm">{(filteredModels || []).map(m => <li key={m.id} className="bg-gray-700 p-2 rounded">{m.name}</li>)}</ul>
            </>
          )}
        </div>

        {/* Column 4: Parts */}
        <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-400">4. Parts</h4>
          <Dropdown options={filteredModels || []} value={selectedModelId} onChange={e => setSelectedModelId(e.target.value)} placeholder="Select Model..." disabled={!selectedMakeId}/>
          {selectedModelId && (
            <>
              <form onSubmit={handleAddPart} className="space-y-2">
                <Input value={newPart} onChange={(e) => setNewPart(e.target.value)} placeholder="Add Part..." />
                <Button type="submit" className="w-full">Add</Button>
              </form>
              <ul className="space-y-1 text-sm">{(filteredParts || []).map(p => <li key={p.id} className="bg-gray-700 p-2 rounded">{p.name}</li>)}</ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCatalogManager;