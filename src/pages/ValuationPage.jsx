// src/pages/ValuationPage.jsx (UPDATED)

import React, { useState, useEffect, useMemo } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { getProducts, getCompletedJobsInRange, getEmployees, getOverheadCategories, getOverheadExpenses, listenToJobCards, getJobStepDetails, getAllInventoryItems } from '../api/firestore';
import { DollarSign, TrendingUp, Package, Percent, Calculator } from 'lucide-react';
import WorkforceCapacityPlanner from '../components/intelligence/WorkforceCapacityPlanner';
import ProfitTargetMatrix from '../components/intelligence/ProfitTargetMatrix';
import RoiCalculator from '../components/intelligence/RoiCalculator';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data States
  const [allProducts, setAllProducts] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [allOverheadExpenses, setAllOverheadExpenses] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [isRoiModalOpen, setIsRoiModalOpen] = useState(false);

  // States for historical period analysis
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodJobs, setPeriodJobs] = useState(null);

  useEffect(() => {
    const fetchStaticData = async () => {
      setLoading(true);
      try {
        const [products, employees, overheadCats, recipes, inventory] = await Promise.all([
          getProducts(), 
          getEmployees(), 
          getOverheadCategories(), 
          getJobStepDetails(),
          getAllInventoryItems()
        ]);
        setAllProducts(products);
        setAllEmployees(employees);
        setAllRecipes(recipes);
        setAllInventoryItems(inventory);
        
        const expensePromises = overheadCats.map(cat => getOverheadExpenses(cat.id));
        const expenseResults = await Promise.all(expensePromises);
        setAllOverheadExpenses(expenseResults.flat());

        // --- FIX: Destructure the 'jobs' array from the listener's response ---
        const unsubscribe = listenToJobCards(({ jobs }) => {
            if (Array.isArray(jobs)) {
                setAllJobs(jobs);
            }
            setLoading(false);
        });
        return unsubscribe;

      } catch (err) {
        console.error("Error fetching static data:", err);
        setError("Failed to load foundational data.");
        setLoading(false);
      }
    };
    
    const unsubscribePromise = fetchStaticData();
    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) unsubscribe();
        });
    };
  }, []);

  const handleCalculateAnalysis = async () => {
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.");
      return;
    }
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const filteredJobs = allJobs.filter(job => {
        const completedDate = job.completedAt?.toDate();
        return job.status === 'Complete' && completedDate >= startDateTime && completedDate <= endDateTime;
    });
    setPeriodJobs(filteredJobs);
  };
  
  const masterFinancials = useMemo(() => {
    // Add a guard clause to ensure 'allJobs' is an array
    if (!Array.isArray(allJobs)) {
        return { totalFixedCosts: 0, historicalGrossMargin: 35, employeesWithPerformance: [], averageBurdenedRate: 0 };
    }

    const productsMap = new Map(allProducts.map(p => [p.id, p]));
    const allCompletedJobs = allJobs.filter(j => j.status === 'Complete');

    let totalSales = 0;
    let totalMaterialCost = 0;
    allCompletedJobs.forEach(job => {
        const product = productsMap.get(job.partId);
        if (product && typeof product.sellingPrice === 'number') {
            totalSales += product.sellingPrice;
        }
        totalMaterialCost += job.materialCost || 0;
    });

    const historicalGrossMargin = totalSales > 0 ? ((totalSales - totalMaterialCost) / totalSales) * 100 : 35;
    const totalFixedCosts = allOverheadExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalMonthlyLabor = allEmployees.reduce((sum, emp) => sum + ((emp.hourlyRate || 0) * 173.2), 0);
    const totalMonthlyFixedCosts = totalFixedCosts + totalMonthlyLabor;

    const totalHourlyRate = allEmployees.reduce((sum, emp) => sum + (emp.hourlyRate || 0), 0);
    const avgDirectRate = allEmployees.length > 0 ? totalHourlyRate / allEmployees.length : 0;
    const overheadCostPerHour = allOverheadExpenses.length > 0 && allEmployees.length > 0 ? totalFixedCosts / (allEmployees.length * 173.2) : 0;
    const averageBurdenedRate = avgDirectRate + overheadCostPerHour;

    const employeesWithPerformance = allEmployees.map(emp => {
      const empJobs = allCompletedJobs.filter(job => job.employeeId === emp.id && job.status === 'Complete');
      if (empJobs.length === 0) return { ...emp, efficiency: 100 };
      
      let totalEfficiencyRatio = 0, jobsWithTime = 0;
      empJobs.forEach(job => {
        if (job.estimatedTime > 0 && job.startedAt && job.completedAt) {
          const durationSeconds = (job.completedAt.seconds - job.startedAt.seconds) - (job.totalPausedMilliseconds / 1000 || 0);
          if (durationSeconds > 0) {
            totalEfficiencyRatio += ((job.estimatedTime * 60) / durationSeconds);
            jobsWithTime++;
          }
        }
      });
      const avgEfficiency = jobsWithTime > 0 ? (totalEfficiencyRatio / jobsWithTime) * 100 : 100;
      return { ...emp, efficiency: avgEfficiency };
    });

    return { totalFixedCosts: totalMonthlyFixedCosts, historicalGrossMargin, employeesWithPerformance, averageBurdenedRate };
  }, [allProducts, allEmployees, allJobs, allOverheadExpenses]);

  const historicalPeriodAnalysis = useMemo(() => {
    if (!periodJobs) return null;

    let totalSales = 0;
    let totalCogs = 0;
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    periodJobs.forEach(job => {
        const product = productsMap.get(job.partId);
        if (product && typeof product.sellingPrice === 'number') {
            totalSales += product.sellingPrice;
        }
        if (typeof job.totalCost === 'number') totalCogs += job.totalCost;
    });

    const grossProfit = totalSales - totalCogs;
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    
    return { totalSales, totalCogs, grossProfit, grossProfitMargin };
  }, [periodJobs, allProducts]);


  if (loading) return <p>Loading Financials & Planning...</p>

  return (
    <>
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Financials & Planning</h2>
                <Button onClick={() => setIsRoiModalOpen(true)} variant="secondary">
                    <Calculator size={18} className="mr-2"/>
                    ROI Calculator
                </Button>
            </div>

            <ProfitTargetMatrix 
                totalFixedCosts={masterFinancials.totalFixedCosts}
                historicalGrossMargin={masterFinancials.historicalGrossMargin}
            />
            
            <WorkforceCapacityPlanner 
                realEmployees={masterFinancials.employeesWithPerformance}
                jobs={allJobs}
            />

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Historical Performance Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <Button onClick={handleCalculateAnalysis} disabled={loading || !startDate || !endDate}>
                    Analyze Period
                </Button>
                </div>
                {error && <p className="text-red-400 text-center">{error}</p>}
            </div>

            {historicalPeriodAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    <ValuationKpiCard icon={<DollarSign size={24} />} title="Total Revenue" value={`R ${historicalPeriodAnalysis.totalSales.toFixed(2)}`} color="bg-green-500/20 text-green-400" />
                    <ValuationKpiCard icon={<DollarSign size={24} />} title="Total COGS" value={`R ${historicalPeriodAnalysis.totalCogs.toFixed(2)}`} color="bg-red-500/20 text-red-400" />
                    <ValuationKpiCard icon={<Percent size={24} />} title="Gross Profit Margin" value={`${historicalPeriodAnalysis.grossProfitMargin.toFixed(1)}%`} color={historicalPeriodAnalysis.grossProfitMargin >= 0 ? "bg-teal-500/20 text-teal-400" : "bg-red-500/20 text-red-400"} />
                </div>
            )}
        </div>
        
        {isRoiModalOpen && (
            <RoiCalculator 
                onClose={() => setIsRoiModalOpen(false)}
                averageBurdenedRate={masterFinancials.averageBurdenedRate}
                allProducts={allProducts}
                allRecipes={allRecipes}
                inventoryItems={allInventoryItems}
            />
        )}
    </>
  );
};

export default ValuationPage;
