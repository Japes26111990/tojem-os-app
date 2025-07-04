import React, { useState, useEffect } from 'react';
import { listenToJobCards } from '../api/firestore';
import Button from '../components/ui/Button';

const JobReprintPage = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = listenToJobCards(setJobs);
    return () => unsub();
  }, []);

  const filtered = jobs.filter(j =>
    j.jobId.toLowerCase().includes(search.toLowerCase()) ||
    j.partName?.toLowerCase().includes(search.toLowerCase())
  );

  const printJobCard = (job) => {
    const win = window.open('', '', 'width=600,height=800');
    const html = `
      <html>
        <head>
          <title>${job.jobId}</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h2>Job Card: ${job.jobId}</h2>
          <p><strong>Part:</strong> ${job.partName}</p>
          <p><strong>Department:</strong> ${job.departmentName}</p>
          <p><strong>Employee:</strong> ${job.employeeName}</p>
          <p><strong>Quantity:</strong> ${job.quantity}</p>
          <p><strong>Status:</strong> ${job.status}</p>
          <p><strong>Steps:</strong></p>
          <ul>${(job.steps || []).map(step => `<li>${step}</li>`).join('')}</ul>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Reprint Job Cards</h1>
      <input
        className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600 mb-4"
        placeholder="Search by part name or job ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="space-y-2">
        {filtered.map(job => (
          <div key={job.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <p className="text-white font-bold">{job.partName} ({job.jobId})</p>
            <p className="text-gray-400 text-sm">Dept: {job.departmentName} | Qty: {job.quantity}</p>
            <Button onClick={() => printJobCard(job)} className="mt-2">Print</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobReprintPage;
