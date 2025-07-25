// src/components/features/catalog/ProductImportModal.jsx

import React, { useState } from 'react';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Button from '../../ui/Button';
import Input from '../../ui/Input'; // <-- FIX: Added the missing import for the Input component
import { X, Upload, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Simple CSV parsing function to remove the external dependency
const parseCsvData = (csvText) => {
    try {
        const lines = csvText.replace(/\r/g, '').split('\n');
        if (lines.length < 2) return [];
        
        const header = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim());
            const rowObject = {};
            header.forEach((col, index) => {
                rowObject[col] = values[index];
            });
            data.push(rowObject);
        }
        return data;
    } catch (error) {
        console.error("CSV Parsing Error:", error);
        toast.error("Could not parse the CSV file. Please check its format.");
        return [];
    }
};

const ProductImportModal = ({ onClose, onImportSuccess }) => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const results = parseCsvData(event.target.result);
                setParsedData(results);
            };
            reader.readAsText(selectedFile);
        } else {
            toast.error("Please select a valid .csv file.");
        }
    };

    const handleImport = async () => {
        if (parsedData.length === 0) {
            return toast.error("No valid data to import.");
        }
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const inventoryCollection = collection(db, 'inventoryItems');

            parsedData.forEach((row) => {
                // Basic validation for required fields
                if (row.name && row.partNumber) {
                    const newDocRef = doc(inventoryCollection);
                    const productData = {
                        name: row.name,
                        partNumber: row.partNumber,
                        make: row.make || '',
                        model: row.model || '',
                        manufacturer: row.manufacturer || '',
                        sellingPrice: parseFloat(row.sellingPrice) || 0,
                        photoUrl: row.photoUrl || '',
                        category: 'Product', // All imported items are Products
                        currentStock: 0, // Default stock values
                        reorderLevel: 0,
                        standardStockLevel: 0,
                    };
                    batch.set(newDocRef, productData);
                }
            });

            await batch.commit();
            toast.success(`${parsedData.length} products imported successfully!`);
            onImportSuccess();
            onClose();
        } catch (error) {
            console.error("Error importing products:", error);
            toast.error("An error occurred during the import.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Import Products from CSV</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <h3 className="font-semibold text-white">Instructions:</h3>
                        <p className="text-sm text-gray-400">Upload a CSV file with the following headers (case-sensitive):</p>
                        <code className="block bg-gray-900 p-2 rounded-md text-xs text-gray-300 mt-2">
                            name,partNumber,make,model,manufacturer,sellingPrice,photoUrl
                        </code>
                        <p className="text-xs text-gray-500 mt-1">Only 'name' and 'partNumber' are required. Other fields are optional.</p>
                    </div>
                    <Input type="file" accept=".csv" onChange={handleFileChange} />

                    {parsedData.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-white mb-2">Data Preview ({parsedData.length} rows found)</h4>
                            <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="p-2">Name</th>
                                            <th className="p-2">Part Number</th>
                                            <th className="p-2">Make</th>
                                            <th className="p-2">Model</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 10).map((row, index) => (
                                            <tr key={index} className="border-b border-gray-700">
                                                <td className="p-2 text-white">{row.name}</td>
                                                <td className="p-2 text-gray-300">{row.partNumber}</td>
                                                <td className="p-2 text-gray-400">{row.make}</td>
                                                <td className="p-2 text-gray-400">{row.model}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 10 && <p className="text-center text-xs text-gray-500 p-2">...and {parsedData.length - 10} more rows.</p>}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end">
                    <Button onClick={handleImport} variant="primary" disabled={isSubmitting || parsedData.length === 0}>
                        <CheckCircle size={16} className="mr-2" />
                        {isSubmitting ? 'Importing...' : `Import ${parsedData.length} Products`}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProductImportModal;
