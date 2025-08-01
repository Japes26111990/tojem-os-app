// src/components/features/stock/StockTakeComponents.jsx

import React from 'react';
import Input from '../../ui/Input';
import { CheckCircle, AlertCircle, XCircle, Hash, Scale } from 'lucide-react';

export const Summary = ({ data }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
                <h4 className="text-sm text-gray-400 font-medium">Total Items</h4>
                <p className="text-2xl font-bold text-white">{data.totalItems}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
                <h4 className="text-sm text-gray-400 font-medium flex items-center justify-center gap-1"><CheckCircle size={16} className="text-green-500" />Counted</h4>
                <p className="text-2xl font-bold text-white">{data.counted}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
                <h4 className="text-sm text-gray-400 font-medium flex items-center justify-center gap-1"><XCircle size={16} className="text-yellow-500" />Uncounted</h4>
                <p className="text-2xl font-bold text-white">{data.uncounted}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
                <h4 className="text-sm text-gray-400 font-medium flex items-center justify-center gap-1"><AlertCircle size={16} className="text-red-500" />Discrepancies</h4>
                <p className="text-2xl font-bold text-white">{data.discrepancies}</p>
            </div>
        </div>
    );
};

// This component is now fully responsive. It renders as a list of cards on mobile
// and a full table on larger screens.
export const StockCountList = ({ items, onCountChange }) => {
    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 hidden md:table-header-group">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-gray-400">Item Name</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">Method</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">System Count</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center w-64">Physical Count Input</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">Calculated Qty</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">Variance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {items.map(item => (
                            <tr key={item.id} className="block md:table-row p-2 md:p-0">
                                <td className="p-2 md:p-3 text-white font-medium block md:table-cell" data-label="Item Name">
                                    <span className="md:hidden font-bold text-gray-400">Item: </span>{item.name}
                                </td>
                                <td className="p-2 md:p-3 text-gray-400 font-mono block md:table-cell" data-label="Method">
                                    <div className="flex items-center gap-2" title={`Unit Weight: ${item.unitWeight}g, Tare: ${item.tareWeight}g`}>
                                        {item.stockTakeMethod === 'weight' ? <Scale size={16}/> : <Hash size={16}/>}
                                        <span>{item.stockTakeMethod === 'weight' ? 'Weight' : 'Quantity'}</span>
                                    </div>
                                </td>
                                <td className="p-2 md:p-3 text-gray-300 font-mono text-right md:text-center block md:table-cell" data-label="System Count">
                                    <span className="md:hidden font-bold text-gray-400">System Count: </span>{item.systemCount}
                                </td>
                                <td className="p-2 md:p-3 block md:table-cell" data-label="Physical Count Input">
                                    {item.stockTakeMethod === 'weight' ? (
                                        <Input
                                            type="number"
                                            value={item.countedValues?.grossWeight || ''}
                                            onChange={(e) => onCountChange(item.id, 'grossWeight', e.target.value)}
                                            className="text-center bg-gray-900"
                                            placeholder="Gross Wt. (g)"
                                        />
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
                                <td className="p-2 md:p-3 font-bold text-lg font-mono text-right md:text-center text-blue-400 block md:table-cell" data-label="Calculated Qty">
                                    <span className="md:hidden font-bold text-gray-400">Calculated Qty: </span>{item.hasBeenCounted ? item.physicalCount : '-'}
                                </td>
                                <td className={`p-2 md:p-3 font-bold text-lg font-mono text-right md:text-center block md:table-cell ${item.variance > 0 ? 'text-green-400' : item.variance < 0 ? 'text-red-400' : 'text-gray-500'}`} data-label="Variance">
                                    <span className="md:hidden font-bold text-gray-400">Variance: </span>{item.hasBeenCounted ? (item.variance > 0 ? `+${item.variance}` : item.variance) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
