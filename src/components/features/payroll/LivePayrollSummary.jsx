// src/components/features/payroll/LivePayrollSummary.jsx (FIXED)

import React, { useState, useEffect } from 'react';
// --- CORRECTED IMPORTS ---
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getEmployees } from '../../../api/firestore';
import { db } from '../../../api/firebase';
// -------------------------
import { DollarSign, Clock } from 'lucide-react';

const KpiCard = ({ icon, title, value }) => (
    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const calculateWorkdayHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const breakMinutes = 45;
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const workMinutes = Math.max(0, durationMinutes - breakMinutes);
    return workMinutes / 60;
};

const LivePayrollSummary = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalHours: 0, accruedWages: 0 });

    useEffect(() => {
        const calculateSummary = async () => {
            setLoading(true);
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const [employees, scanEventsSnapshot] = await Promise.all([
                getEmployees(),
                getDocs(query(collection(db, 'scanEvents'), where('timestamp', '>=', startOfMonth)))
            ]);

            const permanentStaff = employees.filter(e => e.employeeType === 'permanent');
            const staffRates = new Map(permanentStaff.map(s => [s.id, s.hourlyRate || 0]));
            const scanEvents = scanEventsSnapshot.docs.map(d => ({ ...d.data(), timestamp: d.data().timestamp.toDate() }));

            const dailyScans = {};
            for (const event of scanEvents) {
                if (!event.employeeId || !staffRates.has(event.employeeId)) continue;
                const dateStr = event.timestamp.toISOString().split('T')[0];
                const key = `${event.employeeId}_${dateStr}`;
                if (!dailyScans[key]) {
                    dailyScans[key] = { employeeId: event.employeeId, scans: [] };
                }
                dailyScans[key].scans.push(event.timestamp);
            }

            let totalHours = 0;
            let accruedWages = 0;

            Object.values(dailyScans).forEach(dayData => {
                const firstScan = dayData.scans[0];
                const lastScan = dayData.scans[dayData.scans.length - 1];
                const hours = calculateWorkdayHours(firstScan, lastScan);
                const rate = staffRates.get(dayData.employeeId);
                
                totalHours += hours;
                accruedWages += hours * rate;
            });

            setStats({ totalHours, accruedWages });
            setLoading(false);
        };

        calculateSummary();
    }, []);

    if (loading) {
        return <p className="text-sm text-center text-gray-400">Calculating live payroll summary...</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KpiCard 
                icon={<Clock size={24} />} 
                title="Total Hours Logged (This Month)" 
                value={stats.totalHours.toFixed(1)} 
            />
            <KpiCard 
                icon={<DollarSign size={24} />} 
                title="Accrued Staff Wages (This Month)" 
                value={`R ${stats.accruedWages.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} 
            />
        </div>
    );
};

export default LivePayrollSummary;