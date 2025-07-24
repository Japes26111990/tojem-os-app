// src/pages/AndonDisplayPage.jsx (NEW FILE)
// This component serves as a large-format, real-time display for any job
// that has been halted on the workshop floor, acting as a digital "Andon Cord" system.

import React, { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../api/firebase';
import { AlertTriangle, Clock } from 'lucide-react';
import moment from 'moment';

const AndonDisplayPage = () => {
    const [haltedJobs, setHaltedJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const jobsRef = collection(db, 'createdJobCards');
        const q = query(jobsRef, where('status', '==', 'Halted - Issue'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const jobs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Find the most recent halt reason from the issue log if it exists
                    haltReason: (data.issueLog && data.issueLog.length > 0) 
                        ? data.issueLog[data.issueLog.length - 1].reason 
                        : (data.issueReason || 'No reason provided.'),
                    haltedAt: data.pausedAt // Assuming pausedAt is set when a job is halted
                };
            });
            setHaltedJobs(jobs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // This effect will make the background flash for high visibility
    useEffect(() => {
        if (haltedJobs.length > 0) {
            document.body.classList.add('bg-red-900', 'animate-pulse');
        } else {
            document.body.classList.remove('bg-red-900', 'animate-pulse');
        }
        // Cleanup function to remove class when component unmounts
        return () => document.body.classList.remove('bg-red-900', 'animate-pulse');
    }, [haltedJobs.length]);


    if (loading) {
        return <div className="text-white text-2xl text-center p-10">Initializing Andon Display...</div>;
    }

    if (haltedJobs.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-center p-10">
                <h1 className="text-6xl font-bold text-green-400">ALL SYSTEMS GO</h1>
                <p className="text-2xl text-gray-400 mt-4">No production halts detected.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <h1 className="text-5xl font-extrabold text-white text-center mb-8">PRODUCTION HALTED</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {haltedJobs.map(job => (
                    <div key={job.id} className="bg-gray-800 border-4 border-yellow-400 rounded-2xl shadow-2xl p-6 flex flex-col">
                        <div className="flex-grow">
                            <div className="flex items-center gap-4 mb-4">
                                <AlertTriangle size={48} className="text-yellow-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-400">{job.departmentName}</p>
                                    <h2 className="text-3xl font-bold text-white">{job.partName}</h2>
                                </div>
                            </div>
                            <div className="bg-gray-900 p-4 rounded-lg mb-4">
                                <p className="text-sm text-gray-400">Reason for Halt:</p>
                                <p className="text-xl text-yellow-300 font-semibold italic">"{job.haltReason}"</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-700 pt-4 text-sm text-gray-400 flex justify-between items-center">
                            <span>Operator: <span className="font-semibold text-white">{job.employeeName}</span></span>
                            <span className="flex items-center gap-2">
                                <Clock size={16} />
                                {job.haltedAt ? moment(job.haltedAt.toDate()).fromNow() : 'Just now'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AndonDisplayPage;
