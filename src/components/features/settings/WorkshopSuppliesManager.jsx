import React, { useState, useEffect } from 'react';
import { getWorkshopSupplies, addWorkshopSupply, deleteWorkshopSupply, getSuppliers } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const WorkshopSuppliesManager = () => {
  const [supplies, setSupplies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [newSupply, setNewSupply] = useState({ name: '', itemCode: '', price: '', unit: '', supplierId: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // Fetch both supplies and suppliers at the same time
    const [fetchedSupplies, fetchedSuppliers] = await Promise.all([getWorkshopSupplies(), getSuppliers()]);
    setSupplies(fetchedSupplies);
    setSuppliers(fetchedSuppliers);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupply(prevState => ({ ...prevState, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSupply.name.trim() || !newSupply.supplierId) {
      alert("Supply name and supplier are required.");
      return;
    }
    try {
      const dataToSave = {
        ...newSupply,
        price: parseFloat(newSupply.price) || 0, // Ensure price is stored as a number
      };
      await addWorkshopSupply(dataToSave);
      setNewSupply({ name: '', itemCode: '', price: '', unit: '', supplierId: '' }); // Reset form
      fetchData();
    } catch (error) {
      console.error("Error adding workshop supply:", error);
      alert("Failed to add workshop supply.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supply?")) {
      try {
        await deleteWorkshopSupply(id);
        fetchData();
      } catch (error) {
        console.error("Error deleting workshop supply:", error);
        alert("Failed to delete supply.");
      }
    }
  };
  
  // Helper function to find a supplier's name from their ID
  const getSupplierName = (supplierId) => suppliers.find(s => s.id === supplierId)?.name || 'N/A';

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Workshop Supplies</h3>
      <p className="text-sm text-gray-400 mb-6">Manage items used during production but not part of the final product (e.g., sanding paper, thinners, tape).</p>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end mb-6">
        <Input label="Supply Name" name="name" value={newSupply.name} onChange={handleInputChange} placeholder="e.g., Sanding Disc" />
        <Input label="Item Code" name="itemCode" value={newSupply.itemCode} onChange={handleInputChange} placeholder="Optional" />
        <Dropdown label="Supplier" name="supplierId" value={newSupply.supplierId} onChange={handleInputChange} options={suppliers} placeholder="Select Supplier..." />
        <Input label="Price" name="price" type="number" value={newSupply.price} onChange={handleInputChange} placeholder="e.g., 15.50" />
        <Input label="Unit" name="unit" value={newSupply.unit} onChange={handleInputChange} placeholder="e.g., each, liter" />
        <Button type="submit" variant="primary">Add Supply</Button>
      </form>

      {/* List Header */}
      <div className="hidden md:grid grid-cols-6 gap-4 px-3 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700">
        <div className="col-span-2">Name</div>
        <div>Item Code</div>
        <div>Supplier</div>
        <div className="text-right">Price</div>
        <div></div> {/* Empty column for alignment with delete button */}
      </div>
      <div className="space-y-3 mt-2">
        {loading ? <p className="text-center p-4">Loading...</p> : (supplies || []).map(item => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200 col-span-2 font-semibold">{item.name}</p>
            <p className="text-gray-400">{item.itemCode}</p>
            <p className="text-gray-400">{getSupplierName(item.supplierId)}</p>
            <p className="text-gray-400 text-right">R {item.price.toFixed(2)} / {item.unit}</p>
            <div className="md:col-start-6 text-right">
              <Button onClick={() => handleDelete(item.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
            </div>
          </div>
        ))}
        {supplies.length === 0 && !loading && <p className="text-center p-4 text-gray-500">No workshop supplies added yet.</p>}
      </div>
    </div>
  );
};

export default WorkshopSuppliesManager;