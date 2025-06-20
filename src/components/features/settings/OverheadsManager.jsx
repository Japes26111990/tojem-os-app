import React, { useState, useEffect } from 'react';
import { 
    getOverheadCategories, addOverheadCategory, updateOverheadCategory, deleteOverheadCategory,
    getOverheadExpenses, addOverheadExpense, updateOverheadExpense, deleteOverheadExpense 
} from '../../../api/firestore'; 
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { ChevronDown, ChevronRight, FilePlus } from 'lucide-react'; 


const OverheadsManager = () => {
    // State for Categories
    const [overheadCategories, setOverheadCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState(null);

    // State for Expenses within a selected category
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState(''); // To display name of selected category
    const [overheadExpenses, setOverheadExpenses] = useState([]);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '' });
    const [editingExpenseId, setEditingExpenseId] = useState(null);

    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingExpenses, setLoadingExpenses] = useState(false); 

    // --- Category Input Change Handler ---
    const handleCategoryInputChange = (e) => { // Renamed for clarity
        setNewCategoryName(e.target.value);
    };

    // --- Category Management ---
    const fetchOverheadCategories = async () => {
        setLoadingCategories(true);
        try {
            const fetchedCategories = await getOverheadCategories();
            setOverheadCategories(fetchedCategories);
        } catch (error) {
            console.error("Error fetching overhead categories:", error);
            alert("Failed to load overhead categories.");
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        fetchOverheadCategories();
    }, []);

    const handleAddOrUpdateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) {
            alert("Category name is required.");
            return;
        }

        try {
            const dataToSave = { name: newCategoryName.trim() };
            if (editingCategoryId) {
                await updateOverheadCategory(editingCategoryId, dataToSave);
                alert("Category updated successfully!");
            } else {
                await addOverheadCategory(dataToSave);
                alert("Category added successfully!");
            }
            setNewCategoryName('');
            setEditingCategoryId(null);
            fetchOverheadCategories(); 
        } catch (error) {
            console.error("Error saving category:", error);
            alert(`Failed to ${editingCategoryId ? 'update' : 'add'} category.`);
        }
    };

    const handleEditCategory = (category) => {
        setNewCategoryName(category.name);
        setEditingCategoryId(category.id);
    };

    const handleCancelEditCategory = () => {
        setNewCategoryName('');
        setEditingCategoryId(null);
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm("Are you sure you want to delete this category and ALL its associated expenses? This action cannot be undone.")) {
            try {
                await deleteOverheadCategory(categoryId);
                alert("Category and its expenses deleted successfully!");
                fetchOverheadCategories(); 
                if (selectedCategoryId === categoryId) {
                    setSelectedCategoryId(null);
                    setSelectedCategoryName('');
                    setOverheadExpenses([]);
                }
            } catch (error) {
                console.error("Error deleting category:", error);
                alert("Failed to delete category.");
            }
        }
    };

    const handleSelectCategory = (categoryId, categoryName) => {
        // Toggle selection: if already selected, deselect. Otherwise, select.
        if (selectedCategoryId === categoryId) {
            setSelectedCategoryId(null);
            setSelectedCategoryName('');
            setOverheadExpenses([]);
        } else {
            setSelectedCategoryId(categoryId);
            setSelectedCategoryName(categoryName);
            // Also reset expense form state when new category is selected
            setNewExpense({ name: '', amount: '' });
            setEditingExpenseId(null);
        }
    };

    // --- Expense Input Change Handler (NEW) ---
    const handleExpenseInputChange = (e) => {
        const { name, value } = e.target;
        setNewExpense(prev => ({ ...prev, [name]: value }));
    };

    // --- Expense Management (within selected category) ---
    const fetchOverheadExpenses = async () => {
        if (!selectedCategoryId) return;
        setLoadingExpenses(true);
        try {
            const fetchedExpenses = await getOverheadExpenses(selectedCategoryId);
            setOverheadExpenses(fetchedExpenses);
        } catch (error) {
            console.error("Error fetching overhead expenses:", error);
            alert("Failed to load expenses for this category.");
        } finally {
            setLoadingExpenses(false);
        }
    };

    // Fetch expenses whenever selectedCategoryId changes
    useEffect(() => {
        fetchOverheadExpenses();
    }, [selectedCategoryId]); 

    const handleAddOrUpdateExpense = async (e) => {
        e.preventDefault();
        if (!selectedCategoryId) {
            alert("Please select an overhead category first.");
            return;
        }
        if (!newExpense.name.trim() || newExpense.amount === '' || parseFloat(newExpense.amount) < 0) {
            alert("Please enter a valid expense name and a positive amount.");
            return;
        }

        try {
            const dataToSave = {
                name: newExpense.name.trim(),
                amount: parseFloat(newExpense.amount)
            };

            if (editingExpenseId) {
                await updateOverheadExpense(selectedCategoryId, editingExpenseId, dataToSave);
                alert("Expense updated successfully!");
            } else {
                await addOverheadExpense(selectedCategoryId, dataToSave);
                alert("Expense added successfully!");
            }
            setNewExpense({ name: '', amount: '' }); // Reset form
            setEditingExpenseId(null); // Clear editing state
            fetchOverheadExpenses(); // Refresh expenses list
        } catch (error) {
            console.error("Error saving expense:", error);
            alert(`Failed to ${editingExpenseId ? 'update' : 'add'} expense.`);
        }
    };

    const handleEditExpense = (expense) => {
        setNewExpense({
            name: expense.name,
            amount: expense.amount || ''
        });
        setEditingExpenseId(expense.id);
    };

    const handleCancelEditExpense = () => {
        setNewExpense({ name: '', amount: '' });
        setEditingExpenseId(null);
    };

    const handleDeleteExpense = async (expenseId) => {
        if (window.confirm("Are you sure you want to delete this expense?")) {
            try {
                await deleteOverheadExpense(selectedCategoryId, expenseId);
                alert("Expense deleted successfully!");
                fetchOverheadExpenses(); 
            } catch (error) {
                console.error("Error deleting expense:", error);
                alert("Failed to delete expense.");
            }
        }
    };

    // Calculate total for selected category for display
    const totalSelectedCategoryCost = overheadExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Overheads & Fixed Costs</h3>

            {/* --- Overhead Categories Section --- */}
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                <FilePlus size={18} className="mr-2 text-blue-400"/>
                Overhead Categories
            </h4>
            <form onSubmit={handleAddOrUpdateCategory} className="flex items-center space-x-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <Input
                    label="Category Name" // Changed label for clarity
                    name="categoryName"
                    value={newCategoryName}
                    onChange={handleCategoryInputChange} // Use specific handler
                    placeholder={editingCategoryId ? "Edit category name..." : "New category name (e.g., Rent & Utilities)"}
                    className="flex-grow"
                />
                {editingCategoryId && (
                    <Button type="button" variant="secondary" onClick={handleCancelEditCategory}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    {editingCategoryId ? "Update Category" : "Add Category"}
                </Button>
            </form>

            <div className="space-y-3 mb-8">
                {loadingCategories ? (
                    <p>Loading categories...</p>
                ) : (overheadCategories || []).length === 0 ? (
                    <p className="text-center p-4 text-gray-500">No overhead categories added yet.</p>
                ) : (
                    (overheadCategories || []).map(category => (
                        <div key={category.id} className="bg-gray-700 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => handleSelectCategory(category.id, category.name)} 
                                    className="flex-grow text-left text-gray-200 font-semibold flex items-center py-1"
                                >
                                    {selectedCategoryId === category.id ? <ChevronDown size={18} className="mr-2"/> : <ChevronRight size={18} className="mr-2"/>}
                                    {category.name}
                                </button>
                                <div className="flex space-x-2">
                                    <Button onClick={() => handleEditCategory(category)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button>
                                    <Button onClick={() => handleDeleteCategory(category.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
                                </div>
                            </div>

                            {/* --- Individual Expenses Section (Conditional) --- */}
                            {selectedCategoryId === category.id && (
                                <div className="mt-4 p-4 bg-gray-800 rounded-lg animate-fade-in border border-gray-700">
                                    <h5 className="font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">
                                        Expenses for {selectedCategoryName} (Total: R{totalSelectedCategoryCost.toFixed(2)})
                                    </h5>

                                    {/* Form to add/edit expenses */}
                                    <form onSubmit={handleAddOrUpdateExpense} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
                                        <Input
                                            label="Expense Name"
                                            name="name"
                                            value={newExpense.name}
                                            onChange={handleExpenseInputChange} // Use specific handler for expenses
                                            placeholder={editingExpenseId ? "Edit expense name..." : "e.g., Ranos Rent"}
                                        />
                                        <Input
                                            label="Amount (R)"
                                            name="amount"
                                            type="number"
                                            value={newExpense.amount}
                                            onChange={handleExpenseInputChange} // Use specific handler for expenses
                                            placeholder="e.g., 2000.00"
                                        />
                                        {editingExpenseId && (
                                            <Button type="button" variant="secondary" onClick={handleCancelEditExpense}>
                                                Cancel
                                            </Button>
                                        )}
                                        <Button type="submit" variant="primary">
                                            {editingExpenseId ? "Update Expense" : "Add Expense"}
                                        </Button>
                                    </form>

                                    {/* List of expenses */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto mt-4 pt-4 border-t border-gray-700">
                                        {loadingExpenses ? (
                                            <p>Loading expenses...</p>
                                        ) : (overheadExpenses || []).length === 0 ? (
                                            <p className="text-gray-400 text-sm">No expenses in this category yet.</p>
                                        ) : (
                                            (overheadExpenses || []).map(expense => (
                                                <div key={expense.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                                                    <p className="text-gray-200">{expense.name}</p>
                                                    <p className="text-gray-400 text-right">R {(expense.amount || 0).toFixed(2)}</p>
                                                    <div className="flex space-x-2">
                                                        <Button onClick={() => handleEditExpense(expense)} variant="secondary" className="py-0.5 px-2 text-xs">Edit</Button>
                                                        <Button onClick={() => handleDeleteExpense(expense.id)} variant="danger" className="py-0.5 px-2 text-xs">Delete</Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default OverheadsManager;