// src/components/features/catalog/QrCodePrintModal.jsx

import React, { useEffect, useRef } from 'react';
import Button from '../../ui/Button';
import { X, Printer } from 'lucide-react';
import QRCode from 'qrcode';

const QrCodePrintModal = ({ product, onClose }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current && product?.partNumber) {
            // Adjust QR code size to leave space for text
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
                        @media print {
                            @page {
                                size: 23mm 23mm;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 1mm; /* Small padding inside the sticker */
                                font-family: sans-serif;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                            }
                            p {
                                font-size: 7pt; /* Small font size for the label */
                                font-weight: bold;
                                margin: 2mm 0 0 0;
                                padding: 0;
                                text-align: center;
                                word-break: break-word;
                            }
                        }
                    </style>
                </head>
                <body>
                    <img src="${canvas.toDataURL()}" />
                    <p>${product.name}</p>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        // A short delay helps ensure images are loaded before printing
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
                    {/* The displayed canvas is for preview, the printed version is styled separately */}
                    <canvas ref={canvasRef}></canvas>
                    <h3 className="text-lg font-semibold text-white mt-4">{product.name}</h3>
                    <p className="text-sm text-gray-400">{product.partNumber}</p>
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
