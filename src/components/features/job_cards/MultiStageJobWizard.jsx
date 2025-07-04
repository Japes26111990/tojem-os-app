// src/components/features/job_cards/MultiStageJobWizard.jsx

import React, { useEffect, useState } from 'react';
import {
  getDepartments,
  getEmployees,
  getProducts,
  getJobStepDetails,
  addJobCard
} from '../../../api/firestore';
import Dropdown from '../../ui/Dropdown';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';

const MultiStageJobWizard = () => {
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [jobStepMap, setJobStepMap] = useState({});
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prods, depts, emps, steps] = await Promise.all([
          getProducts(),
          getDepartments(),
          getEmployees(),
          getJobStepDetails()
        ]);
        setProducts(prods);
        setDepartments(depts);
        setEmployees(emps);

        const stepMap = {};
        steps.forEach(step => {
          if (!step.productId || !step.departmentId) return;
          const key = `${step.productId}_${step.departmentId}`;
          stepMap[key] = step;
        });
        setJobStepMap(stepMap);
      } catch (err) {
        console.error(err);
        toast.error("Error loading data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const createMultiStageJobs = async () => {
    if (!selectedProductId || quantity <= 0) {
      toast.error("Please select a product and enter a valid quantity.");
      return;
    }

    const jobIdPrefix = `ROUTED-${Date.now()}`;
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const relevantSteps = Object.entries(jobStepMap)
      .filter(([key, step]) => key.startsWith(selectedProductId))
      .map(([_, step]) => step)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (relevantSteps.length === 0) {
      toast.error("No job steps found for this product.");
      return;
    }

    setCreating(true);

    try {
      for (let i = 0; i < relevantSteps.length; i++) {
        const step = relevantSteps[i];
        const dept = departments.find(d => d.id === step.departmentId);
        const employee = employees.find(e => e.skills?.[step.requiredSkillId] > 0) || { id: 'unassigned', name: 'Unassigned' };

        await addJobCard({
          jobId: `${jobIdPrefix}-${i + 1}`,
          partId: selectedProduct.id,
          partName: selectedProduct.name,
          quantity,
          departmentId: step.departmentId,
          departmentName: dept?.name || 'Unknown',
          employeeId: employee.id,
          employeeName: employee.name,
          status: 'Pending',
          description: step.description || '',
          estimatedTime: step.estimatedTime || 60,
          steps: step.steps || [],
          tools: step.tools || [],
          accessories: step.accessories || [],
          processedConsumables: step.consumables || [],
          isCustomJob: false,
          parentJobId: jobIdPrefix,
          requiredSkills: dept?.requiredSkills || []
        });
      }

      toast.success(`Created ${relevantSteps.length} staged jobs successfully.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create staged jobs.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-center">Loading product and routing data...</p>;

  return (
    <div className="p-6 bg-gray-900 border border-gray-700 rounded-xl shadow-lg max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Multi-Stage Job Creator</h2>
      <div className="mb-4">
        <Dropdown
          label="Select Product"
          options={products.map(p => ({ label: p.name, value: p.id }))}
          value={selectedProductId}
          onChange={setSelectedProductId}
        />
      </div>
      <div className="mb-4">
        <Input
          label="Quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </div>
      <Button onClick={createMultiStageJobs} disabled={creating}>
        {creating ? "Creating..." : "Create Multi-Stage Jobs"}
      </Button>
    </div>
  );
};

export default MultiStageJobWizard;
