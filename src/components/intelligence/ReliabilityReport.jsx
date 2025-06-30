// src/components/intelligence/ReliabilityReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../api/firebase';
import Button from '../ui/Button';
import { Clock, UserCheck } from 'lucide-react';

const KpiCard = ({ title, value, unit }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-white">
            {value} <span className="text-xl text-gray-400">{unit}</span>
        </p>
    </div>
);

const checkPunctuality = (date, startTime, endTime) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { isLate: false, leftEarly: false, minutesLate: 0 };
    }
    
    const standardStartTime = new Date(date.getTime());
    standardStartTime.setHours(7, 0, 0, 0);

    const standardEndTime = new Date(date.getTime());
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { 
        standardEndTime.setHours(17, 0, 0, 0);
    } else { 
        standardEndTime.setHours(15, 45, 0, 0);
    }

    const isLate = startTime > standardStartTime;
    const leftEarly = endTime < standardEndTime;

    let minutesLate = 0;
    if (isLate) {
        minutesLate = (startTime.getTime() - standardStartTime.getTime()) / (1000 * 60);
    }

    return { isLate, leftEarly, minutesLate: Math.max(0, minutesLate) };
};


const ReliabilityReport = ({ employeeId }) => {
    const [timeEntries, setTimeEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('month');

    useEffect(() => {
        const fetchScanEventData = async () => {
            if (!employeeId) return;
            setLoading(true);
            try {
                const scanEventsQuery = query(
                    collection(db, 'scanEvents'),
                    where('employeeId', '==', employeeId),
                    orderBy('timestamp', 'asc')
                );
                const snapshot = await getDocs(scanEventsQuery);
                const events = snapshot.docs.map(doc => ({ ...doc.data(), timestamp: doc.data().timestamp.toDate() }));

                const dailyScans = {};
                for (const event of events) {
                    const dateStr = event.timestamp.toISOString().split('T')[0];
                    if (!dailyScans[dateStr]) {
                        dailyScans[dateStr] = {
                            date: new Date(dateStr),
                            scans: []
                        };
                    }
                    dailyScans[dateStr].scans.push(event.timestamp);
                }

                const processedEntries = Object.values(dailyScans).map(dayData => {
                    if (dayData.scans.length === 0) return null;
                    const firstScan = dayData.scans[0];
                    const lastScan = dayData.scans[dayData.scans.length - 1];
                    const punctuality = checkPunctuality(dayData.date, firstScan, lastScan);
                    return {
                        date: dayData.date,
                        ...punctuality
                    };
                }).filter(Boolean);

                setTimeEntries(processedEntries);

            } catch (err) {
                console.error("Error fetching scan event data for reliability report:", err);
            }
            setLoading(false);
        };
        fetchScanEventData();
    }, [employeeId]);

    const filteredMetrics = useMemo(() => {
        const now = new Date();
        let startDate;

        if (filter === 'week') {
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
        } else if (filter === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const filtered = timeEntries.filter(entry => entry.date >= startDate);

        let daysLate = 0;
        let daysLeftEarly = 0;
        let totalMinutesLate = 0;

        filtered.forEach(entry => {
            if (entry.isLate) {
                daysLate++;
                totalMinutesLate += entry.minutesLate;
            }
            if (entry.leftEarly) {
                daysLeftEarly++;
            }
        });

        return { daysLate, daysLeftEarly, totalMinutesLate };
    }, [timeEntries, filter]);

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCheck size={20} className="text-teal-400" />
                    Reliability Report
                </h3>
                <div className="flex gap-1 bg-gray-700 p-1 rounded-lg">
                    <Button onClick={() => setFilter('week')} variant={filter === 'week' ? 'primary' : 'secondary'} className="py-1 px-3 text-xs">This Week</Button>
                    <Button onClick={() => setFilter('month')} variant={filter === 'month' ? 'primary' : 'secondary'} className="py-1 px-3 text-xs">This Month</Button>
                    <Button onClick={() => setFilter('year')} variant={filter === 'year' ? 'primary' : 'secondary'} className="py-1 px-3 text-xs">This Year</Button>
                </div>
            </div>
            {loading ? (
                <p className="text-gray-400">Loading reliability data...</p>
            ) : timeEntries.length === 0 ? (
                 <p className="text-gray-500 text-center py-4">No scan event data found for this employee.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard title="Days Late" value={filteredMetrics.daysLate} unit="days" />
                    <KpiCard title="Days Left Early" value={filteredMetrics.daysLeftEarly} unit="days" />
                    <KpiCard title="Total Minutes Late" value={Math.round(filteredMetrics.totalMinutesLate)} unit="mins" />
                </div>
            )}
        </div>
    );
};

export default ReliabilityReport;
