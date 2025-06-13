import React, { useState, useEffect } from 'react';
import { getComponents, addComponent, deleteComponent, getSuppliers } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const ComponentsManager = () => {
  const [components, setComponents] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [newComponent, setNewComponent] = useState({ name: '', itemCode: '', price: '', unit: '', supplierId: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedComponents, fetchedSuppliers] = await Promise.all([getComponents(), getSuppliers()]);
    setComponents(fetchedComponents);
    setSuppliers(fetchedSuppliers);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewComponent(prevState => ({ ...prevState, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newComponent.name.trim() || !newComponent.supplierId) {
      alert("Component name and supplier are required.");
      return;
    }
    try {
      await addComponent({ ...newComponent, price: parseFloat(newComponent.price) || 0 });
      setNewComponent({ name: '', itemCode: '', price: '', unit: '', supplierId: '' });
      fetchData();
    } catch (error) {
      console.error("Error adding component:", error);
      alert("Failed to add component.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this component?")) {
      await deleteComponent(id);
      fetchData();
    }
  };

  const getSupplierName = (supplierId) => suppliers.find(s => s.id === supplierId)?.name || 'N/A';

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Components</h3>
      <p className="text-sm text-gray-400 mb-6">Manage discrete, countable parts that go into the final product (e.g., bolts, screws, brackets).</p>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end mb-6">
        <Input label="Component Name" name="name" value={newComponent.name} onChange={handleInputChange} placeholder="e.g., 8mm Bolt" />
        <Input label="Item Code" name="itemCode" value={newComponent.itemCode} onChange={handleInputChange} placeholder="Optional" />
        <Dropdown label="Supplier" name="supplierId" value={newComponent.supplierId} onChange={handleInputChange} options={suppliers} placeholder="Select Supplier..." />
        <Input label="Price" name="price" type="number" value={newComponent.price} onChange={handleInputChange} placeholder="e.g., 2.25" />
        <Input label="Unit" name="unit" value={newComponent.unit} onChange={handleInputChange} placeholder="e.g., each" />
        <Button type="submit" variant="primary">Add Component</Button>
      </form>

      <div className="hidden md:grid grid-cols-6 gap-4 px-3 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700">
        <div className="col-span-2">Name</div>
        <div>Item Code</div>
        <div>Supplier</div>
        <div className="text-right">Price</div>
      </div>
      <div className="space-y-3 mt-2">
        {loading ? <p className="text-center p-4">Loading...</p> : (components || []).map(item => (
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
        {components.length === 0 && !loading && <p className="text-center p-4 text-gray-500">No components added yet.</p>}
      </div>
    </div>
  );
};

export default ComponentsManager;