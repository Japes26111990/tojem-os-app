import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import {
  getProducts, getCompletedJobsInRange, getAllInventoryItems,
  getOverheadCategories, getOverheadExpenses, getEmployees
} from '../api/firestore';
import {
  DollarSign, TrendingUp, Package, Percent
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const KpiCard = ({ icon, title, value, color }) => (
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

  // Raw data from Firestore
  const [allProducts, setAllProducts] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [allOverheadCategories, setAllOverheadCategories] = useState([]);
  const [allOverheadExpenses, setAllOverheadExpenses] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]); // Needed for average burdened rate if COGS not enough

  // Processed data for display/charts
  const [completedJobsInPeriod, setCompletedJobsInPeriod] = useState([]);

  // Fetch static data on mount
  useEffect(() => {
    const fetchStaticData = async () => {
      setLoading(true);
      try {
        const [
          products, inventory, overheadCats, employees
        ] = await Promise.all([
          getProducts(), getAllInventoryItems(), getOverheadCategories(), getEmployees()
        ]);
        setAllProducts(products);
        setAllInventoryItems(inventory);
        setAllOverheadCategories(overheadCats);
        setAllEmployees(employees);

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
      // Fetch completed jobs for the selected period
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
    if (loading || !allProducts.length || !allInventoryItems.length || !allOverheadExpenses.length) {
      return {
        totalSales: 0,
        totalCogs: 0,
        grossProfit: 0,
        totalOverheads: 0,
        netProfit: 0,
        grossProfitMargin: 0,
        netProfitMargin: 0,
        currentInventoryValue: 0,
        costBreakdown: [],
        profitTrendData: []
      };
    }

    let totalSales = 0;
    let totalCogs = 0;
    let totalLaborCost = 0;
    let totalMaterialCost = 0;

    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Prepare data for profit trend chart (daily aggregation)
    const dailyProfit = {}; // { 'YYYY-MM-DD': { sales, cogs, labor, material } }

    completedJobsInPeriod.forEach(job => {
      const product = productsMap.get(job.partId);
      if (product && typeof product.sellingPrice === 'number') {
        totalSales += product.sellingPrice;
      } else {
        // Fallback: If sellingPrice is not linked via product, use totalCost as a proxy for revenue if necessary, or log a warning
        // For accurate valuation, linking product sellingPrice to job.partId is crucial.
        console.warn(`Selling price not found for product ID: ${job.partId} in job ${job.jobId}.`);
        // You might want a default or estimation here, for now, it won't add to sales.
      }

      // totalCost from job includes materialCost + laborCost
      if (typeof job.totalCost === 'number') {
        totalCogs += job.totalCost;
      }
      if (typeof job.laborCost === 'number') {
        totalLaborCost += job.laborCost;
      }
      if (typeof job.materialCost === 'number') {
        totalMaterialCost += job.materialCost;
      }

      // Aggregate for trend chart
      if (job.completedAt) {
        const dateKey = new Date(job.completedAt.seconds * 1000).toISOString().split('T')[0];
        if (!dailyProfit[dateKey]) {
          dailyProfit[dateKey] = { sales: 0, cogs: 0, labor: 0, material: 0 };
        }
        dailyProfit[dateKey].sales += (product?.sellingPrice || 0); // Use selling price for sales
        dailyProfit[dateKey].cogs += (job.totalCost || 0); // Use job totalCost for COGS
        dailyProfit[dateKey].labor += (job.laborCost || 0);
        dailyProfit[dateKey].material += (job.materialCost || 0);
      }
    });

    // Calculate total overheads for the period (assuming fixed monthly overheads for simplicity)
    // For a specific period, you might need to pro-rate monthly overheads.
    // For simplicity, let's sum all overhead expenses for the entire period as a total fixed cost for this analysis.
    const totalOverheads = allOverheadExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const grossProfit = totalSales - totalCogs;
    const netProfit = grossProfit - totalOverheads;

    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    const currentInventoryValue = allInventoryItems.reduce((sum, item) => {
      const stock = Number(item.currentStock) || 0;
      const price = Number(item.price) || 0; // Assuming item.price is cost, not selling
      return sum + (stock * price);
    }, 0);

    const costBreakdown = [
      { name: 'Material Cost', value: totalMaterialCost, fill: '#4CAF50' }, // Green
      { name: 'Labor Cost', value: totalLaborCost, fill: '#2196F3' },     // Blue
      { name: 'Overhead Cost', value: totalOverheads, fill: '#FFC107' },   // Amber
    ].filter(c => c.value > 0); // Only show costs that have a value

    const profitTrendData = Object.keys(dailyProfit).sort().map(date => {
      const data = dailyProfit[date];
      const dailyGrossProfit = data.sales - data.cogs;
      // Pro-rating daily overheads is complex. For trend, we can use simple net based on collected costs for now.
      // Or simply show Gross Profit trend, as true daily overhead allocation needs more logic.
      // Let's go with daily Gross Profit for the trend.
      return {
        date,
        grossProfit: dailyGrossProfit,
        netProfit: dailyGrossProfit // Simplification: assuming no daily overhead allocation here yet
      };
    }).filter(d => d.netProfit !== 0 || d.grossProfit !== 0); // Filter out days with no activity/profit


    return {
      totalSales,
      totalCogs,
      grossProfit,
      totalOverheads,
      netProfit,
      grossProfitMargin,
      netProfitMargin,
      currentInventoryValue,
      costBreakdown,
      profitTrendData
    };

  }, [completedJobsInPeriod, allProducts, allInventoryItems, allOverheadExpenses, loading]);


  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Business Valuation</h2>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Valuation Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button onClick={calculateValuation} disabled={loading || !startDate || !endDate}>
              {loading ? 'Calculating...' : 'Calculate Valuation'}
            </Button>
          </div>
          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>

        {/* Display KPIs */}
        {completedJobsInPeriod.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard icon={<DollarSign size={24} />} title="Total Revenue (Sales)" value={`R ${valuationMetrics.totalSales.toFixed(2)}`} color="bg-green-500/20 text-green-400" />
            <KpiCard icon={<DollarSign size={24} />} title="Total COGS" value={`R ${valuationMetrics.totalCogs.toFixed(2)}`} color="bg-red-500/20 text-red-400" />
            <KpiCard icon={<TrendingUp size={24} />} title="Gross Profit Margin" value={`${valuationMetrics.grossProfitMargin.toFixed(1)}%`} color={valuationMetrics.grossProfitMargin >= 0 ? "bg-teal-500/20 text-teal-400" : "bg-red-500/20 text-red-400"} />
            <KpiCard icon={<Package size={24} />} title="Current Inventory Value" value={`R ${valuationMetrics.currentInventoryValue.toFixed(2)}`} color="bg-blue-500/20 text-blue-400" />
            
            <KpiCard icon={<DollarSign size={24} />} title="Net Profit (Period)" value={`R ${valuationMetrics.netProfit.toFixed(2)}`} color={valuationMetrics.netProfit >= 0 ? "bg-purple-500/20 text-purple-400" : "bg-red-500/20 text-red-400"} />
            <KpiCard icon={<Percent size={24} />} title="Net Profit Margin" value={`${valuationMetrics.netProfitMargin.toFixed(1)}%`} color={valuationMetrics.netProfitMargin >= 0 ? "bg-purple-500/20 text-purple-400" : "bg-red-500/20 text-red-400"} />
          </div>
        )}

        {/* Charts Section */}
        {completedJobsInPeriod.length > 0 && (valuationMetrics.costBreakdown.length > 0 || valuationMetrics.profitTrendData.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {valuationMetrics.costBreakdown.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Cost Breakdown (Period)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={valuationMetrics.costBreakdown} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `R ${value.toFixed(0)}`} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                      formatter={(value) => `R ${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Cost Amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {valuationMetrics.profitTrendData.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Gross Profit Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={valuationMetrics.profitTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `R ${value.toFixed(0)}`} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                      formatter={(value) => `R ${value.toFixed(2)}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="grossProfit" stroke="#82ca9d" name="Gross Profit" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {completedJobsInPeriod.length === 0 && !loading && (startDate && endDate) &&
          <p className="text-gray-400 text-center">No completed jobs found for the selected period to calculate valuation metrics.</p>
        }
      </div>
    </MainLayout>
  );
};

export default ValuationPage;
