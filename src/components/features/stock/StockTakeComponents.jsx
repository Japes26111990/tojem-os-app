// src/components/features/stock/StockTakeComponents.jsx (UPGRADED for dynamic counting)

import React from 'react';
import Input from '../../ui/Input';
import { CheckCircle, AlertCircle, XCircle, Hash, Scale } from 'lucide-react';

export const Summary = ({ data }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm text-gray-400 font-medium">Total Items</h4>
                <p className="text-2xl font-bold text-white">{data.totalItems}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm text-gray-400 font-medium flex items-center gap-1"><CheckCircle size={16} className="text-green-500" />Counted</h4>
                <p className="text-2xl font-bold text-white">{data.counted}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm text-gray-400 font-medium flex items-center gap-1"><XCircle size={16} className="text-yellow-500" />Uncounted</h4>
                <p className="text-2xl font-bold text-white">{data.uncounted}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm text-gray-400 font-medium flex items-center gap-1"><AlertCircle size={16} className="text-red-500" />Discrepancies</h4>
                <p className="text-2xl font-bold text-white">{data.discrepancies}</p>
            </div>
        </div>
    );
};

// This component now conditionally renders the correct input fields
export const StockCountList = ({ items, onCountChange }) => {
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-gray-400">Item Name</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">Method</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">System Count</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center w-64">Physical Count Input</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">Calculated Qty</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">Variance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                                <td className="p-2 text-white font-medium">{item.name}</td>
                                <td className="p-2 text-gray-400 font-mono">
                                    <div className="flex items-center gap-2" title={`Unit Weight: ${item.unitWeight}g, Tare: ${item.tareWeight}g`}>
                                        {item.stockTakeMethod === 'weight' ? <Scale size={16}/> : <Hash size={16}/>}
                                        <span>{item.stockTakeMethod === 'weight' ? 'Weight' : 'Quantity'}</span>
                                    </div>
                                </td>
                                <td className="p-2 text-gray-300 font-mono text-center">{item.systemCount}</td>
                                <td className="p-2">
                                    {item.stockTakeMethod === 'weight' ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={item.countedValues?.grossWeight || ''}
                                                onChange={(e) => onCountChange(item.id, 'grossWeight', e.target.value)}
                                                className="text-center bg-gray-900"
                                                placeholder="Gross Wt. (g)"
                                            />
                                        </div>
                                    ) : (
                                        <Input
                                            type="number"
                                            value={item.countedValues?.quantity || ''}
                                            onChange={(e) => onCountChange(item.id, 'quantity', e.target.value)}
                                            className="text-center bg-gray-900"
                                            placeholder="Enter quantity..."
                                        />
                                    )}
                                </td>
                                <td className="p-2 font-bold text-lg font-mono text-center text-blue-400">
                                     {item.hasBeenCounted ? item.physicalCount : '-'}
                                </td>
                                <td className={`p-2 font-bold text-lg font-mono text-center ${item.variance > 0 ? 'text-green-400' : item.variance < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                                    {item.hasBeenCounted ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
