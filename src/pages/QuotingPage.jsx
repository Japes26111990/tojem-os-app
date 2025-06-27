// src/pages/QuotingPage.jsx (UPGRADED)

import React, { useState, useEffect, useMemo } from 'react';
import Button from '../components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../api/firebase';
import { getProducts, getJobStepDetails, getAllInventoryItems, getEmployees, getOverheadCategories, getOverheadExpenses } from '../api/firestore';
import QuoteCreator from '../components/features/quotes/QuoteCreator';

const QuotingPage = () => {
    const [quotes, setQuotes] = useState([]);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // State to hold all the data needed for cost calculation
    const [calculationData, setCalculationData] = useState({
        products: [],
        allRecipes: [],
        inventoryItems: [],
        averageBurdenedRate: 0,
    });

    useEffect(() => {
        // This listener will keep the quotes list up to date
        const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
        const unsubscribeQuotes = onSnapshot(q, (snapshot) => {
            setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // This fetches all the data needed for our calculations one time
        const fetchCalculationData = async () => {
            setLoading(true);
            try {
                const [prods, recipes, inventory, employees, overheadCats] = await Promise.all([
                    getProducts(),
                    getJobStepDetails(),
                    getAllInventoryItems(),
                    getEmployees(),
                    getOverheadCategories()
                ]);

                const expensePromises = overheadCats.map(cat => getOverheadExpenses(cat.id));
                const expenseResults = await Promise.all(expensePromises);
                const totalMonthlyOverheads = expenseResults.flat().reduce((sum, exp) => sum + (exp.amount || 0), 0);
                const totalCompanyProductiveHours = (employees.length || 1) * 173.2; // Monthly productive hours
                const overheadCostPerHour = totalCompanyProductiveHours > 0 ? totalMonthlyOverheads / totalCompanyProductiveHours : 0;
                const totalHourlyRate = employees.reduce((sum, emp) => sum + (emp.hourlyRate || 0), 0);
                const avgDirectRate = employees.length > 0 ? totalHourlyRate / employees.length : 0;
                
                setCalculationData({
                    products: prods,
                    allRecipes: recipes,
                    inventoryItems: inventory,
                    averageBurdenedRate: avgDirectRate + overheadCostPerHour,
                });

            } catch (err) {
                console.error("Failed to load data for quoting engine:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCalculationData();

        return () => unsubscribeQuotes();
    }, []);

    return (
        <>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white">Sales Quotes</h2>
                    <Button onClick={() => setIsCreatorOpen(true)} variant="primary" disabled={loading}>
                        {loading ? 'Loading Data...' : <><PlusCircle size={18} className="mr-2" />Create New Quote</>}
                    </Button>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-400">Date</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Quote ID</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Customer</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Total</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan="5" className="text-center p-8 text-gray-400">Loading quotes...</td></tr>}
                            {!loading && quotes.length === 0 && <tr><td colSpan="5" className="text-center p-8 text-gray-400">No quotes found. Click 'Create New Quote' to start.</td></tr>}
                            {!loading && quotes.map(quote => (
                                <tr key={quote.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 text-sm text-gray-400">{quote.createdAt?.toDate().toLocaleDateString()}</td>
                                    <td className="p-3 text-sm font-mono text-gray-300">{quote.quoteId}</td>
                                    <td className="p-3 text-sm text-white font-medium">{quote.customerName}</td>
                                    <td className="p-3 text-sm font-mono text-right font-semibold text-green-400">R {quote.total.toFixed(2)}</td>
                                    <td className="p-3 text-sm capitalize">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            quote.status === 'draft' ? 'bg-yellow-500/20 text-yellow-300' :
                                            quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300' :
                                            'bg-gray-500/20 text-gray-300'
                                        }`}>{quote.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isCreatorOpen && (
                <QuoteCreator 
                    onClose={() => setIsCreatorOpen(false)} 
                    calculationData={calculationData}
                />
            )}
        </>
    );
};

export default QuotingPage;