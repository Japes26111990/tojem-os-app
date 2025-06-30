import React, { useState, useEffect } from 'react';
import { getSuppliers, addSupplier, deleteSupplier, updateSupplier } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const SuppliersManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
  const [loading, setLoading] = useState(true);
  const [editingSupplierId, setEditingSupplierId] = useState(null);

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

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      toast.error("Supplier name is required."); // --- REPLACE ALERT ---
      return;
    }
    try {
      const dataToSave = {
        ...newSupplier,
        estimatedEtaDays: parseInt(newSupplier.estimatedEtaDays, 10) || 0,
        minOrderAmount: parseFloat(newSupplier.minOrderAmount) || 0,
      };

      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, dataToSave); 
        toast.success("Supplier updated successfully!"); // --- REPLACE ALERT ---
      } else {
        await addSupplier(dataToSave);
        toast.success("Supplier added successfully!"); // --- REPLACE ALERT ---
      }
      setNewSupplier({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
      setEditingSupplierId(null);
      fetchSuppliers();
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(`Failed to ${editingSupplierId ? 'update' : 'add'} supplier.`); // --- REPLACE ALERT ---
    }
  };

  const handleEdit = (supplier) => {
    setNewSupplier({
        name: supplier.name,
        email: supplier.email || '',
        estimatedEtaDays: supplier.estimatedEtaDays || '',
        minOrderAmount: supplier.minOrderAmount || ''
    });
    setEditingSupplierId(supplier.id);
  };

  const handleCancelEdit = () => {
    setNewSupplier({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
    setEditingSupplierId(null);
  };

  const handleDelete = (id) => {
    // --- REPLACE window.confirm ---
    toast((t) => (
        <span>
            Are you sure you want to delete this supplier?
            <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                deleteSupplier(id)
                    .then(() => {
                        toast.success("Supplier deleted.");
                        fetchSuppliers();
                    })
                    .catch(err => {
                        toast.error("Failed to delete supplier.");
                        console.error(err);
                    });
                toast.dismiss(t.id);
            }}>
                Delete
            </Button>
            <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                Cancel
            </Button>
        </span>
    ), { icon: '⚠️' });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Suppliers</h3>
      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6">
        <Input label="Supplier Name" name="name" value={newSupplier.name} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit supplier name..." : "e.g., Bolt & Nut Centre"} />
        <Input label="Email Address" name="email" type="email" value={newSupplier.email} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit email..." : "e.g., sales@bolts.co.za"} />
        <Input label="ETA (in days)" name="estimatedEtaDays" type="number" value={newSupplier.estimatedEtaDays} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit ETA..." : "e.g., 3"} />
        <Input label="Min. Order (R)" name="minOrderAmount" type="number" value={newSupplier.minOrderAmount} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit min order..." : "e.g., 500"} />
        <div className="flex gap-2">
            {editingSupplierId && (
                <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
            )}
            <Button type="submit" variant="primary" className="flex-grow">
                {editingSupplierId ? "Update" : "Add"}
            </Button>
        </div>
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
            <p className="text-gray-400 text-right">R {(sup.minOrderAmount || 0).toFixed(2)}</p>
            <div className="md:col-start-6 text-right flex space-x-2 justify-end">
                <Button onClick={() => handleEdit(sup)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button>
                <Button onClick={() => handleDelete(sup.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
            </div>
          </div>
        ))}
         {(suppliers.length === 0 && !loading && <p className="text-center p-4 text-gray-500">No suppliers added yet.</p>)}
      </div>
    </div>
  );
};

export default SuppliersManager;
