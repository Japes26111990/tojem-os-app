import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { ChevronsLeft } from 'lucide-react';

// Import both widgets
import SkillProgressionWidget from '../components/intelligence/SkillProgressionWidget';
import JobCompletionAnalysisWidget from '../components/intelligence/JobCompletionAnalysisWidget'; // 1. IMPORT THE NEW WIDGET

const EmployeeIntelligencePage = () => {
    const { employeeId } = useParams(); // Gets the employee ID from the URL
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployeeData = async () => {
            setLoading(true);
            try {
                const employeeDocRef = doc(db, 'employees', employeeId);
                const employeeDoc = await getDoc(employeeDocRef);

                if (employeeDoc.exists()) {
                    setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
                } else {
                    console.error("No such employee found!");
                }
            } catch (error) {
                console.error("Error fetching employee data:", error);
            }
            setLoading(false);
        };

        fetchEmployeeData();
    }, [employeeId]);

    if (loading) {
        return <MainLayout><p className="text-white text-center">Loading Employee Data...</p></MainLayout>;
    }

    if (!employee) {
        return <MainLayout><p className="text-red-500 text-center">Employee not found.</p></MainLayout>;
    }

    return (
        <MainLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <Link to="/performance" className="flex items-center text-blue-400 hover:text-blue-300 mb-4">
                        <ChevronsLeft size={20} className="mr-1" />
                        Back to Business Performance Dashboard
                    </Link>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h2 className="text-3xl font-bold text-white">{employee.name}</h2>
                        <p className="text-gray-400">Intelligence Hub</p>
                    </div>
                </div>
                
                {/* Grid for Widgets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main column */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        <SkillProgressionWidget employeeId={employeeId} />

                        {/* 2. REPLACE THE PLACEHOLDER with the actual widget component */}
                        <JobCompletionAnalysisWidget employeeId={employeeId} />

                    </div>
                    
                    {/* Sidebar column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 min-h-[200px]">
                           <h3 className="text-xl font-bold text-white mb-4">Real-Time Value Engine</h3>
                           <p className="text-gray-400">Placeholder for profitability ratio...</p>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default EmployeeIntelligencePage;