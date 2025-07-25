// src/pages/ClientScannerPage.jsx

import React, { useState } from 'react';
import { findInventoryItemByItemCode } from '../api/firestore';
import Button from '../components/ui/Button';
import { QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import QrScannerModal from '../components/features/scanner/QrScannerModal';
import ScannedProductDisplay from '../components/features/portal/ScannedProductDisplay'; // We will create this next

const ClientScannerPage = () => {
    const [scannedProduct, setScannedProduct] = useState(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleScanSuccess = async (decodedText) => {
        setIsScannerOpen(false);
        setLoading(true);
        setScannedProduct(null);
        try {
            // The QR code contains the part number
            const product = await findInventoryItemByItemCode(decodedText);
            if (product.category !== 'Product') {
                throw new Error("Scanned item is not a valid product.");
            }
            setScannedProduct(product);
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setScannedProduct(null);
    };

    return (
        <>
            <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Consignment Stock Scanner</h2>
                
                {!scannedProduct ? (
                    <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center max-w-md mx-auto">
                        <p className="text-gray-400 mb-6">Scan a product's QR code to view its details and book it out of your consignment stock.</p>
                        <Button 
                            variant="primary" 
                            className="w-full py-4 text-lg"
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <QrCode size={24} className="mr-2"/>
                            Scan Product
                        </Button>
                        {loading && <p className="text-blue-400 mt-4">Searching for product...</p>}
                    </div>
                ) : (
                    <ScannedProductDisplay product={scannedProduct} onBookOutSuccess={handleReset} />
                )}
            </div>

            {isScannerOpen && (
                <QrScannerModal 
                    onClose={() => setIsScannerOpen(false)}
                    onScanSuccess={handleScanSuccess}
                />
            )}
        </>
    );
};

export default ClientScannerPage;
