import React, { useState, useEffect } from 'react';
import { getSuppliers, addSupplier, deleteSupplier, updateSupplier } from '../../../api/firestore'; // Import updateSupplier
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const SuppliersManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
  const [loading, setLoading] = useState(true);
  const [editingSupplierId, setEditingSupplierId] = useState(null); // New state to track which supplier is being edited

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

  const handleAddOrUpdate = async (e) => { // Renamed handler to handle both add and update
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

      if (editingSupplierId) {
        // If editingSupplierId is set, update the existing supplier using updateSupplier
        await updateSupplier(editingSupplierId, dataToSave); 
        alert("Supplier updated successfully!");
      } else {
        // Otherwise, add a new supplier
        await addSupplier(dataToSave);
        alert("Supplier added successfully!");
      }
      setNewSupplier({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' }); // Reset form
      setEditingSupplierId(null); // Clear editing state
      fetchSuppliers(); // Refresh list
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert(`Failed to ${editingSupplierId ? 'update' : 'add'} supplier.`); // Dynamic error message
    }
  };

  const handleEdit = (supplier) => { // Handler for edit button click
    setNewSupplier({
        name: supplier.name,
        email: supplier.email || '', // Ensure email is handled if it's null/undefined
        estimatedEtaDays: supplier.estimatedEtaDays || '', // Ensure numeric values are converted to string for input
        minOrderAmount: supplier.minOrderAmount || '' // Ensure numeric values are converted to string for input
    });
    setEditingSupplierId(supplier.id); // Set the ID of the supplier being edited
  };

  const handleCancelEdit = () => { // Handler to cancel editing
    setNewSupplier({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' }); // Reset form
    setEditingSupplierId(null); // Exit editing mode
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
      <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6"> {/* Use universal handler */}
        <Input label="Supplier Name" name="name" value={newSupplier.name} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit supplier name..." : "e.g., Bolt & Nut Centre"} /> {/* Dynamic placeholder */}
        <Input label="Email Address" name="email" type="email" value={newSupplier.email} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit email..." : "e.g., sales@bolts.co.za"} /> {/* Dynamic placeholder */}
        <Input label="ETA (in days)" name="estimatedEtaDays" type="number" value={newSupplier.estimatedEtaDays} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit ETA..." : "e.g., 3"} /> {/* Dynamic placeholder */}
        <Input label="Min. Order (R)" name="minOrderAmount" type="number" value={newSupplier.minOrderAmount} onChange={handleInputChange} placeholder={editingSupplierId ? "Edit min order..." : "e.g., 500"} /> {/* Dynamic placeholder */}
        {editingSupplierId && ( // Show cancel button only when in editing mode
            <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
        )}
        <Button type="submit" variant="primary">
            {editingSupplierId ? "Update Supplier" : "Add Supplier"} {/* Dynamic button text */}
        </Button>
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
            <div className="md:col-start-6 text-right flex space-x-2 justify-end"> {/* Added flex for buttons */}
                <Button onClick={() => handleEdit(sup)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button> {/* Edit button */}
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