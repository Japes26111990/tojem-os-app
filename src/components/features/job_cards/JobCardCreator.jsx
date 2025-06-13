import React, { useState, useEffect, useMemo } from 'react';
import { getManufacturers, getMakes, getModels, getParts, getDepartments, getEmployees, addJobCard } from '../../../api/firestore';
import Dropdown from '../../ui/Dropdown';
import Button from '../../ui/Button';

// This is the Preview sub-component that shows the generated card
const JobCardPreview = ({ details }) => {
    if (!details) return null;
    return (
        <div className="mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Generated Job Card Preview</h2>
            <div id="job-card-print-area" className="bg-white text-gray-800 p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Job Card</h1>
                        <p className="text-gray-600">Part: <span className="font-semibold">{details.partName}</span></p>
                        <p className="text-gray-600">Department: <span className="font-semibold">{details.departmentName}</span></p>
                    </div>
                    <div className="text-right">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(details.jobId)}&size=80x80`} alt="QR Code"/>
                       <p className="text-xs text-gray-500 mt-1">{details.jobId}</p>
                    </div>
                </div>
                 <div className="mt-6">
                    <p><b>Employee:</b> {details.employeeName}</p>
                    <p className="mt-4"><i>Further details like steps, tools, and consumables will be defined in a later phase.</i></p>
                </div>
            </div>
        </div>
    )
};

const JobCardCreator = () => {
    const [allData, setAllData] = useState({ manufacturers: [], makes: [], models: [], parts: [], departments: [], employees: [] });
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState({ manufacturerId: '', makeId: '', modelId: '', partId: '', departmentId: '', employeeId: '' });
    const [jobDetails, setJobDetails] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [manufacturers, makes, models, parts, departments, employees] = await Promise.all([
                getManufacturers(), getMakes(), getModels(), getParts(), getDepartments(), getEmployees()
            ]);
            setAllData({ manufacturers, makes, models, parts, departments, employees });
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleSelection = (e) => {
        const { name, value } = e.target;
        setSelection(prev => {
            const updated = { ...prev, [name]: value };
            // Reset subsequent selections when a parent changes
            if (name === 'manufacturerId') { updated.makeId = ''; updated.modelId = ''; updated.partId = ''; }
            if (name === 'makeId') { updated.modelId = ''; updated.partId = ''; }
            if (name === 'modelId') { updated.partId = ''; }
            if (name === 'departmentId') { updated.employeeId = ''; }
            return updated;
        });
    };

    // Cascading filter logic
    const filteredMakes = useMemo(() => (allData.makes || []).filter(m => m.manufacturerId === selection.manufacturerId), [allData.makes, selection.manufacturerId]);
    const filteredModels = useMemo(() => (allData.models || []).filter(m => m.makeId === selection.makeId), [allData.models, selection.makeId]);
    const filteredParts = useMemo(() => (allData.parts || []).filter(p => p.modelId === selection.modelId), [allData.parts, selection.modelId]);
    const filteredEmployees = useMemo(() => (allData.employees || []).filter(e => e.departmentId === selection.departmentId), [allData.employees, selection.departmentId]);

    // Effect to generate job details for preview
    useEffect(() => {
        const { partId, departmentId, employeeId } = selection;
        if (partId && departmentId && employeeId) {
            const part = allData.parts.find(p => p.id === partId);
            const department = allData.departments.find(d => d.id === departmentId);
            const employee = allData.employees.find(e => e.id === employeeId);
            
            if (part && department && employee) {
              setJobDetails({
                  jobId: `JOB-${Date.now()}`,
                  partId: part.id,
                  partName: part.name,
                  departmentId: department.id,
                  departmentName: department.name,
                  employeeId: employee.id,
                  employeeName: employee.name,
                  status: 'Pending',
              });
            }
        } else {
            setJobDetails(null);
        }
    }, [selection, allData]);

    const handlePrintAndCreate = async () => {
        if (!jobDetails) return;
        try {
            await addJobCard(jobDetails);
            alert(`Job Card ${jobDetails.jobId} created successfully!`);
            // Basic print functionality
            const printContents = document.getElementById('job-card-print-area').innerHTML;
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow.document.write(`<html><head><title>Print Job Card</title><script src="https://cdn.tailwindcss.com/"></script></head><body><div class="p-8">${printContents}</div></body></html>`);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } catch (error) {
            console.error("Error creating job card:", error);
            alert("Failed to create job card.");
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading settings data...</p>;

    return (
        <>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Dropdown label="1. Manufacturer" name="manufacturerId" value={selection.manufacturerId} onChange={handleSelection} options={allData.manufacturers} placeholder="Select Manufacturer" />
                    <Dropdown label="2. Make" name="makeId" value={selection.makeId} onChange={handleSelection} options={filteredMakes} placeholder="Select Make" disabled={!selection.manufacturerId} />
                    <Dropdown label="3. Model" name="modelId" value={selection.modelId} onChange={handleSelection} options={filteredModels} placeholder="Select Model" disabled={!selection.makeId} />
                    <Dropdown label="4. Part" name="partId" value={selection.partId} onChange={handleSelection} options={filteredParts} placeholder="Select Part" disabled={!selection.modelId} />
                    <Dropdown label="5. Department" name="departmentId" value={selection.departmentId} onChange={handleSelection} options={allData.departments} placeholder="Select Department" />
                    <Dropdown label="6. Employee" name="employeeId" value={selection.employeeId} onChange={handleSelection} options={filteredEmployees} placeholder="Select Employee" disabled={!selection.departmentId} />
                </div>
                {jobDetails && (
                    <div className="mt-8 text-center">
                        <Button onClick={handlePrintAndCreate} variant="primary">Print & Create Job</Button>
                    </div>
                )}
            </div>
            {jobDetails && <JobCardPreview details={jobDetails} />}
        </>
    );
};

export default JobCardCreator;