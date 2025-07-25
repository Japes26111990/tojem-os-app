// src/components/features/catalog/QrCodePrintModal.jsx

import React, { useEffect, useRef } from 'react';
import Button from '../../ui/Button';
import { X, Printer } from 'lucide-react';
import QRCode from 'qrcode';

const QrCodePrintModal = ({ product, onClose }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && product?.partNumber) {
            QRCode.toCanvas(canvasRef.current, product.partNumber, { width: 200 }, (error) => {
                if (error) console.error(error);
            });
        }
    }, [product]);

    const handlePrint = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Print QR Code</title></head>
                <body style="text-align: center; margin-top: 50px;">
                    <h3>${product.name}</h3>
                    <p>P/N: ${product.partNumber}</p>
                    <img src="${canvas.toDataURL()}" />
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Print QR Code</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">{product.partNumber}</p>
                    <canvas ref={canvasRef}></canvas>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end">
                    <Button onClick={handlePrint} variant="primary">
                        <Printer size={16} className="mr-2" />
                        Print Label
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QrCodePrintModal;
