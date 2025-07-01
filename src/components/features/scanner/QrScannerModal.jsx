// src/components/features/scanner/QrScannerModal.jsx (New File)

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';

const QrScannerModal = ({ onClose, onScanSuccess }) => {
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        const scriptId = 'html5-qrcode-script';
        
        // Function to initialize the scanner
        const setupScanner = () => {
            if (window.Html5Qrcode && scannerRef.current) {
                const html5QrCode = new window.Html5Qrcode(scannerRef.current.id);
                html5QrCodeRef.current = html5QrCode;

                const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                    toast.success(`Scanned: ${decodedText}`);
                    onScanSuccess(decodedText);
                    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                        html5QrCodeRef.current.stop().catch(err => console.error("Failed to stop scanner:", err));
                    }
                    onClose();
                };

                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
                    .catch(err => {
                        if (err.name === "NotReadableError") {
                            toast.error("Camera is busy or blocked. Please ensure no other app is using it and check browser permissions.");
                        } else {
                            toast.error("Failed to start camera. Please ensure permissions are granted.");
                        }
                        console.error("Camera start error:", err);
                        onClose();
                    });
            }
        };

        // Load the script if it doesn't exist
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
            script.async = true;
            script.onload = () => {
                console.log("QR Code scanner script loaded.");
                setupScanner();
            };
            document.body.appendChild(script);
        } else {
            setupScanner();
        }

        // Cleanup function to stop the scanner when the component unmounts
        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop()
                    .then(() => console.log("QR Code scanner stopped."))
                    .catch(err => console.error("Error stopping scanner on unmount:", err));
            }
        };
    }, [onClose, onScanSuccess]);

    return (
        <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">Scan QR Code</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>
                <div className="p-4">
                    <div id="qr-reader" ref={scannerRef} className="w-full"></div>
                </div>
            </div>
        </div>
    );
};

export default QrScannerModal;
