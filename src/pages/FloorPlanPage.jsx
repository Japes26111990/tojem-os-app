// src/pages/FloorPlanPage.jsx (NEW FILE)

import React, { useState, useEffect } from 'react';
import { listenToJobCards, getDepartments } from '../api/firestore';
import FloorPlan from '../components/features/floorplan/FloorPlan';
import { Map } from 'lucide-react';

const FloorPlanPage = () => {
    const [jobs, setJobs] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchedDepartments = await getDepartments();
                setDepartments(fetchedDepartments);

                const unsubscribeJobs = listenToJobCards((allJobs) => {
                    setJobs(allJobs);
                    setLoading(false);
                });

                return unsubscribeJobs;
            } catch (error) {
                console.error("Error fetching data for Floor Plan:", error);
                setLoading(false);
            }
        };

        const unsubscribePromise = fetchData();
        return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }, []);

    if (loading) {
        return <p className="text-center text-gray-400">Loading Digital Twin of Factory Floor...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Map size={32} className="text-green-400" />
                <div>
                    <h2 className="text-3xl font-bold text-white">Live Factory Floor Plan</h2>
                    <p className="text-gray-400">A real-time digital twin of all jobs currently in progress.</p>
                </div>
            </div>
            <FloorPlan jobs={jobs} departments={departments} />
        </div>
    );
};

export default FloorPlanPage;
