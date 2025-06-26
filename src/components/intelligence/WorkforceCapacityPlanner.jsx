// src/components/intelligence/WorkforceCapacityPlanner.jsx (UPDATED with Gross Margin)
import React, { useState, useEffect, useMemo } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { TrendingUp, Users, Zap, DollarSign, PlusCircle, Trash2, Percent } from 'lucide-react';

const EmployeeRow = ({ employee, onRemove }) => (
    <div className="grid grid-cols-4 gap-4 items-center p-2 bg-gray-700/50 rounded-lg">
        <p className="text-white font-medium truncate">{employee.name}</p>
        <p className="text-gray-300 font-mono text-center">R {employee.hourlyRate.toFixed(2)}</p>
        <p className={`font-bold text-center ${employee.efficiency >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
            {employee.efficiency.toFixed(0)}%
        </p>
        {onRemove && (
            <div className="text-right">
                <Button onClick={onRemove} variant="danger" size="sm" className="p-1 h-7 w-7">
                    <Trash2 size={14} />
                </Button>
            </div>
        )}
    </div>
);

const WorkforceCapacityPlanner = ({ realEmployees, jobs }) => {
    const [scenario, setScenario] = useState({
        targetSales: '',
        overheads: '',
        grossMargin: '35', // NEW: Added Gross Margin with a default of 35%
    });
    const [simulatedEmployees, setSimulatedEmployees] = useState([]);
    const [newSimEmployee, setNewSimEmployee] = useState({ name: 'Sim Employee', hourlyRate: '150', efficiency: '95' });

    const allEmployeesInScenario = useMemo(() => {
        return [...realEmployees, ...simulatedEmployees];
    }, [realEmployees, simulatedEmployees]);

    const results = useMemo(() => {
        const targetSales = parseFloat(scenario.targetSales) || 0;
        const overheads = parseFloat(scenario.overheads) || 0;
        const grossMargin = parseFloat(scenario.grossMargin) || 0;

        if (targetSales === 0) return { requiredValue: 0, availableValue: 0, netProfit: 0, requiredEmployees: 'N/A' };

        // 1. Calculate Gross Profit based on the user's input margin
        const grossProfit = targetSales * (grossMargin / 100);

        // 2. Calculate Net Profit by subtracting overheads
        const netProfit = grossProfit - overheads;
        
        // 3. Calculate Required Production Capacity
        // This is now based on the Gross Profit, which represents the value added by the workshop
        const requiredValue = grossProfit;

        // 4. Calculate the team's available capacity
        const totalAvailableValue = allEmployeesInScenario.reduce((total, emp) => {
            const monthlyHours = 173.2;
            const efficiencyFactor = emp.efficiency / 100;
            const valueGenerated = emp.hourlyRate * monthlyHours * efficiencyFactor;
            return total + valueGenerated;
        }, 0);
        
        // 5. Suggest required employees based on value generation
        const avgEmployeeValue = allEmployeesInScenario.length > 0
            ? totalAvailableValue / allEmployeesInScenario.length
            : (parseFloat(newSimEmployee.hourlyRate) || 150) * 173.2 * ((parseFloat(newSimEmployee.efficiency) || 95) / 100);
            
        const requiredEmployees = avgEmployeeValue > 0 ? (requiredValue / avgEmployeeValue).toFixed(1) : 'N/A';

        return {
            requiredValue: requiredValue,
            availableValue: totalAvailableValue,
            netProfit,
            requiredEmployees
        };

    }, [scenario, allEmployeesInScenario, newSimEmployee]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setScenario(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSimInputChange = (e) => {
        const { name, value } = e.target;
        setNewSimEmployee(prev => ({ ...prev, [name]: value }));
    };
    
    const addSimulatedEmployee = () => {
        if (parseFloat(newSimEmployee.hourlyRate) > 0 && parseFloat(newSimEmployee.efficiency) > 0) {
            setSimulatedEmployees(prev => [...prev, {
                ...newSimEmployee,
                id: `sim-${Date.now()}`,
                hourlyRate: parseFloat(newSimEmployee.hourlyRate),
                efficiency: parseFloat(newSimEmployee.efficiency),
            }]);
        }
    };

    const removeSimulatedEmployee = (id) => {
        setSimulatedEmployees(prev => prev.filter(emp => emp.id !== id));
    };

    const formatCurrency = (value) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="text-blue-400" />
                Workforce & Capacity Planner
            </h3>
            
            {/* INPUTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <Input 
                    label="Target Monthly Sales (R)" 
                    name="targetSales" 
                    type="number" 
                    value={scenario.targetSales} 
                    onChange={handleInputChange} 
                    placeholder="e.g., 500000" 
                />
                <Input 
                    label="Fixed Overheads (R)" 
                    name="overheads" 
                    type="number" 
                    value={scenario.overheads} 
                    onChange={handleInputChange}
                    placeholder="e.g., 145000"
                />
                 <Input 
                    label="Gross Margin (%)" 
                    name="grossMargin" 
                    type="number" 
                    value={scenario.grossMargin} 
                    onChange={handleInputChange}
                    placeholder="e.g., 35"
                />
            </div>

            {/* TEAM COMPOSITION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Employee List */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-lg text-white">Team Composition</h4>
                    <div className="grid grid-cols-4 gap-4 px-2 text-sm text-gray-400 font-bold">
                        <span>Employee</span>
                        <span className="text-center">Rate/hr</span>
                        <span className="text-center">Efficiency</span>
                        <span className="text-right">Action</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {realEmployees.map(emp => <EmployeeRow key={emp.id} employee={emp} />)}
                        {simulatedEmployees.map(emp => <EmployeeRow key={emp.id} employee={emp} onRemove={() => removeSimulatedEmployee(emp.id)} />)}
                    </div>
                     <div className="grid grid-cols-4 gap-2 items-end p-2 border-t border-gray-700 pt-3">
                        <Input label="Sim Rate" name="hourlyRate" type="number" value={newSimEmployee.hourlyRate} onChange={handleSimInputChange} />
                        <Input label="Sim Efficiency" name="efficiency" type="number" value={newSimEmployee.efficiency} onChange={handleSimInputChange} />
                        <div className="col-span-2 text-right">
                             <Button onClick={addSimulatedEmployee}><PlusCircle size={16} className="mr-2"/>Add Sim Employee</Button>
                        </div>
                    </div>
                </div>

                {/* Projected Results */}
                <div className="space-y-4 bg-gray-900/50 p-6 rounded-lg">
                    <h4 className="font-semibold text-lg text-white">Projected Results</h4>
                    <div className="text-center bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Required Team Value vs. Available</p>
                        <p className={`text-3xl font-bold mt-1 ${results.availableValue < results.requiredValue ? 'text-red-400' : 'text-green-400'}`}>
                            {formatCurrency(results.requiredValue)} / {formatCurrency(results.availableValue)}
                        </p>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="text-center bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Suggested Workforce</p>
                            <p className="text-3xl font-bold text-white">
                                {results.requiredEmployees}
                                <span className="text-lg ml-1">people</span>
                            </p>
                        </div>
                        <div className="text-center bg-blue-600/20 p-4 rounded-lg border border-blue-500">
                            <p className="text-sm text-blue-300">Projected Net Profit</p>
                            <p className={`text-3xl font-bold ${results.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                                {formatCurrency(results.netProfit)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkforceCapacityPlanner;
