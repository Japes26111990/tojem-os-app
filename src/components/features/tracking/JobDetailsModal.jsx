// src/components/features/tracking/JobDetailsModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Dropdown from '../../ui/Dropdown';
import { X, CheckCircle2, DollarSign, Clock, Zap, Edit, Trash2, Save, XCircle, Award, Lightbulb, Printer } from 'lucide-react';
import { processConsumables, calculateJobDuration } from '../../../utils/jobUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { giveKudosToJob, updateDocument, addKaizenSuggestion, deleteDocument } from '../../../api/firestore';
import KaizenSuggestionModal from './KaizenSuggestionModal';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import PraiseModal from '../../intelligence/PraiseModal';

// --- FIX: Replaced the broken Base64 string with a valid placeholder. ---
// You can generate a new Base64 string for your actual logo and replace this one.
const tojemLogoBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAyMDAgNTAiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIGZpbGw9IiMyNTYzZWIiLz48dGV4dCB4PSIxMDAiIHk9IjMwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5UT0pFTTwvdGV4dD48L3N2Zz4=";

const DetailRow = ({ label, value, className = 'text-gray-300' }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
    <p className="text-sm text-gray-400">{label}</p>
    <p className={`text-sm font-semibold ${className}`}>{value}</p>
  </div>
);

