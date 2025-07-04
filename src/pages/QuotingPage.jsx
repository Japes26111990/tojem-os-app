// src/pages/QuotingPage.jsx (Corrected and Final Version)

import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import { PlusCircle, CheckCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../api/firebase';
import { 
    getProducts, 
    getJobStepDetails, 
    getAllInventoryItems, 
    getEmployees, 
    getOverheadCategories, 
    getOverheadExpenses,
    createSalesOrderFromQuote
} from '../api/firestore';
import QuoteCreator from '../components/features/quotes/QuoteCreator';
import toast from 'react-hot-toast';

const QuotingPage = () => {
    const [quotes, setQuotes] = useState([]);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [calculationData, setCalculationData] = useState({
        products: [],
        allRecipes: [],
        inventoryItems: [],
        averageBurdenedRate: 0,
    });

    useEffect(() => {
        const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
        const unsubscribeQuotes = onSnapshot(q, (snapshot) => {
            setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

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
                const totalCompanyProductiveHours = (employees.length || 1) * 173.2;
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
                toast.error("Failed to load data for quoting engine.");
            } finally {
                setLoading(false);
            }
        };

        fetchCalculationData();

        return () => unsubscribeQuotes();
    }, []);
    
    const handleAcceptQuote = (quote) => {
        toast((t) => (
            <span>
                Accept this quote and create a Sales Order?
                <Button variant="primary" size="sm" className="ml-2" onClick={() => {
                    createSalesOrderFromQuote(quote)
                        .then(() => {
                            toast.success(`Quote ${quote.quoteId} accepted!`);
                        })
                        .catch(err => {
                            toast.error("Failed to accept the quote.");
                            console.error("Error accepting quote: ", err);
                        });
                    toast.dismiss(t.id);
                }}>
                    Accept
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: '✔️' });
    };
    
    const getStatusComponent = (quote) => {
        const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block";
        switch (quote.status) {
            case 'draft':
                return (
                    <Button onClick={() => handleAcceptQuote(quote)} variant="primary" className="py-1 px-2 text-xs">
                        <CheckCircle size={14} className="mr-1" />
                        Accept Quote
                    </Button>
                );
            case 'Accepted':
                 return <span className={`${baseClasses} bg-green-500/20 text-green-300`}>Accepted</span>;
            case 'sent':
                return <span className={`${baseClasses} bg-blue-500/20 text-blue-300`}>Sent</span>;
            default:
                return <span className={`${baseClasses} bg-gray-500/20 text-gray-300`}>{quote.status}</span>;
        }
    };

    return (
        <>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white">Sales Quotes</h2>
                    <Button onClick={() => setIsCreatorOpen(true)} variant="primary" disabled={loading}>
                        {loading ? 'Loading Engine...' : <><PlusCircle size={18} className="mr-2" />Create New Quote</>}
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
                                <th className="p-3 text-sm font-semibold text-gray-400 text-center">Status</th>
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
                                    <td className="p-3 text-center">
                                        {getStatusComponent(quote)}
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