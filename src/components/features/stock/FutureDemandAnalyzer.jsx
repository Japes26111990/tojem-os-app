import React, { useState, useMemo } from 'react';
import { listenToJobCards, getAllInventoryItems } from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, TrendingDown, Check, AlertTriangle } from 'lucide-react';

const FutureDemandAnalyzer = ({ onClose }) => {
    const [daysToAnalyze, setDaysToAnalyze] = useState(30); // Default to 30 days for a better forecast
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        setAnalysis(null);

        try {
            // We can still use listenToJobCards, but we only need the data once for this manual analysis.
            const allJobs = await new Promise(resolve => {
                const unsubscribe = listenToJobCards(jobs => {
                    unsubscribe();
                    resolve(jobs);
                });
            });

            const inventoryItems = await getAllInventoryItems();
            const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));

            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + Number(daysToAnalyze));

            // Filter for jobs scheduled within the analysis window
            const scheduledJobs = allJobs.filter(job => {
                const scheduled = job.scheduledDate?.toDate();
                return scheduled && scheduled >= now && scheduled <= futureDate;
            });

            const requiredMaterials = new Map();

            // Aggregate all required materials from the scheduled jobs
            for (const job of scheduledJobs) {
                // Ensure we use processedConsumables which includes calculated quantities
                const consumables = job.processedConsumables || [];
                for (const consumable of consumables) {
                    if (consumable.id) { // Ensure the consumable has a valid ID
                         const requiredQty = requiredMaterials.get(consumable.id) || 0;
                         requiredMaterials.set(consumable.id, requiredQty + consumable.quantity);
                    }
                }
            }

            const analysisResults = [];
            for (const [itemId, futureDemand] of requiredMaterials.entries()) {
                const item = inventoryMap.get(itemId);
                if (item) {
                    const projectedStock = (item.currentStock || 0) - futureDemand;
                    analysisResults.push({
                        ...item,
                        futureDemand,
                        projectedStock,
                    });
                }
            }

            // Sort results to show the most critical items first
            analysisResults.sort((a,b) => a.projectedStock - b.projectedStock);
            setAnalysis(analysisResults);

        } catch (error) {
            console.error("Error analyzing future demand:", error);
            toast.error("Failed to analyze demand. See console for details.");
        }
        setLoading(false);
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Predictive Inventory Analyzer</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>

                <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex items-end gap-4">
                    <div className="w-48">
                        <Input
                            label="Days to Analyze"
                            type="number"
                            value={daysToAnalyze}
                            onChange={e => setDaysToAnalyze(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAnalyze} disabled={loading}>
                        {loading ? 'Analyzing...' : 'Analyze Future Demand'}
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {!analysis && <p className="text-center text-gray-500">Enter the number of days you want to forecast and click "Analyze".</p>}
                    {analysis && (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="p-2">Item</th>
                                    <th className="p-2 text-center">Current</th>
                                    <th className="p-2 text-center">Required</th>
                                    <th className="p-2 text-center">Projected</th>
                                    <th className="p-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.map(item => {
                                    const isCritical = item.projectedStock < 0;
                                    const isLow = item.projectedStock >= 0 && item.projectedStock < item.reorderLevel;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-700">
                                            <td className="p-2 font-semibold text-white">{item.name}</td>
                                            <td className="p-2 text-gray-300 text-center">{item.currentStock}</td>
                                            <td className="p-2 text-blue-400 text-center">{item.futureDemand.toFixed(2)}</td>
                                            <td className={`p-2 font-bold text-center ${isCritical ? 'text-red-500' : isLow ? 'text-yellow-400' : 'text-white'}`}>
                                                {item.projectedStock.toFixed(2)}
                                            </td>
                                            <td className="p-2">
                                                {isCritical && <span className="flex items-center gap-1 text-red-500"><TrendingDown size={14}/> Critical</span>}
                                                {isLow && <span className="flex items-center gap-1 text-yellow-400"><AlertTriangle size={14}/> Low</span>}
                                                {!isCritical && !isLow && <span className="flex items-center gap-1 text-green-400"><Check size={14}/> OK</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {analysis.length === 0 && <p className="text-center text-gray-400 py-6">No material demand found for the scheduled jobs in this period.</p>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FutureDemandAnalyzer;
