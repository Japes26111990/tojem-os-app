import React, { useState, useMemo } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import { X, DollarSign, Clock, Package, TrendingUp } from 'lucide-react';

const RoiResultCard = ({ title, value, color }) => (
    <div className={`p-4 rounded-lg text-center ${color}`}>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
    </div>
);

const RoiCalculator = ({ onClose, averageBurdenedRate, allProducts, allRecipes, inventoryItems }) => {
    const [inputs, setInputs] = useState({
        investmentCost: '',
        laborSavingsHours: '',
        throughputIncreaseUnits: '',
        selectedProductId: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    };

    const calculation = useMemo(() => {
        const investment = parseFloat(inputs.investmentCost) || 0;
        const laborSavingsPerWeek = (parseFloat(inputs.laborSavingsHours) || 0) * averageBurdenedRate;
        const annualLaborSavings = laborSavingsPerWeek * 52;

        let annualThroughputValue = 0;
        if (inputs.selectedProductId && inputs.throughputIncreaseUnits > 0) {
            const product = allProducts.find(p => p.id === inputs.selectedProductId);
            if (product) {
                const productRecipes = allRecipes.filter(r => r.productId === product.id);
                const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));
                
                let totalMaterialCost = 0;
                let totalLaborCost = 0;

                productRecipes.forEach(recipe => {
                    totalMaterialCost += (recipe.consumables || []).reduce((sum, consumable) => {
                        const inventoryItem = inventoryMap.get(consumable.itemId);
                        return sum + ((inventoryItem?.price || 0) * (consumable.quantity || 0));
                    }, 0);
                    totalLaborCost += (recipe.estimatedTime || 0) / 60 * averageBurdenedRate;
                });
                
                const unitCost = totalMaterialCost + totalLaborCost;
                const unitProfit = (product.sellingPrice || 0) - unitCost;
                annualThroughputValue = unitProfit * (parseFloat(inputs.throughputIncreaseUnits) || 0) * 12;
            }
        }
        
        const totalAnnualGains = annualLaborSavings + annualThroughputValue;
        const roiYears = investment > 0 && totalAnnualGains > 0 ? investment / totalAnnualGains : 0;

        return {
            investment,
            annualLaborSavings,
            annualThroughputValue,
            totalAnnualGains,
            roiYears
        };
    }, [inputs, averageBurdenedRate, allProducts, allRecipes, inventoryItems]);

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Business Case & ROI Calculator</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-white">Investment Details</h3>
                        <Input label="Total Investment Cost (R)" name="investmentCost" type="number" value={inputs.investmentCost} onChange={handleInputChange} placeholder="e.g., 800000" />
                        
                        <h3 className="font-semibold text-lg text-white pt-4 border-t border-gray-700">Projected Gains</h3>
                        <Input label="Labor Savings (Hours per Week)" name="laborSavingsHours" type="number" value={inputs.laborSavingsHours} onChange={handleInputChange} placeholder="e.g., 10" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Dropdown label="Product for Throughput" name="selectedProductId" options={allProducts} value={inputs.selectedProductId} onChange={handleInputChange} placeholder="Select product..." />
                            <Input label="Increased Throughput (Units per Month)" name="throughputIncreaseUnits" type="number" value={inputs.throughputIncreaseUnits} onChange={handleInputChange} placeholder="e.g., 50" />
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="bg-gray-800/50 p-6 rounded-lg space-y-4">
                        <h3 className="font-semibold text-lg text-white text-center">Projected Financial Impact</h3>
                        <RoiResultCard title="Annual Labor Savings" value={`R ${calculation.annualLaborSavings.toLocaleString('en-ZA', {maximumFractionDigits: 0})}`} color="bg-blue-600/20" />
                        <RoiResultCard title="Annual Throughput Profit" value={`R ${calculation.annualThroughputValue.toLocaleString('en-ZA', {maximumFractionDigits: 0})}`} color="bg-purple-600/20" />
                        <RoiResultCard title="Total Annual Gains" value={`R ${calculation.totalAnnualGains.toLocaleString('en-ZA', {maximumFractionDigits: 0})}`} color="bg-green-600/20" />
                        
                        <div className="pt-4 border-t border-gray-700 text-center">
                             <p className="text-sm text-gray-400">Return on Investment (ROI)</p>
                             <p className="text-5xl font-bold text-white mt-1">{calculation.roiYears > 0 ? `${calculation.roiYears.toFixed(2)}` : '0.00'}<span className="text-2xl text-gray-400 ml-2">years</span></p>
                        </div>
                    </div>
                </div>
                 <div className="p-4 bg-gray-800 border-t border-gray-700">
                    <p className="text-center text-sm text-gray-300">
                        "I am proposing a capital investment of <strong className="text-white">R{calculation.investment.toLocaleString('en-ZA')}</strong>. This will generate <strong className="text-white">R{calculation.totalAnnualGains.toLocaleString('en-ZA', {maximumFractionDigits: 0})}</strong> per year in savings and increased profit, delivering an ROI in under <strong className="text-white">{Math.ceil(calculation.roiYears)}</strong> years."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoiCalculator;