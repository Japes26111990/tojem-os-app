// src/components/features/payroll/SubcontractorLedger.jsx (Upgraded with Toasts)

import React, { useState, useEffect, useMemo } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { getEmployees, getProducts, listenToJobCards, addSubcontractorAdHocLog, addSubcontractorTeamLog } from '../../../api/firestore';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import { DollarSign, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const SubcontractorLedger = () => {
    const [subcontractors, setSubcontractors] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [allJobs, setAllJobs] = useState([]);
    const [selectedSubcontractorId, setSelectedSubcontractorId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState(null);

    const [adHocLog, setAdHocLog] = useState({ date: '', description: '', hours: '', rate: '' });
    const [teamLog, setTeamLog] = useState({ date: '', name: '', hours: '', rate: '' });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allEmps, allProds] = await Promise.all([getEmployees(), getProducts()]);
                setSubcontractors(allEmps.filter(e => e.employeeType === 'subcontractor'));
                setAllProducts(allProds);
                const unsubscribe = listenToJobCards(setAllJobs);
                return unsubscribe;
            } catch (err) {
                console.error("Error fetching data for ledger:", err);
            } finally {
                setLoading(false);
            }
        };
        const unsubscribePromise = fetchData();
        return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }, []);

    const selectedSubcontractor = useMemo(() => {
        return subcontractors.find(s => s.id === selectedSubcontractorId);
    }, [selectedSubcontractorId, subcontractors]);

    useEffect(() => {
        if (selectedSubcontractor?.paymentModel === 'per_hour') {
            setAdHocLog(prev => ({ ...prev, rate: selectedSubcontractor.rate }));
        } else {
            setAdHocLog(prev => ({ ...prev, rate: '' }));
        }
    }, [selectedSubcontractor]);

    const handleGenerateLedger = async () => {
        if (!selectedSubcontractor || !startDate || !endDate) return;
        setGenerating(true);
        setResults(null);

        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);

        const completedJobs = allJobs.filter(job =>
            job.employeeId === selectedSubcontractor.id &&
            job.status === 'Complete' &&
            job.completedAt?.toDate() >= startDateTime &&
            job.completedAt?.toDate() <= endDateTime
        );

        let pieceWorkPay = 0;
        const pieceWorkJobs = completedJobs.map(job => {
            const product = allProducts.find(p => p.id === job.partId);
            let lineTotal = 0;
            if (selectedSubcontractor.paymentModel === 'per_kg' && product?.weight > 0) {
                lineTotal = product.weight * selectedSubcontractor.rate;
            } else if (selectedSubcontractor.paymentModel === 'per_product') {
                lineTotal = selectedSubcontractor.rate;
            }
            pieceWorkPay += lineTotal;
            return { ...job, product, lineTotal };
        }).filter(j => j.lineTotal > 0);

        const adHocQuery = query(collection(db, 'subcontractorAdHocLogs'), where('subcontractorId', '==', selectedSubcontractorId), where('date', '>=', startDate), where('date', '<=', endDate));
        const adHocSnapshot = await getDocs(adHocQuery);
        const adHocLogs = adHocSnapshot.docs.map(d => d.data());
        const adHocPay = adHocLogs.reduce((sum, log) => sum + (Number(log.hours) * Number(log.rate)), 0);

        const teamLogQuery = query(collection(db, 'subcontractorTeamLogs'), where('subcontractorId', '==', selectedSubcontractorId), where('date', '>=', startDate), where('date', '<=', endDate));
        const teamLogSnapshot = await getDocs(teamLogQuery);
        const teamLogs = teamLogSnapshot.docs.map(d => d.data());
        const teamPay = teamLogs.reduce((sum, log) => sum + (Number(log.hours) * Number(log.rate)), 0);

        setResults({ pieceWorkJobs, pieceWorkPay, adHocLogs, adHocPay, teamLogs, teamPay, grandTotal: pieceWorkPay + adHocPay + teamPay });
        setGenerating(false);
    };

    const handleAddAdHocLog = async () => {
        if (!adHocLog.date || !adHocLog.description || !adHocLog.hours || !adHocLog.rate) {
            return toast.error("Please fill all fields for the ad-hoc log, including the rate."); // --- REPLACE ALERT ---
        }
        await addSubcontractorAdHocLog({ ...adHocLog, subcontractorId: selectedSubcontractorId, subcontractorName: selectedSubcontractor.name });
        toast.success("Ad-hoc log added."); // Add success feedback
        setAdHocLog({ date: '', description: '', hours: '', rate: selectedSubcontractor?.paymentModel === 'per_hour' ? selectedSubcontractor.rate : '' });
        handleGenerateLedger(); // Refresh the ledger
    };

    const handleAddTeamLog = async () => {
        if (!teamLog.date || !teamLog.name || !teamLog.hours || !teamLog.rate) {
            return toast.error("Please fill all fields for the team member log."); // --- REPLACE ALERT ---
        }
        await addSubcontractorTeamLog({ ...teamLog, subcontractorId: selectedSubcontractorId, subcontractorName: selectedSubcontractor.name });
        toast.success("Team log added."); // Add success feedback
        setTeamLog({ date: '', name: '', hours: '', rate: '' });
        handleGenerateLedger(); // Refresh the ledger
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Generate Subcontractor Payment Ledger</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                    <Dropdown label="Select Subcontractor" value={selectedSubcontractorId} onChange={e => setSelectedSubcontractorId(e.target.value)} options={subcontractors} placeholder="Choose subcontractor..."/>
                    <Input label="Period Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input label="Period End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <Button onClick={handleGenerateLedger} disabled={generating || !selectedSubcontractorId}>
                        {generating ? 'Generating...' : 'Generate Ledger'}
                    </Button>
                </div>
            </div>

            {results && selectedSubcontractor && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-green-900/50 border border-green-500/50 p-6 rounded-xl text-center">
                        <p className="text-sm font-medium text-green-300">Total Payment Due to {selectedSubcontractor.name}</p>
                        <p className="text-5xl font-bold text-white font-mono">R {results.grandTotal.toFixed(2)}</p>
                    </div>
                    
                    {selectedSubcontractor.paymentModel !== 'per_hour' && (
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h4 className="font-bold text-white mb-2">Piece-Work Ledger ({selectedSubcontractor.paymentModel})</h4>
                            <table className="w-full text-left text-sm">
                                <thead><tr className="border-b border-gray-600"><th className="p-2">Completed Job</th><th className="p-2 text-right">Weight/Unit</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Line Total</th></tr></thead>
                                <tbody>{results.pieceWorkJobs.map(job => (<tr key={job.id}><td className="p-2">{job.partName}</td><td className="p-2 text-right">{job.product?.weight || 1} {selectedSubcontractor.paymentModel === 'per_kg' ? 'kg' : 'unit'}</td><td className="p-2 text-right">R{selectedSubcontractor.rate.toFixed(2)}</td><td className="p-2 text-right font-bold">R{job.lineTotal.toFixed(2)}</td></tr>))}</tbody>
                                <tfoot><tr className="border-t-2 border-gray-600"><td colSpan="3" className="p-2 font-bold text-right">Piece-Work Subtotal</td><td className="p-2 text-right font-bold text-lg text-green-400">R{results.pieceWorkPay.toFixed(2)}</td></tr></tfoot>
                            </table>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                            <h4 className="font-bold text-white">Ad-Hoc Hourly Work ({selectedSubcontractor.name})</h4>
                            <div className="grid grid-cols-4 gap-2 items-end">
                                <Input label="Date" type="date" value={adHocLog.date} onChange={e => setAdHocLog({...adHocLog, date: e.target.value})} />
                                <Input label="Description" value={adHocLog.description} onChange={e => setAdHocLog({...adHocLog, description: e.target.value})} />
                                <Input label="Hours" type="number" value={adHocLog.hours} onChange={e => setAdHocLog({...adHocLog, hours: e.target.value})} />
                                <Input label="Rate" type="number" value={adHocLog.rate} placeholder="R/hr" onChange={e => setAdHocLog({...adHocLog, rate: e.target.value})} />
                            </div>
                            <Button onClick={handleAddAdHocLog} className="w-full"><PlusCircle size={16} className="mr-2"/>Log Ad-Hoc Hours</Button>
                            <table className="w-full text-left text-sm">
                                <thead><tr className="border-b border-gray-600"><th className="p-1">Date</th><th className="p-1">Description</th><th className="p-1 text-right">Hours</th><th className="p-1 text-right">Pay</th></tr></thead>
                                <tbody>{results.adHocLogs.map((log, i) => (<tr key={i}><td className="p-1">{log.date}</td><td className="p-1">{log.description}</td><td className="p-1 text-right">{log.hours}</td><td className="p-1 text-right">R{(log.hours * log.rate).toFixed(2)}</td></tr>))}</tbody>
                                <tfoot><tr className="border-t-2 border-gray-600"><td colSpan="3" className="p-1 font-bold text-right">Ad-Hoc Subtotal</td><td className="p-1 text-right font-bold text-lg text-green-400">R{results.adHocPay.toFixed(2)}</td></tr></tfoot>
                            </table>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                            <h4 className="font-bold text-white">Team Hours</h4>
                            <div className="grid grid-cols-4 gap-2 items-end">
                                <Input label="Date" type="date" value={teamLog.date} onChange={e => setTeamLog({...teamLog, date: e.target.value})} />
                                <Input label="Name" value={teamLog.name} onChange={e => setTeamLog({...teamLog, name: e.target.value})} />
                                <Input label="Hours" type="number" value={teamLog.hours} onChange={e => setTeamLog({...teamLog, hours: e.target.value})} />
                                <Input label="Rate" type="number" value={teamLog.rate} onChange={e => setTeamLog({...teamLog, rate: e.target.value})} />
                            </div>
                            <Button onClick={handleAddTeamLog} className="w-full"><PlusCircle size={16} className="mr-2"/>Log Team Hours</Button>
                            <table className="w-full text-left text-sm">
                                <thead><tr className="border-b border-gray-600"><th className="p-1">Date</th><th className="p-1">Name</th><th className="p-1 text-right">Hours</th><th className="p-1 text-right">Pay</th></tr></thead>
                                <tbody>{results.teamLogs.map((log, i) => (<tr key={i}><td className="p-1">{log.date}</td><td className="p-1">{log.name}</td><td className="p-1 text-right">{log.hours}</td><td className="p-1 text-right">R{(log.hours * log.rate).toFixed(2)}</td></tr>))}</tbody>
                                <tfoot><tr className="border-t-2 border-gray-600"><td colSpan="3" className="p-1 font-bold text-right">Team Subtotal</td><td className="p-1 text-right font-bold text-lg text-green-400">R{results.teamPay.toFixed(2)}</td></tr></tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubcontractorLedger;