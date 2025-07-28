// src/components/features/catalog/QrCodePrintModal.jsx

import React, { useEffect, useRef, useState } from 'react';
import Button from '../../ui/Button';
import Input from '../../ui/Input'; // Ensure this is imported
import { X, Printer } from 'lucide-react';
import QRCode from 'qrcode';

const QrCodePrintModal = ({ product, onClose }) => {
    const canvasRef = useRef(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (canvasRef.current && product?.partNumber) {
            QRCode.toCanvas(canvasRef.current, product.partNumber, { width: 150, margin: 1 }, (error) => {
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
                <head>
                    <title>Print QR Code - ${product.partNumber}</title>
                    <style>
                        * { box-sizing: border-box; }
                        body { margin: 0; font-family: sans-serif; }
                        .sticker {
                            width: 23mm;
                            height: 23mm;
                            padding: 3mm 1mm 1mm 1mm; /* Adjusted padding top to shift content up by 1mm (from 4mm to 3mm) */
                            display: flex;
                            flex-direction: column;
                            align-items: center; /* Center horizontally */
                            justify-content: flex-start; 
                            gap: 0.5mm; /* Reduced gap */
                            page-break-after: always;
                            position: relative;
                            overflow: hidden;
                        }
                        /* NEW: This rule prevents the final blank label from printing */
                        .sticker:last-child {
                            page-break-after: auto;
                        }
                        img { 
                            max-width: 100%; 
                            max-height: 13mm; /* Increased max-height for QR code */
                            height: auto; 
                            display: block; /* Ensures margin auto works for centering */
                            margin: 0 auto; /* Center QR code horizontally */
                        }
                        p {
                            font-size: 6.5pt; /* Slightly smaller font for part number */
                            font-weight: bold;
                            margin: 0;
                            padding: 0;
                            text-align: center; /* Center text */
                            word-break: break-all;
                            line-height: 1;
                        }
                        /* NEW: Style for the part name */
                        .part-name {
                            font-size: 5.5pt; /* Slightly smaller font for part name */
                            font-weight: normal;
                            margin: 0; /* Removed margin-bottom */
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            width: 100%;
                            text-align: center; /* Center text */
                        }
                        @media print {
                            @page {
                                size: 23mm 23mm;
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
        `);

        for (let i = 0; i < quantity; i++) {
            printWindow.document.write(`
                <div class="sticker">
                    <div class="content">
                        <p class="part-name">${product.name}</p>
                        <img src="${canvas.toDataURL()}" />
                        <p>${product.partNumber}</p>
                    </div>
                </div>
            `);
        }

        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Print QR Code</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                    <canvas ref={canvasRef}></canvas>
                    <h3 className="text-lg font-semibold text-white mt-4">{product.name}</h3>
                    <p className="text-sm text-gray-400">{product.partNumber}</p>
                    <div className="mt-4 w-full max-w-xs">
                        <Input
                            label="Quantity to Print"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            min="1"
                        />
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end">
                    <Button onClick={handlePrint} variant="primary">
                        <Printer size={16} className="mr-2" />
                        Print {quantity} Label(s)
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QrCodePrintModal;
