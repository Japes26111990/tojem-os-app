import React, { useState, useEffect } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { getDocumentsPaginated, updateDocument, deleteDocument } from '../../../api/firestore';
import { X, Edit, Trash2 } from 'lucide-react';

const PAGE_SIZE = 15;

const collections = [
    'createdJobCards', 'parts', 'models', 'makes', 'manufacturers',
    'employees', 'departments', 'suppliers', 'tools', 'toolAccessories',
    'components', 'rawMaterials', 'workshopSupplies',
    'purchaseQueue', 'jobStepDetails'
].sort();

const CellRenderer = ({ value }) => {
    if (value instanceof Date) { return value.toLocaleDateString(); }
    if (typeof value === 'boolean') { return value ? '✅' : '❌'; }
    if (typeof value === 'object' && value !== null) {
        if (value.toDate instanceof Function) { return value.toDate().toLocaleString(); }
        // Truncate long strings/objects for display in the table
        const jsonString = JSON.stringify(value);
        return <pre className="text-xs bg-gray-900 p-1 rounded max-w-xs overflow-x-auto" title={jsonString}>{jsonString.length > 50 ? `${jsonString.substring(0, 50)}...` : jsonString}</pre>;
    }
    const stringValue = String(value);
    return <span title={stringValue}>{stringValue.length > 50 ? `${stringValue.substring(0, 50)}...` : stringValue}</span>;
};

const EditModal = ({ doc, collectionName, onClose, onSave }) => {
    const [formData, setFormData] = useState({ ...doc });

    const handleInputChange = (e, key) => {
        const { value, type, checked } = e.target;
        // Convert number inputs back to numbers
        const finalValue = type === 'checkbox' ? checked : type === 'number' ? Number(value) : value;
        setFormData(prev => ({ ...prev, [key]: finalValue }));
    };

    const renderInput = (key, value) => {
        if (key === 'id' || (typeof value === 'object' && value !== null)) {
            return <Input value={key === 'id' ? value : JSON.stringify(value)} disabled className="bg-gray-900"/>;
        }
        if (typeof value === 'boolean') {
            return <input type="checkbox" checked={formData[key]} onChange={(e) => handleInputChange(e, key)} className="h-5 w-5 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"/>;
        }
        if (typeof value === 'number') {
            return <Input type="number" value={formData[key]} onChange={(e) => handleInputChange(e, key)} />;
        }
        return <Input value={formData[key]} onChange={(e) => handleInputChange(e, key)} />;
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Edit Document: <span className="text-blue-400">{doc.id}</span></h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    {Object.keys(formData).map((key) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{key}</label>
                            {renderInput(key, formData[key])}
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end">
                    <Button onClick={() => onSave(collectionName, doc.id, formData)} variant="primary">Save Changes</Button>
                </div>
            </div>
        </div>
    );
};


const DatabaseEditor = () => {
    const [selectedCollection, setSelectedCollection] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageCursors, setPageCursors] = useState([null]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);

    const fetchDocuments = async (collectionName, pageIndex, cursor) => {
        setLoading(true);
        try {
            const { docs, lastVisible } = await getDocumentsPaginated(collectionName, PAGE_SIZE, cursor);
            setDocuments(docs);

            if (docs.length > 0) {
                const allKeys = docs.reduce((acc, doc) => {
                    Object.keys(doc).forEach(key => key !== 'id' && acc.add(key));
                    return acc;
                }, new Set());
                setHeaders(['id', ...Array.from(allKeys).sort()]);
            } else {
                setHeaders([]);
            }

            if (lastVisible) {
                const newCursors = [...pageCursors.slice(0, pageIndex + 1)];
                newCursors[pageIndex + 1] = lastVisible;
                setPageCursors(newCursors);
            }
            setHasNextPage(docs.length === PAGE_SIZE);

        } catch (error) {
            console.error(`Failed to fetch from ${collectionName}:`, error);
            alert(`Could not fetch data from ${collectionName}. See console for details.`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleCollectionSelect = (collectionName) => {
        setSelectedCollection(collectionName);
        setPage(0);
        setPageCursors([null]);
        setDocuments([]);
        setHeaders([]);
        fetchDocuments(collectionName, 0, null);
    };

    const handleNextPage = () => {
        if (!hasNextPage || loading) return;
        const nextPage = page + 1;
        fetchDocuments(selectedCollection, nextPage, pageCursors[nextPage]);
        setPage(nextPage);
    };

    const handlePrevPage = () => {
        if (page === 0 || loading) return;
        const prevPage = page - 1;
        fetchDocuments(selectedCollection, prevPage, pageCursors[prevPage]);
        setPage(prevPage);
    };

    const handleSave = async (collectionName, docId, data) => {
        try {
            await updateDocument(collectionName, docId, data);
            alert("Document updated successfully!");
            setEditingDoc(null);
            fetchDocuments(selectedCollection, page, pageCursors[page]);
        } catch (error) {
            console.error("Failed to update document:", error);
            alert("Error: Could not update document.");
        }
    };

    const handleDelete = async (collectionName, docId) => {
        if (window.confirm("Are you sure you want to PERMANENTLY delete this document? This action cannot be undone.")) {
            try {
                await deleteDocument(collectionName, docId);
                alert("Document deleted successfully!");
                handleCollectionSelect(collectionName); // Refetch the first page
            } catch (error) {
                console.error("Failed to delete document:", error);
                alert("Error: Could not delete document.");
            }
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-gray-800 p-4 rounded-xl border border-gray-700 self-start">
                    <h3 className="text-lg font-bold text-white mb-4">Collections</h3>
                    <div className="space-y-2">
                        {collections.map(name => (
                            <button key={name} onClick={() => handleCollectionSelect(name)} className={`w-full text-left p-2 rounded-md text-sm transition-colors ${selectedCollection === name ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">
                        Documents in <span className="text-blue-400">{selectedCollection || '...'}</span>
                    </h3>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-900/50">
                                    <th className="p-2 font-semibold sticky left-0 bg-gray-900/50 z-10">Actions</th>
                                    {headers.map(header => <th key={header} className="p-2 font-semibold">{header}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={headers.length + 1} className="text-center p-8 text-gray-400">Loading...</td></tr>
                                ) : documents.length === 0 ? (
                                    <tr><td colSpan={headers.length || 2} className="text-center p-8 text-gray-400">No documents found.</td></tr>
                                ) : (
                                    documents.map(doc => (
                                        <tr key={doc.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-2 align-top sticky left-0 bg-gray-800 hover:bg-gray-700/50 flex gap-2">
                                                <Button onClick={() => setEditingDoc(doc)} variant="secondary" className="p-1" title="Edit"><Edit size={14} /></Button>
                                                <Button onClick={() => handleDelete(selectedCollection, doc.id)} variant="danger" className="p-1" title="Delete"><Trash2 size={14} /></Button>
                                            </td>
                                            {headers.map(header => (
                                                <td key={header} className="p-2 align-top"><CellRenderer value={doc[header]}/></td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-4">
                        <Button onClick={handlePrevPage} disabled={page === 0 || loading}>Previous</Button>
                        <span className="text-gray-400">Page {page + 1}</span>
                        <Button onClick={handleNextPage} disabled={!hasNextPage || loading}>Next</Button>
                    </div>
                </div>
            </div>

            {editingDoc && (
                <EditModal 
                    doc={editingDoc}
                    collectionName={selectedCollection}
                    onClose={() => setEditingDoc(null)}
                    onSave={handleSave}
                />
            )}
        </>
    );
};

export default DatabaseEditor;