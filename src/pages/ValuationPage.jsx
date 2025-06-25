import React, { useState, useEffect, useMemo } from 'react';
// MainLayout import removed
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { getProducts, getCompletedJobsInRange, getAllInventoryItems, getOverheadCategories, getOverheadExpenses } from '../api/firestore';
import { DollarSign, TrendingUp, Package, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const ValuationKpiCard = ({ icon, title, value, color }) => (
  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const ValuationPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [allOverheadExpenses, setAllOverheadExpenses] = useState([]);
  const [completedJobsInPeriod, setCompletedJobsInPeriod] = useState([]);

  useEffect(() => {
    const fetchStaticData = async () => {
      setLoading(true);
      try {
        const [products, inventory, overheadCats] = await Promise.all([
          getProducts(), getAllInventoryItems(), getOverheadCategories()
        ]);
        setAllProducts(products);
        setAllInventoryItems(inventory);
        
        const expensePromises = overheadCats.map(cat => getOverheadExpenses(cat.id));
        const expenseResults = await Promise.all(expensePromises);
        setAllOverheadExpenses(expenseResults.flat());
      } catch (err) {
        console.error("Error fetching static data for valuation:", err);
        setError("Failed to load foundational data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStaticData();
  }, []);

  const calculateValuation = async () => {
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.");
      return;
    }
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    if (startDateTime > endDateTime) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedJobs = await getCompletedJobsInRange(startDateTime, endDateTime);
      setCompletedJobsInPeriod(fetchedJobs);
    } catch (err) {
      console.error("Error fetching completed jobs for valuation:", err);
      setError("Failed to fetch completed jobs for the period.");
    } finally {
      setLoading(false);
    }
  };

  const valuationMetrics = useMemo(() => {
    // ... (memoized logic remains the same)
    let totalSales = 0;
    let totalCogs = 0;
    let totalLaborCost = 0;
    let totalMaterialCost = 0;
    const dailyProfit = {};
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    completedJobsInPeriod.forEach(job => {
        const product = productsMap.get(job.partId);
        if (product && typeof product.sellingPrice === 'number') {
            totalSales += product.sellingPrice;
        }
        if (typeof job.totalCost === 'number') totalCogs += job.totalCost;
        if (typeof job.laborCost === 'number') totalLaborCost += job.laborCost;
        if (typeof job.materialCost === 'number') totalMaterialCost += job.materialCost;

        if (job.completedAt) {
            const dateKey = new Date(job.completedAt.seconds * 1000).toISOString().split('T')[0];
            if (!dailyProfit[dateKey]) {
                dailyProfit[dateKey] = { sales: 0, cogs: 0 };
            }
            dailyProfit[dateKey].sales += (product?.sellingPrice || 0);
            dailyProfit[dateKey].cogs += (job.totalCost || 0);
        }
    });

    const totalOverheads = allOverheadExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const grossProfit = totalSales - totalCogs;
    const netProfit = grossProfit - totalOverheads;
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const currentInventoryValue = allInventoryItems.reduce((sum, item) => sum + ((Number(item.currentStock) || 0) * (Number(item.price) || 0)), 0);

    const costBreakdown = [
        { name: 'Material Cost', value: totalMaterialCost },
        { name: 'Labor Cost', value: totalLaborCost },
        { name: 'Overhead Cost', value: totalOverheads },
    ].filter(c => c.value > 0);

    const profitTrendData = Object.keys(dailyProfit).sort().map(date => ({
        date,
        grossProfit: dailyProfit[date].sales - dailyProfit[date].cogs
    }));
    
    return { totalSales, totalCogs, grossProfit, totalOverheads, netProfit, grossProfitMargin, netProfitMargin, currentInventoryValue, costBreakdown, profitTrendData };
  }, [completedJobsInPeriod, allProducts, allInventoryItems, allOverheadExpenses]);

  if (loading && !completedJobsInPeriod.length) return <p>Loading Valuation Data...</p>

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Business Valuation</h2>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Valuation Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
          <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button onClick={calculateValuation} disabled={loading || !startDate || !endDate}>
            {loading ? 'Calculating...' : 'Calculate Valuation'}
          </Button>
        </div>
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>

      {completedJobsInPeriod.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValuationKpiCard icon={<DollarSign size={24} />} title="Total Revenue (Sales)" value={`R ${valuationMetrics.totalSales.toFixed(2)}`} color="bg-green-500/20 text-green-400" />
            <ValuationKpiCard icon={<DollarSign size={24} />} title="Total COGS" value={`R ${valuationMetrics.totalCogs.toFixed(2)}`} color="bg-red-500/20 text-red-400" />
            <ValuationKpiCard icon={<TrendingUp size={24} />} title="Gross Profit Margin" value={`${valuationMetrics.grossProfitMargin.toFixed(1)}%`} color={valuationMetrics.grossProfitMargin >= 0 ? "bg-teal-500/20 text-teal-400" : "bg-red-500/20 text-red-400"} />
            <ValuationKpiCard icon={<Package size={24} />} title="Current Inventory Value" value={`R ${valuationMetrics.currentInventoryValue.toFixed(2)}`} color="bg-blue-500/20 text-blue-400" />
            <ValuationKpiCard icon={<DollarSign size={24} />} title="Net Profit (Period)" value={`R ${valuationMetrics.netProfit.toFixed(2)}`} color={valuationMetrics.netProfit >= 0 ? "bg-purple-500/20 text-purple-400" : "bg-red-500/20 text-red-400"} />
            <ValuationKpiCard icon={<Percent size={24} />} title="Net Profit Margin" value={`${valuationMetrics.netProfitMargin.toFixed(1)}%`} color={valuationMetrics.netProfitMargin >= 0 ? "bg-purple-500/20 text-purple-400" : "bg-red-500/20 text-red-400"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Cost Breakdown (Period)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={valuationMetrics.costBreakdown}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R${v/1000}k`}/>
                  <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #4b5563'}} formatter={(v) => `R ${v.toFixed(2)}`}/>
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Gross Profit Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={valuationMetrics.profitTrendData}>
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12}/>
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R${v/1000}k`}/>
                  <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #4b5563'}} formatter={(v) => `R ${v.toFixed(2)}`}/>
                  <Line type="monotone" dataKey="grossProfit" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {completedJobsInPeriod.length === 0 && !loading && startDate && endDate &&
        <p className="text-gray-400 text-center">No completed jobs found for the selected period.</p>
      }
    </div>
  );
};

export default ValuationPage;