import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { listenToJobCards, getAllInventoryItems } from '../api/firestore';
import { Activity, Clock, AlertCircle, TrendingUp, DollarSign, CalendarDays, Flag, Package, Box, ShoppingCart, Gauge } from 'lucide-react'; // Added Gauge icon
import { NavLink } from 'react-router-dom';

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        <div><p className="text-gray-400 text-sm">{title}</p><p className="text-3xl font-bold text-white">{value}</p></div>
    </div>
);

const DashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    const businessData = {
        monthlyTarget: 280000.00,
        currentSales: 71922.50,
        workdaysLeftMonth: 10,
    };

    useEffect(() => {
        const fetchData = async () => {
            const inventoryItems = await getAllInventoryItems();
            setInventory(inventoryItems);
        }

        const unsubscribeJobs = listenToJobCards((fetchedJobs) => {
            setJobs(fetchedJobs);
            setLoading(false);
        });
        
        fetchData();
        return () => unsubscribeJobs();
    }, []);

    // --- UPGRADED to calculate new efficiency KPIs ---
    const { liveKpis, salesKpis, actionableItems, performanceKpis } = useMemo(() => {
        const jobsInProgress = jobs.filter(j => j.status === 'In Progress').length;
        const awaitingQc = jobs.filter(j => j.status === 'Awaiting QC').length;
        const issues = jobs.filter(j => j.status === 'Issue');
        
        const percentToTarget = (businessData.currentSales / businessData.monthlyTarget) * 100;
        const salesPerDay = (businessData.monthlyTarget - businessData.currentSales) / businessData.workdaysLeftMonth;
        
        const lowStockItems = inventory.filter(item => item.currentStock < item.reorderLevel).slice(0, 5);
        const jobsWithIssues = issues.slice(0, 5);

        // --- NEW CALCULATIONS ---
        const completedJobsWithTime = jobs.filter(j => j.startedAt && j.completedAt && j.estimatedTime > 0);
        let averageEfficiency = 0;
        if (completedJobsWithTime.length > 0) {
            const totalEfficiency = completedJobsWithTime.reduce((acc, job) => {
                const actualSeconds = job.completedAt.seconds - job.startedAt.seconds;
                const estimatedSeconds = job.estimatedTime * 60;
                return acc + (estimatedSeconds / actualSeconds);
            }, 0);
            averageEfficiency = (totalEfficiency / completedJobsWithTime.length) * 100;
        }

        return {
            liveKpis: { jobsInProgress, awaitingQc, issues: issues.length },
            salesKpis: { percentToTarget: isNaN(percentToTarget) ? 0 : percentToTarget, salesPerDay: isNaN(salesPerDay) ? 0 : salesPerDay },
            actionableItems: { lowStockItems, jobsWithIssues },
            performanceKpis: {
                avgEfficiency: `${Math.round(averageEfficiency)}%`
            }
        };
    }, [jobs, inventory, businessData]);

    if (loading) {
        return <MainLayout><p>Loading Mission Control...</p></MainLayout>;
    }

    return (
        <MainLayout>
              <div className="space-y-10">
                  <h2 className="text-3xl font-bold text-white">Mission Control</h2>
                  
                  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xl font-bold text-white">Monthly Sales Target</h3>
                          <span className="text-lg font-bold text-green-400">{salesKpis.percentToTarget.toFixed(2)}%</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-4">R{businessData.currentSales.toFixed(2)} / <span className="font-semibold">R{businessData.monthlyTarget.toFixed(2)}</span></p>
                      <div className="w-full bg-gray-600 rounded-full h-4"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${salesKpis.percentToTarget}%` }}></div></div>
                      <div className="mt-4 text-center"><p className="text-gray-300">You need to average <span className="font-bold text-lg text-yellow-400">R{salesKpis.salesPerDay.toFixed(2)}</span> per workday to hit your target.</p></div>
                  </div>

                  {/* Grid now has 4 columns to accommodate the new KPI card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <KpiCard icon={<Activity size={24} />} title="Jobs In Progress" value={liveKpis.jobsInProgress} color="bg-blue-500/20 text-blue-400" />
                      <KpiCard icon={<Clock size={24} />} title="Awaiting QC" value={liveKpis.awaitingQc} color="bg-purple-500/20 text-purple-400" />
                      <KpiCard icon={<AlertCircle size={24} />} title="Jobs with Issues" value={liveKpis.issues} color="bg-red-500/20 text-red-400" />
                      {/* --- NEW KPI CARD --- */}
                      <KpiCard icon={<Gauge size={24} />} title="Avg. Job Efficiency" value={performanceKpis.avgEfficiency} color="bg-teal-500/20 text-teal-400" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                          <h3 className="font-bold text-white mb-4 flex items-center"><ShoppingCart size={20} className="mr-2 text-yellow-400"/> Inventory Alerts</h3>
                          <div className="space-y-3">
                              {actionableItems.lowStockItems.length > 0 ? actionableItems.lowStockItems.map(item => (
                                  <div key={item.id} className="text-sm p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                      <div>
                                          <p className="font-semibold text-gray-200">{item.name}</p>
                                          <p className="text-red-400">In Stock: {item.currentStock} (Reorder at {item.reorderLevel})</p>
                                      </div>
                                      <NavLink to="/stock" className="text-blue-400 hover:text-blue-300 font-semibold">View</NavLink>
                                  </div>
                              )) : <p className="text-gray-400 text-sm">All stock levels are healthy.</p>}
                          </div>
                      </div>
                      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                          <h3 className="font-bold text-white mb-4 flex items-center"><AlertCircle size={20} className="mr-2 text-red-400"/> Jobs Requiring Attention</h3>
                          <div className="space-y-3">
                              {actionableItems.jobsWithIssues.length > 0 ? actionableItems.jobsWithIssues.map(job => (
                                  <div key={job.id} className="text-sm p-3 bg-gray-700/50 rounded-lg">
                                      <p className="font-semibold text-gray-200">{job.partName} <span className="text-xs text-gray-400">({job.jobId})</span></p>
                                      <p className="text-red-400">Reason: {job.issueReason || 'No reason given.'}</p>
                                  </div>
                              )) : <p className="text-gray-400 text-sm">No jobs have outstanding issues.</p>}
                          </div>
                      </div>
                  </div>
               </div>
        </MainLayout>
    );
};

export default DashboardPage;