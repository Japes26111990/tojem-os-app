// src/components/features/tracking/JobDetailsModal.jsx (Refactored & Path Corrected)

import React, { useState, useEffect, useMemo } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Dropdown from '../../ui/Dropdown';
import { X, CheckCircle2, DollarSign, Clock, Zap, Edit, Trash2, Save, XCircle, Award } from 'lucide-react';
import { processConsumables, calculateJobDuration } from '../../../utils/jobUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { giveKudosToJob } from '../../../api/firestore';
// --- CORRECTED IMPORT PATH ---
import ConsumableEditor from '/src/components/features/recipes/ConsumableEditor.jsx';

const DetailRow = ({ label, value, className = 'text-gray-300' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-sm font-semibold ${className}`}>{value}</p>
    </div>
);

const JobDetailsModal = ({ job, onClose, currentTime, employeeHourlyRates, allEmployees, onUpdateJob, onDeleteJob, allInventoryItems, allTools, allToolAccessories }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editableJobData, setEditableJobData] = useState(() => ({
        partName: job.partName, description: job.description || '', estimatedTime: job.estimatedTime || 0,
        employeeId: job.employeeId, employeeName: job.employeeName,
        steps: Array.isArray(job.steps) ? job.steps.join('\n') : '',
        selectedTools: new Set(job.tools?.map(t => t.id) || []),
        selectedAccessories: new Set(job.accessories?.map(a => a.id) || []),
        selectedConsumables: job.consumables || [],
    }));

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

    const processedConsumablesForDisplay = useMemo(() => {
        return processConsumables(job.consumables, allInventoryItems, 20);
    }, [job.consumables, allInventoryItems]);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    const formatEfficiency = (j, cTime) => {
        if (!j.estimatedTime) return 'N/A';
        const durationResult = calculateJobDuration(j, cTime);
        if (!durationResult || durationResult.totalMinutes === 0) return 'N/A';
        const estimatedMinutes = j.estimatedTime;
        const actualMinutes = durationResult.totalMinutes;
        return `${Math.round((estimatedMinutes / actualMinutes) * 100)}%`;
    };

    const calculateLiveTotalCost = (j, cTime, rates) => {
        if (typeof j.totalCost === 'number' && j.totalCost !== null) return `R${j.totalCost.toFixed(2)}`;
        if (!j.employeeId || !rates[j.employeeId]) return 'N/A';
        const hourlyRate = rates[j.employeeId];
        const durationResult = calculateJobDuration(j, cTime);
        let liveLaborCost = 0;
        if (durationResult) { liveLaborCost = (durationResult.totalMinutes / 60) * hourlyRate; }
        const currentMaterialCost = j.materialCost || 0;
        const totalLiveCost = liveLaborCost + currentMaterialCost;
        return `R${totalLiveCost.toFixed(2)}`;
    };

    const liveDurationFormatted = calculateJobDuration(job, currentTime)?.text || 'N/A';
    const liveEfficiencyFormatted = formatEfficiency(job, currentTime);
    const liveTotalCostFormatted = calculateLiveTotalCost(job, currentTime, employeeHourlyRates);
    const isJobActive = ['In Progress', 'Awaiting QC'].includes(job.status);
    const canEdit = !isJobActive && ['Pending', 'Paused', 'Complete', 'Issue', 'Archived - Issue'].includes(job.status);
    const canDelete = !isJobActive && ['Pending', 'Paused', 'Complete', 'Issue', 'Archived - Issue'].includes(job.status);
    const handleInputChange = (e) => { const { name, value } = e.target; setEditableJobData(prev => ({ ...prev, [name]: value })); };
    const handleEmployeeChange = (e) => { const newEmployeeId = e.target.value; const selectedEmployee = allEmployees.find(emp => emp.id === newEmployeeId); setEditableJobData(prev => ({ ...prev, employeeId: newEmployeeId, employeeName: selectedEmployee ? selectedEmployee.name : 'Unassigned' })); };
    const handleToolToggle = (toolId) => { setEditableJobData(prev => { const newTools = new Set(prev.selectedTools); if (newTools.has(toolId)) { newTools.delete(toolId); const accessoriesOfTool = allToolAccessories.filter(item => item.toolId === toolId).map(a => a.id); const newAccessories = new Set(prev.selectedAccessories); accessoriesOfTool.forEach(accId => newAccessories.delete(accId)); return { ...prev, selectedTools: newTools, selectedAccessories: newAccessories }; } else { newTools.add(toolId); return { ...prev, selectedTools: newTools }; } }); };
    const handleAccessoryToggle = (accId) => { setEditableJobData(prev => { const newAccessories = new Set(prev.selectedAccessories); newAccessories.has(accId) ? newAccessories.delete(accId) : newAccessories.add(accId); return { ...prev, selectedAccessories: newAccessories }; }); };
    const handleAddConsumableToList = (consumable) => { setEditableJobData(prev => ({ ...prev, selectedConsumables: [...prev.selectedConsumables, consumable] })); };
    const handleRemoveConsumableFromList = (itemId) => { setEditableJobData(prev => ({ ...prev, selectedConsumables: prev.selectedConsumables.filter(c => c.itemId !== itemId) })); };
    const handleSave = async () => { if (!editableJobData.partName.trim()) return alert("Part Name cannot be empty."); if (editableJobData.estimatedTime < 0) return alert("Estimated time cannot be negative."); if (!editableJobData.steps.trim()) return alert("Steps cannot be empty."); const updatedData = { partName: editableJobData.partName.trim(), description: editableJobData.description.trim(), estimatedTime: Number(editableJobData.estimatedTime), employeeId: editableJobData.employeeId || 'unassigned', employeeName: editableJobData.employeeName, steps: editableJobData.steps.split('\n').filter(s => s.trim() !== ''), tools: Array.from(editableJobData.selectedTools), accessories: Array.from(editableJobData.selectedAccessories), consumables: editableJobData.selectedConsumables, }; try { await onUpdateJob(job.id, updatedData); alert("Job updated successfully!"); setIsEditing(false); } catch (error) { console.error("Error updating job:", error); alert("Failed to update job."); } };
    const handleDelete = async () => { if (window.confirm(`Are you sure you want to permanently delete job "${job.jobId}"? This action cannot be undone.`)) { try { await onDeleteJob(job.id); alert("Job deleted successfully!"); onClose(); } catch (error) { console.error("Error deleting job:", error); alert("Failed to delete job."); } } };
    
    const handleGiveKudos = async () => {
        if (window.confirm("Give kudos for this job? The employee will be recognized for excellent work.")) {
            try {
                await giveKudosToJob(job.id);
                alert("Kudos given!");
                onClose();
            } catch (error) {
                console.error("Failed to give kudos:", error);
                alert("Could not give kudos at this time.");
            }
        }
    };
    
    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {isEditing ? `Editing: ${job.jobId}` : job.partName}
                            {job.kudos && <Award className="text-yellow-400" title="Kudos awarded for this job!" />}
                        </h2>
                        <p className="text-xs font-mono text-gray-500">{job.jobId}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <Input label="Part Name" name="partName" value={editableJobData.partName} onChange={handleInputChange} />
                            <Dropdown label="Assigned Employee" name="employeeId" value={editableJobData.employeeId} onChange={handleEmployeeChange} options={allEmployees} placeholder="Select Employee..."/>
                            <Input label="Estimated Time (minutes)" name="estimatedTime" type="number" value={editableJobData.estimatedTime} onChange={handleInputChange}/>
                            <Textarea label="Description" name="description" value={editableJobData.description} onChange={handleInputChange} rows={3} />
                            <Textarea label="Steps (one per line)" name="steps" value={editableJobData.steps} onChange={handleInputChange} rows={5} />
                            <div>
                                <h5 className="font-semibold text-white mb-2">Required Tools & Accessories</h5>
                                <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-800 rounded-lg">
                                    {(allTools || []).map(tool => (
                                        <div key={tool.id}>
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                                                <input type="checkbox" checked={editableJobData.selectedTools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                <span>{tool.name}</span>
                                            </label>
                                            {editableJobData.selectedTools.has(tool.id) && (
                                                <div className="pl-6 mt-1 space-y-1 text-xs border-l-2 border-gray-700">
                                                    {(allToolAccessories.filter(acc => acc.toolId === tool.id)).map(accessory => (
                                                        <label key={accessory.id} className="flex items-center space-x-2 text-xs text-gray-300">
                                                            <input type="checkbox" checked={editableJobData.selectedAccessories.has(accessory.id)} onChange={() => handleAccessoryToggle(accessory.id)} className="h-3 w-3 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                            <span>{accessory.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* --- REPLACEMENT --- */}
                            <ConsumableEditor
                                allConsumables={allInventoryItems}
                                selectedConsumables={editableJobData.selectedConsumables}
                                onAdd={handleAddConsumableToList}
                                onRemove={handleRemoveConsumableFromList}
                            />

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-700">
                                <Button onClick={() => setIsEditing(false)} variant="secondary"><XCircle size={18} className="mr-2"/> Cancel</Button>
                                <Button onClick={handleSave} variant="primary"><Save size={18} className="mr-2"/> Save Changes</Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                <DetailRow label="Employee" value={job.employeeName} />
                                <DetailRow label="Status" value={job.status} />
                                <DetailRow label="Created On" value={formatDate(job.createdAt)} />
                                <DetailRow label="Started On" value={formatDate(job.startedAt)} />
                                <DetailRow label="Completed On" value={formatDate(job.completedAt)} />
                                {job.status === 'Paused' && job.pausedAt && (<DetailRow label="Paused At" value={formatDate(job.pausedAt)} />)}
                                {job.status === 'Issue' && <DetailRow label="Issue Reason" value={job.issueReason || 'N/A'} className="text-red-400 font-semibold" />}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <Clock size={20} className="mx-auto mb-2 text-blue-400" />
                                    <p className="text-xs text-gray-400">Est. Time</p>
                                    <p className="font-bold">{job.estimatedTime || 'N/A'} min</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <CheckCircle2 size={20} className="mx-auto mb-2 text-green-400" />
                                    <p className="text-xs text-gray-400">Actual Time</p>
                                    <p className="font-bold">{liveDurationFormatted}</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <Zap size={20} className="mx-auto mb-2 text-purple-400" />
                                    <p className="text-xs text-gray-400">Efficiency</p>
                                    <p className="font-bold">{liveEfficiencyFormatted}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <p className="text-xs text-gray-400">Material Cost</p>
                                    <p className="font-bold font-mono">R{job.materialCost?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <p className="text-xs text-gray-400">Labor Cost</p>
                                    <p className="font-bold font-mono">R{job.laborCost?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                                    <DollarSign size={20} className="mx-auto mb-2 text-yellow-400" />
                                    <p className="text-xs text-gray-400">Total Job Cost</p>
                                    <p className="font-bold font-mono">{liveTotalCostFormatted}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-200 mb-2">Consumables Used</h4>
                                <ul className="text-sm text-gray-400 list-disc list-inside bg-gray-900/50 p-4 rounded-lg">
                                     {processedConsumablesForDisplay?.length > 0 ? processedConsumablesForDisplay.map((c, i) => (<li key={i}>{c.name} (Qty: {c.quantity?.toFixed(3) || 'N/A'} {c.unit || ''}) (R{c.price?.toFixed(2) || '0.00'})</li>)) : <li>None</li>}
                                 </ul>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
                                {user?.role === 'Manager' && job.status === 'Complete' && !job.kudos && (
                                    <Button onClick={handleGiveKudos} variant="primary" className="bg-yellow-600 hover:bg-yellow-700">
                                        <Award size={18} className="mr-2"/> Give Kudos
                                    </Button>
                                )}
                                {canEdit && (<Button onClick={() => setIsEditing(true)} variant="secondary"><Edit size={18} className="mr-2"/> Edit Job</Button>)}
                                {canDelete && (<Button onClick={handleDelete} variant="danger"><Trash2 size={18} className="mr-2"/> Delete Job</Button>)}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobDetailsModal;
