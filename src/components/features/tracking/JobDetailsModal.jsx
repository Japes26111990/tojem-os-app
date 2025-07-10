// src/components/features/tracking/JobDetailsModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Dropdown from '../../ui/Dropdown';
import { X, CheckCircle2, DollarSign, Clock, Zap, Edit, Trash2, Save, XCircle, Award, RefreshCw, Lightbulb } from 'lucide-react';
import { processConsumables, calculateJobDuration } from '../../../utils/jobUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { giveKudosToJob, updateDocument, updateStandardRecipe, addKaizenSuggestion } from '../../../api/firestore';
import ConsumableEditor from '/src/components/features/recipes/ConsumableEditor.jsx';
import KaizenSuggestionModal from './KaizenSuggestionModal';
import toast from 'react-hot-toast';

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
  const [editableJobData, setEditableJobData] = useState({
    partName: job.partName, description: job.description || '', estimatedTime: job.estimatedTime || 0,
    employeeId: job.employeeId, employeeName: job.employeeName,
    steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
    selectedTools: new Set(job.tools?.map(t => t.id) || []),
    selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
    selectedConsumables: job.consumables || [],
  });

  const employeesInDepartment = useMemo(() => allEmployees.filter(emp => emp.departmentId === job.departmentId), [allEmployees, job.departmentId]);
  const processedConsumablesForDisplay = useMemo(() => processConsumables(job.consumables, allInventoryItems, 20), [job.consumables, allInventoryItems]);

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

  // Save cost once if job is completed and no totalCost yet
  useEffect(() => {
    if (job.status === 'Complete' && (job.totalCost === null || job.totalCost === undefined)) {
      const { materialCost, laborCost, machineCost, totalCost } = calculateLiveTotalCost(job, currentTime);
      updateDocument('jobs', job.id, {
        materialCost: Number(materialCost.toFixed(2)),
        laborCost: Number(laborCost.toFixed(2)),
        machineCost: Number(machineCost.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
      });
    }
  }, [job, currentTime]);

  useEffect(() => {
    setEditableJobData({
      partName: job.partName, description: job.description || '', estimatedTime: job.estimatedTime || 0,
      employeeId: job.employeeId, employeeName: job.employeeName,
      steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
      selectedTools: new Set(job.tools?.map(t => t.id) || []),
      selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
      selectedConsumables: job.consumables || [],
    });
    setIsEditing(false);
  }, [job]);

  const liveDuration = calculateJobDuration(job, currentTime)?.text || 'N/A';
  const efficiency = formatEfficiency(job, currentTime);
  const cost = calculateLiveTotalCost(job, currentTime).totalCost.toFixed(2);

  const canEdit = !['In Progress', 'Awaiting QC'].includes(job.status);
  const handleInputChange = (e) => setEditableJobData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleEmployeeChange = (e) => {
    const selected = allEmployees.find(emp => emp.id === e.target.value);
    setEditableJobData(prev => ({ ...prev, employeeId: e.target.value, employeeName: selected?.name || 'Unassigned' }));
  };

  const handleToolToggle = (toolId) => {
    setEditableJobData(prev => {
      const tools = new Set(prev.selectedTools);
      const acc = new Set(prev.selectedAccessories);
      if (tools.has(toolId)) {
        tools.delete(toolId);
        allToolAccessories.filter(a => a.toolId === toolId).forEach(a => acc.delete(a.id));
      } else tools.add(toolId);
      return { ...prev, selectedTools: tools, selectedAccessories: acc };
    });
  };

  const handleAccessoryToggle = (accId) => {
    setEditableJobData(prev => {
      const acc = new Set(prev.selectedAccessories);
      acc.has(accId) ? acc.delete(accId) : acc.add(accId);
      return { ...prev, selectedAccessories: acc };
    });
  };

  const getFormattedData = () => ({
    partName: editableJobData.partName.trim(),
    description: editableJobData.description.trim(),
    estimatedTime: Number(editableJobData.estimatedTime),
    employeeId: editableJobData.employeeId || 'unassigned',
    employeeName: editableJobData.employeeName,
    steps: editableJobData.steps.split('\n').filter(Boolean),
    tools: Array.from(editableJobData.selectedTools),
    accessories: Array.from(editableJobData.selectedAccessories),
    consumables: editableJobData.selectedConsumables,
  });

  const handleSave = async () => {
    if (!editableJobData.partName.trim()) return toast.error("Part name required.");
    if (editableJobData.estimatedTime < 0) return toast.error("Time can't be negative.");
    if (!editableJobData.steps.trim()) return toast.error("Steps required.");
    try {
      await onUpdateJob(job.id, getFormattedData());
      toast.success("Job updated.");
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    }
  };

  const handleDelete = async () => {
    toast(t => (
      <span>
        Delete job "{job.jobId}"?
        <Button onClick={async () => {
          try {
            await onDeleteJob(job.id);
            toast.success("Deleted.");
            onClose();
          } catch (err) {
            toast.error("Failed.");
          }
          toast.dismiss(t.id);
        }} className="ml-2" variant="danger" size="sm">Delete</Button>
        <Button onClick={() => toast.dismiss(t.id)} className="ml-2" size="sm">Cancel</Button>
      </span>
    ), { icon: "⚠️" });
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
        <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl w-full max-w-2xl border border-gray-700 overflow-y-auto max-h-[90vh]">
          <div className="p-4 border-b border-gray-700 flex justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">{isEditing ? `Editing: ${job.jobId}` : job.partName}{job.kudos && <Award className="text-yellow-400" />}</h2>
              <p className="text-xs text-gray-500">{job.jobId}</p>
            </div>
            <Button onClick={onClose} variant="secondary"><X size={20} /></Button>
          </div>
          <div className="p-6 space-y-6">
            {!isEditing ? (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <DetailRow label="Employee" value={job.employeeName} />
                  <DetailRow label="Status" value={job.status} />
                  <DetailRow label="Started On" value={formatDate(job.startedAt)} />
                  <DetailRow label="Completed On" value={formatDate(job.completedAt)} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded text-center">
                    <Clock className="text-blue-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Est. Time</p>
                    <p className="font-bold">{job.estimatedTime || 'N/A'} min</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded text-center">
                    <CheckCircle2 className="text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Actual Time</p>
                    <p className="font-bold">{liveDuration}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded text-center">
                    <Zap className="text-purple-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Efficiency</p>
                    <p className="font-bold">{efficiency}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded text-center">
                    <p className="text-xs text-gray-400">Material</p>
                    <p className="font-bold font-mono">R {job.materialCost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded text-center">
                    <p className="text-xs text-gray-400">Labor</p>
                    <p className="font-bold font-mono">R {job.laborCost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded text-center">
                    <DollarSign className="text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Total Cost</p>
                    <p className="font-bold font-mono">R {cost}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Input label="Part Name" name="partName" value={editableJobData.partName} onChange={handleInputChange} />
                <Dropdown label="Employee" name="employeeId" value={editableJobData.employeeId} onChange={handleEmployeeChange} options={employeesInDepartment} />
                <Input label="Est. Time (min)" name="estimatedTime" type="number" value={editableJobData.estimatedTime} onChange={handleInputChange} />
                <Textarea label="Description" name="description" value={editableJobData.description} onChange={handleInputChange} />
                <Textarea label="Steps (1 per line)" name="steps" value={editableJobData.steps} onChange={handleInputChange} />
                <div className="flex justify-end gap-3 mt-4">
                  <Button onClick={() => setIsEditing(false)} variant="secondary"><XCircle size={18} className="mr-2" /> Cancel</Button>
                  <Button onClick={handleSave} variant="primary"><Save size={18} className="mr-2" /> Save</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isKaizenModalOpen && (
        <KaizenSuggestionModal job={job} user={user} onClose={() => setIsKaizenModalOpen(false)} onSubmit={addKaizenSuggestion} />
      )}
    </>
  );
};

export default JobDetailsModal;
