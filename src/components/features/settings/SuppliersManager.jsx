import React, { useState, useEffect } from 'react';
import { getSuppliers, addSupplier, deleteSupplier } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const SuppliersManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    setLoading(true);
    const fetchedSuppliers = await getSuppliers();
    setSuppliers(fetchedSuppliers);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupplier(prevState => ({ ...prevState, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      alert("Supplier name is required.");
      return;
    }
    try {
      const dataToSave = {
        ...newSupplier,
        estimatedEtaDays: parseInt(newSupplier.estimatedEtaDays, 10) || 0,
        minOrderAmount: parseFloat(newSupplier.minOrderAmount) || 0,
      };
      await addSupplier(dataToSave);
      setNewSupplier({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
      fetchSuppliers();
    } catch (error) {
      console.error("Error adding supplier:", error);
      alert("Failed to add supplier.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      await deleteSupplier(id);
      fetchSuppliers();
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Suppliers</h3>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
        <Input label="Supplier Name" name="name" value={newSupplier.name} onChange={handleInputChange} placeholder="e.g., Bolt & Nut Centre" />
        <Input label="Email Address" name="email" type="email" value={newSupplier.email} onChange={handleInputChange} placeholder="e.g., sales@bolts.co.za" />
        <Input label="ETA (in days)" name="estimatedEtaDays" type="number" value={newSupplier.estimatedEtaDays} onChange={handleInputChange} placeholder="e.g., 3" />
        <Input label="Min. Order (R)" name="minOrderAmount" type="number" value={newSupplier.minOrderAmount} onChange={handleInputChange} placeholder="e.g., 500" />
        <Button type="submit" variant="primary">Add Supplier</Button>
      </form>

      <div className="hidden md:grid grid-cols-5 gap-4 px-3 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700">
        <div className="col-span-2">Supplier Name</div>
        <div>Email</div>
        <div>Lead Time</div>
        <div className="text-right">Min. Order</div>
      </div>
      <div className="space-y-3 mt-2">
        {loading ? <p>Loading...</p> : (suppliers || []).map(sup => (
          <div key={sup.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200 font-semibold col-span-2">{sup.name}</p>
            <p className="text-gray-400">{sup.email}</p>
            <p className="text-gray-400">{sup.estimatedEtaDays} days</p>
            {/* --- THIS IS THE FIXED LINE --- */}
            <p className="text-gray-400 text-right">R {(sup.minOrderAmount || 0).toFixed(2)}</p>
            <div className="md:col-start-6 text-right">
                <Button onClick={() => handleDelete(sup.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
            </div>
          </div>
        ))}
         {suppliers.length === 0 && !loading && <p className="text-center p-4 text-gray-500">No suppliers added yet.</p>}
      </div>
    </div>
  );
};

export default SuppliersManager;