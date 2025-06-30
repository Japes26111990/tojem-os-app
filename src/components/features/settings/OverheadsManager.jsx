// src/components/features/settings/OverheadsManager.jsx (Upgraded with Toasts)

import React, { useState, useEffect, useMemo } from 'react';
import { 
    getOverheadCategories, addOverheadCategory, updateOverheadCategory, deleteOverheadCategory,
    getOverheadExpenses, addOverheadExpense, updateOverheadExpense, deleteOverheadExpense 
} from '../../../api/firestore'; 
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { ChevronDown, ChevronRight, FilePlus, Building, Users, TrendingUp, HelpCircle } from 'lucide-react'; 
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const ExpenseTypeBadge = ({ type }) => {
    const config = {
        'Fixed Operational': { color: 'bg-blue-500', icon: <Building size={12} />, title: 'Fixed Operational Cost' },
        'Team & Training': { color: 'bg-purple-500', icon: <Users size={12} />, title: 'Team & Training Cost' },
        'Growth & Marketing': { color: 'bg-green-500', icon: <TrendingUp size={12} />, title: 'Growth & Marketing Investment' },
        'Discretionary/Reviewable': { color: 'bg-yellow-500', icon: <HelpCircle size={12} />, title: 'Discretionary/Reviewable Cost' }
    };
    const { color = 'bg-gray-500', icon = null, title = 'Uncategorized' } = config[type] || {};
    return (
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${color}`} title={title}>
            {icon}
        </span>
    );
};

const OverheadsManager = () => {
    const [overheadCategories, setOverheadCategories] = useState([]);
    const [allExpenses, setAllExpenses] = useState({});
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [newExpense, setNewExpense] = useState({ name: '', amount: '', expenseType: 'Fixed Operational' });
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const fetchedCategories = await getOverheadCategories();
            setOverheadCategories(fetchedCategories);

            const expensesMap = {};
            const expensePromises = fetchedCategories.map(async (cat) => {
                const expenses = await getOverheadExpenses(cat.id);
                expensesMap[cat.id] = expenses;
            });
            await Promise.all(expensePromises);
            setAllExpenses(expensesMap);

        } catch (error) {
            console.error("Error fetching overhead data:", error);
            toast.error("Failed to load overhead data."); // --- REPLACE ALERT ---
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const categoryTotals = useMemo(() => {
        const totals = {};
        for (const catId in allExpenses) {
            totals[catId] = allExpenses[catId].reduce((sum, exp) => sum + (exp.amount || 0), 0);
        }
        return totals;
    }, [allExpenses]);

    const totalsByType = useMemo(() => {
        const totals = {
            'Fixed Operational': 0,
            'Team & Training': 0,
            'Growth & Marketing': 0,
            'Discretionary/Reviewable': 0,
        };
        Object.values(allExpenses).flat().forEach(expense => {
            if (totals[expense.expenseType] !== undefined) {
                totals[expense.expenseType] += expense.amount || 0;
            }
        });
        return totals;
    }, [allExpenses]);

    const grandTotal = useMemo(() => {
        return Object.values(categoryTotals).reduce((sum, total) => sum + total, 0);
    }, [categoryTotals]);

    const handleAddOrUpdateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            const dataToSave = { name: newCategoryName.trim() };
            if (editingCategoryId) {
                await updateOverheadCategory(editingCategoryId, dataToSave);
                toast.success("Category updated.");
            } else {
                await addOverheadCategory(dataToSave);
                toast.success("Category added.");
            }
            setNewCategoryName('');
            setEditingCategoryId(null);
            fetchAllData(); 
        } catch (error) {
            toast.error(`Failed to save category.`); // --- REPLACE ALERT ---
        }
    };

    const handleAddOrUpdateExpense = async (e) => {
        e.preventDefault();
        if (!selectedCategoryId || !newExpense.name.trim() || newExpense.amount === '' || parseFloat(newExpense.amount) < 0) {
            toast.error("Please enter a valid expense name, amount, and select an expense type."); // --- REPLACE ALERT ---
            return;
        }
        try {
            const dataToSave = {
                name: newExpense.name.trim(),
                amount: parseFloat(newExpense.amount),
                expenseType: newExpense.expenseType,
            };
            if (editingExpenseId) {
                await updateOverheadExpense(selectedCategoryId, editingExpenseId, dataToSave);
                toast.success("Expense updated.");
            } else {
                await addOverheadExpense(selectedCategoryId, dataToSave);
                toast.success("Expense added.");
            }
            setNewExpense({ name: '', amount: '', expenseType: 'Fixed Operational' });
            setEditingExpenseId(null);
            fetchAllData();
        } catch (error) {
            toast.error(`Failed to save expense.`); // --- REPLACE ALERT ---
        }
    };

    const handleDeleteCategory = (categoryId) => {
        toast((t) => (
            <span>
                Delete category and ALL expenses?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteOverheadCategory(categoryId)
                        .then(() => {
                            toast.success("Category deleted.");
                            fetchAllData();
                            if (selectedCategoryId === categoryId) setSelectedCategoryId(null);
                        })
                        .catch(err => toast.error("Failed to delete category."));
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

    const handleDeleteExpense = (expenseId) => {
        toast((t) => (
            <span>
                Delete this expense?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteOverheadExpense(selectedCategoryId, expenseId)
                        .then(() => {
                            toast.success("Expense deleted.");
                            fetchAllData();
                        })
                        .catch(err => toast.error("Failed to delete expense."));
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

    const handleEditExpense = (expense) => { setNewExpense({ name: expense.name, amount: expense.amount || '', expenseType: expense.expenseType || 'Fixed Operational' }); setEditingExpenseId(expense.id); };
    const handleCancelEditExpense = () => { setNewExpense({ name: '', amount: '', expenseType: 'Fixed Operational' }); setEditingExpenseId(null); };
    const handleEditCategory = (category) => { setNewCategoryName(category.name); setEditingCategoryId(category.id); };
    const handleCancelEditCategory = () => { setNewCategoryName(''); setEditingCategoryId(null); };
    const handleSelectCategory = (categoryId) => { setSelectedCategoryId(prev => prev === categoryId ? null : categoryId); handleCancelEditExpense();};
    const handleExpenseInputChange = (e) => { const { name, value } = e.target; setNewExpense(prev => ({ ...prev, [name]: value }));};

    const expenseTypeOptions = [
        { id: 'Fixed Operational', name: 'Fixed Operational' },
        { id: 'Team & Training', name: 'Team & Training' },
        { id: 'Growth & Marketing', name: 'Growth & Marketing' },
        { id: 'Discretionary/Reviewable', name: 'Discretionary/Reviewable' },
    ];

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start mb-4">
                 <h3 className="text-xl font-bold text-white flex items-center"><FilePlus size={22} className="mr-2 text-blue-400"/> Manage Overheads & Fixed Costs</h3>
                 <div className="text-right">
                    <p className="text-sm text-gray-400">Grand Total</p>
                    <p className="text-2xl font-bold text-green-400 font-mono">R {grandTotal.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</p>
                    <div className="flex gap-4 mt-2 justify-end text-xs">
                        {Object.entries(totalsByType).map(([type, total]) => (
                            <div key={type} className="flex items-center gap-2">
                                <ExpenseTypeBadge type={type} />
                                <span className="text-gray-400">R {total.toLocaleString('en-ZA')}</span>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>

            <form onSubmit={handleAddOrUpdateCategory} className="flex items-center space-x-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <Input label="Category Name" name="categoryName" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={editingCategoryId ? "Edit category name..." : "New category name (e.g., Rent & Utilities)"} className="flex-grow"/>
                {editingCategoryId && (<Button type="button" variant="secondary" onClick={handleCancelEditCategory}>Cancel</Button>)}
                <Button type="submit" variant="primary">{editingCategoryId ? "Update Category" : "Add Category"}</Button>
            </form>

            <div className="space-y-3">
                {loading ? <p>Loading categories...</p> : (overheadCategories || []).length === 0 ? <p className="text-center p-4 text-gray-500">No overhead categories added yet.</p> :
                    (overheadCategories || []).map(category => (
                        <div key={category.id} className="bg-gray-700 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                                <button onClick={() => handleSelectCategory(category.id)} className="flex-grow text-left text-gray-200 font-semibold flex items-center py-1">
                                    {selectedCategoryId === category.id ? <ChevronDown size={18} className="mr-2"/> : <ChevronRight size={18} className="mr-2"/>}
                                    {category.name}
                                </button>
                                <span className="font-mono text-gray-300 mr-4">R {categoryTotals[category.id]?.toLocaleString('en-ZA', {minimumFractionDigits: 2}) || '0.00'}</span>
                                <div className="flex space-x-2">
                                    <Button onClick={() => handleEditCategory(category)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button>
                                    <Button onClick={() => handleDeleteCategory(category.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
                                </div>
                            </div>

                            {selectedCategoryId === category.id && (
                                <div className="mt-4 p-4 bg-gray-800 rounded-lg animate-fade-in border border-gray-700">
                                    <form onSubmit={handleAddOrUpdateExpense} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
                                        <Input label="Expense Name" name="name" value={newExpense.name} onChange={handleExpenseInputChange} placeholder={editingExpenseId ? "Edit name..." : "e.g., Ranos Rent"}/>
                                        <Input label="Amount (R)" name="amount" type="number" value={newExpense.amount} onChange={handleExpenseInputChange} placeholder="e.g., 2000.00"/>
                                        <Dropdown label="Expense Type" name="expenseType" value={newExpense.expenseType} onChange={handleExpenseInputChange} options={expenseTypeOptions} />
                                        <div className="flex gap-2">
                                            {editingExpenseId && (<Button type="button" variant="secondary" onClick={handleCancelEditExpense}>Cancel</Button>)}
                                            <Button type="submit" variant="primary" className="flex-grow">{editingExpenseId ? "Update" : "Add"}</Button>
                                        </div>
                                    </form>

                                    <div className="space-y-2 max-h-48 overflow-y-auto mt-4 pt-4 border-t border-gray-700">
                                        {(allExpenses[category.id] || []).length === 0 ? <p className="text-gray-400 text-sm">No expenses in this category yet.</p> :
                                            (allExpenses[category.id] || []).map(expense => (
                                                <div key={expense.id} className="flex items-center justify-between bg-gray-700 p-2 rounded-md text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <ExpenseTypeBadge type={expense.expenseType} />
                                                        <p className="text-gray-200">{expense.name}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-gray-300 font-mono">R {(expense.amount || 0).toFixed(2)}</p>
                                                        <div className="flex space-x-2">
                                                            <Button onClick={() => handleEditExpense(expense)} variant="secondary" className="py-0.5 px-2 text-xs">Edit</Button>
                                                            <Button onClick={() => handleDeleteExpense(expense.id)} variant="danger" className="py-0.5 px-2 text-xs">Del</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default OverheadsManager;