const JobDetailsModal = ({
  job, onClose, currentTime, employeeHourlyRates, overheadCostPerHour,
  allEmployees, onUpdateJob, onDeleteJob, allInventoryItems, allTools, allToolAccessories
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isKaizenModalOpen, setIsKaizenModalOpen] = useState(false);
  const [isPraiseModalOpen, setIsPraiseModalOpen] = useState(false);
  const [editableJobData, setEditableJobData] = useState({});

  useEffect(() => {
    setEditableJobData({
      partName: job.partName,
      description: job.description || '',
      estimatedTime: job.estimatedTime || 0,
      employeeId: job.employeeId,
      steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
      selectedTools: new Set(job.tools?.map(t => t.id) || []),
      selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
      selectedConsumables: job.consumables || [],
      vinNumber: job.vinNumber || '',
    });
    setIsEditing(false);
  }, [job]);

  const employeesInDepartment = useMemo(() => allEmployees.filter(emp => emp.departmentId === job.departmentId), [allEmployees, job.departmentId]);

  const formatDate = (timestamp) => !timestamp ? 'N/A' : new Date(timestamp.seconds * 1000).toLocaleString();
  const formatEfficiency = (j, cTime) => {
    if (!j.estimatedTime) return 'N/A';
    const dur = calculateJobDuration(j, cTime);
    if (!dur || dur.totalMinutes === 0) return 'N/A';
    return `${Math.round((j.estimatedTime / dur.totalMinutes) * 100)}%`;
  };

  const calculateLiveTotalCost = (j, cTime) => {
    const materialCost = (j.processedConsumables || []).reduce((sum, c) => sum + ((c.price || 0) * (c.quantity || 0)), 0);
    let laborCost = 0;
    if (j.employeeId && employeeHourlyRates[j.employeeId] !== undefined) {
      const dur = calculateJobDuration(j, cTime);
      if (dur) laborCost = (dur.totalMinutes / 60) * (employeeHourlyRates[j.employeeId] + overheadCostPerHour);
    }
    const machineCost = (j.tools || []).reduce((sum, tool) => {
      const toolDetails = allTools.find(t => t.id === tool.id);
      if (!toolDetails || !toolDetails.hourlyRate) return sum;
      const dur = calculateJobDuration(j, cTime);
      return sum + ((dur?.totalMinutes || 0) / 60) * toolDetails.hourlyRate;
    }, 0);
    return { materialCost, laborCost, machineCost, totalCost: materialCost + laborCost + machineCost };
  };

  const liveDuration = calculateJobDuration(job, currentTime)?.text || 'N/A';
  const efficiency = formatEfficiency(job, currentTime);
  const cost = calculateLiveTotalCost(job, currentTime).totalCost.toFixed(2);

  const handleInputChange = (e) => setEditableJobData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleEmployeeChange = (e) => {
    const selected = allEmployees.find(emp => emp.id === e.target.value);
    setEditableJobData(prev => ({ ...prev, employeeId: e.target.value, employeeName: selected?.name || 'Unassigned' }));
  };

  const handleSave = async () => {
    if (!editableJobData.partName.trim()) return toast.error("Part name required.");
    
    const updatedData = {
        partName: editableJobData.partName,
        description: editableJobData.description,
        estimatedTime: Number(editableJobData.estimatedTime),
        employeeId: editableJobData.employeeId,
        employeeName: allEmployees.find(e => e.id === editableJobData.employeeId)?.name || 'Unassigned',
        steps: editableJobData.steps.split('\n').filter(Boolean),
        tools: Array.from(editableJobData.selectedTools).map(id => allTools.find(t => t.id === id)).filter(Boolean),
        accessories: Array.from(editableJobData.selectedAccessories).map(id => allToolAccessories.find(a => a.id === id)).filter(Boolean),
        consumables: editableJobData.selectedConsumables,
        vinNumber: editableJobData.vinNumber,
    };

    try {
      await onUpdateJob(job.id, updatedData);
      toast.success("Job updated successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    }
  };

  const handleDelete = () => {
    toast((t) => (
      <span>
        Delete job "{job.jobId}"?
        <Button onClick={async () => {
          try {
            await onDeleteJob(job.id);
            toast.success("Job deleted.");
            onClose();
          } catch (err) {
            toast.error("Failed to delete job.");
          }
          toast.dismiss(t.id);
        }} className="ml-2" variant="danger" size="sm">Delete</Button>
        <Button onClick={() => toast.dismiss(t.id)} className="ml-2" size="sm">Cancel</Button>
      </span>
    ), { icon: "⚠️" });
  };

  const handleReprint = async () => {
    const qrCodeDataUrl = await QRCode.toDataURL(job.jobId, { width: 80 });
    const imageSection = job.photoUrl
        ? `<img src="${job.photoUrl}" alt="${job.partName}" style="width: 100%; height: 150px; border-radius: 8px; object-fit: cover; margin-bottom: 15px; border: 1px solid #ddd;" />`
        : `<div style="border-radius: 8px; width: 100%; height: 150px; margin-bottom: 15px; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; color: #aaa; border: 1px solid #ddd;"><span>No Image</span></div>`;

    const printContents = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <div>
                    <img src="${tojemLogoBase64}" alt="Company Logo" style="height: 50px; margin-bottom: 10px;"/>
                    <h1 style="font-size: 28px; font-weight: bold; margin: 0;">Job Card</h1>
                    <p style="font-size: 14px; color: #666; margin: 0;">Part: <span style="font-weight: 600;">${job.partName} (x${job.quantity})</span></p>
                    <p style="font-size: 14px; color: #666; margin: 0;">Department: <span style="font-weight: 600;">${job.departmentName}</span></p>
                    ${job.vinNumber ? `<p style="font-size: 14px; color: #666; margin: 0;">VIN: <span style="font-weight: 600;">${job.vinNumber}</span></p>` : ''}
                </div>
                <div style="text-align: right;">
                    <img src="${qrCodeDataUrl}" alt="QR Code" style="margin-bottom: 5px;"/>
                    <p style="font-size: 10px; color: #999; margin: 0;">${job.jobId}</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div>
                    ${imageSection}
                    <div style="font-size: 13px; line-height: 1.6;">
                        <p style="margin: 0;"><b>Employee:</b> ${job.employeeName}</p>
                        <p style="margin: 0;"><b>Est. Time:</b> ${job.estimatedTime || 'N/A'} mins</p>
                        <p style="margin: 0;"><b>Description:</b> ${job.description || 'No description.'}</p>
                    </div>
                </div>
                <div style="font-size: 13px; line-height: 1.6;">
                    <div>
                        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Tools & Accessories</h3>
                        <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                            ${job.tools?.length > 0 ? job.tools.map(tool => `<li>${tool.name}</li>`).join('') : '<li>No tools specified.</li>'}
                            ${job.accessories?.length > 0 ? job.accessories.map(acc => `<li style="margin-left: 15px;">${acc.name}</li>`).join('') : ''}
                        </ul>
                    </div>
                    <div style="margin-top: 20px;">
                        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Required Consumables</h3>
                        <ul style="list-style: disc; padding-left: 20px; margin: 0;">
                            ${job.processedConsumables?.length > 0 ? job.processedConsumables.map(c => `<li><span style="font-weight: 600;">${c.name}</span>: ${c.quantity.toFixed(2)} ${c.unit}</li>`).join('') : '<li>No consumables required.</li>'}
                        </ul>
                    </div>
                </div>
            </div>
             <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">Steps</h3>
                <ol style="list-style: decimal; padding-left: 20px; margin: 0;">
                    ${job.steps?.length > 0 ? job.steps.map(step => `<li>${step}</li>`).join('') : '<li>No steps defined.</li>'}
                </ol>
            </div>
        </div>
    `;
    const printWindow = window.open('', '_blank', 'height=800,width=1000');
    if (printWindow) {
        printWindow.document.write(`<html><head><title>Job Card ${job.jobId}</title></head><body>${printContents}</body></html>`);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.addEventListener('afterprint', () => printWindow.close());
        }, 500);
    } else {
        toast("The print window was blocked. Please allow popups.", { icon: 'ℹ️' });
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
        <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 overflow-y-auto max-h-[90vh]">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">{isEditing ? `Editing: ${job.jobId}` : job.partName}{job.kudos && <Award className="text-yellow-400" />}</h2>
              <p className="text-xs text-gray-500">{job.jobId}</p>
            </div>
            <div className="flex items-center gap-2">
                {!isEditing && <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm"><Edit size={14}/> Edit</Button>}
                <Button onClick={onClose} variant="secondary"><X size={20} /></Button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {!isEditing ? (
              <>
                {/* View Mode */}
                <div className="grid sm:grid-cols-2 gap-2">
                  <DetailRow label="Employee" value={job.employeeName} />
                  <DetailRow label="Status" value={job.status} />
                  <DetailRow label="Started On" value={formatDate(job.startedAt)} />
                  <DetailRow label="Completed On" value={formatDate(job.completedAt)} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded text-center"><Clock className="text-blue-400 mx-auto mb-2" /><p className="text-xs text-gray-400">Est. Time</p><p className="font-bold">{job.estimatedTime || 'N/A'} min</p></div>
                  <div className="bg-gray-900/50 p-4 rounded text-center"><CheckCircle2 className="text-green-400 mx-auto mb-2" /><p className="text-xs text-gray-400">Actual Time</p><p className="font-bold">{liveDuration}</p></div>
                  <div className="bg-gray-900/50 p-4 rounded text-center"><Zap className="text-purple-400 mx-auto mb-2" /><p className="text-xs text-gray-400">Efficiency</p><p className="font-bold">{efficiency}</p></div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded text-center"><p className="text-xs text-gray-400">Material</p><p className="font-bold font-mono">R {job.materialCost?.toFixed(2) || '0.00'}</p></div>
                  <div className="bg-gray-900/50 p-4 rounded text-center"><p className="text-xs text-gray-400">Labor</p><p className="font-bold font-mono">R {job.laborCost?.toFixed(2) || '0.00'}</p></div>
                  <div className="bg-gray-900/50 p-4 rounded text-center"><DollarSign className="text-yellow-400 mx-auto mb-2" /><p className="text-xs text-gray-400">Total Cost</p><p className="font-bold font-mono">R {cost}</p></div>
                </div>
              </>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                <Input label="Part Name" name="partName" value={editableJobData.partName} onChange={handleInputChange} />
                <Dropdown label="Employee" name="employeeId" value={editableJobData.employeeId} onChange={handleEmployeeChange} options={employeesInDepartment} />
                <Input label="Est. Time (min)" name="estimatedTime" type="number" value={editableJobData.estimatedTime} onChange={handleInputChange} />
                {job.vinNumber && <Input label="VIN Number" name="vinNumber" value={editableJobData.vinNumber} onChange={handleInputChange} />}
                <Textarea label="Description" name="description" value={editableJobData.description} onChange={handleInputChange} />
                <Textarea label="Steps (1 per line)" name="steps" value={editableJobData.steps} onChange={handleInputChange} />
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-900/50 flex justify-between items-center">
            <div>
                <Button onClick={() => setIsKaizenModalOpen(true)} variant="secondary" size="sm"><Lightbulb size={14} className="mr-2"/>Suggest Improvement</Button>
            </div>
            <div className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button onClick={() => setIsEditing(false)} variant="secondary"><XCircle size={18} className="mr-2" /> Cancel</Button>
                        <Button onClick={handleSave} variant="primary"><Save size={18} className="mr-2" /> Save Changes</Button>
                    </>
                ) : (
                    <>
                        <Button onClick={handleReprint} variant="secondary" size="sm"><Printer size={14} className="mr-2"/>Reprint</Button>
                        <Button onClick={() => setIsPraiseModalOpen(true)} variant="secondary" size="sm"><Award size={14} className="mr-2"/>Give Praise</Button>
                        <Button onClick={handleDelete} variant="danger" size="sm"><Trash2 size={14} className="mr-2"/>Delete Job</Button>
                    </>
                )}
            </div>
          </div>
        </div>
      </div>
      {isKaizenModalOpen && (
        <KaizenSuggestionModal job={job} user={user} onClose={() => setIsKaizenModalOpen(false)} onSubmit={addKaizenSuggestion} />
      )}
      {isPraiseModalOpen && (
          <PraiseModal
            allEmployees={allEmployees}
            currentUser={user}
            onSubmit={() => {
                giveKudosToJob(job.id);
                toast.success("Praise sent!");
                setIsPraiseModalOpen(false);
            }}
            onClose={() => setIsPraiseModalOpen(false)}
          />
      )}
    </>
  );
};

export default JobDetailsModal;
