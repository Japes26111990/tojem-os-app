// src/components/features/stock/ConsignmentReport.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getClientUsers, listenToConsignmentStockForClient } from '../../../api/firestore';
import { Truck, User } from 'lucide-react';

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const ConsignmentReport = () => {
    const [clients, setClients] = useState([]);
    const [consignmentStock, setConsignmentStock] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const clientUsers = await getClientUsers();
                const formattedClients = clientUsers.map(c => ({ id: c.id, name: c.companyName || c.email }));
                setClients(formattedClients);

                const allStock = [];
                const unsubscribers = formattedClients.map(client => {
                    return listenToConsignmentStockForClient(client.id, (items) => {
                        const existingClientIndex = allStock.findIndex(s => s.clientId === client.id);
                        if (existingClientIndex > -1) {
                            allStock[existingClientIndex].items = items;
                        } else {
                            allStock.push({ clientId: client.id, clientName: client.name, items });
                        }
                        setConsignmentStock([...allStock]);
                    });
                });
                setLoading(false);
                return () => unsubscribers.forEach(unsub => unsub());
            } catch (error) {
                console.error("Error fetching consignment data:", error);
                setLoading(false);
            }
        };
        const unsubPromise = fetchData();
        return () => { unsubPromise.then(cleanup => cleanup && cleanup()); };
    }, []);

    const totalConsignmentValue = useMemo(() => {
        return consignmentStock.flat().reduce((sum, clientData) => {
            return sum + clientData.items.reduce((clientSum, item) => {
                return clientSum + ((item.quantity || 0) * (item.sellingPrice || 0));
            }, 0);
        }, 0);
    }, [consignmentStock]);

    return (
        <div className="space-y-6">
            <KpiCard
                icon={<Truck size={24} />}
                title="Total Value of Consignment Stock"
                value={`R ${totalConsignmentValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                color="bg-purple-500/20 text-purple-400"
            />
            {loading ? <p>Loading consignment data...</p> : (
                consignmentStock.map(clientData => (
                    <div key={clientData.clientId} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h4 className="font-bold text-white text-lg mb-2 flex items-center gap-2"><User /> {clientData.clientName}</h4>
                         <div className="overflow-x-auto max-h-72">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                                    <tr>
                                        <th className="p-2">Product Name</th>
                                        <th className="p-2 text-center">Quantity on Hand</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientData.items.map(item => (
                                        <tr key={item.id} className="border-b border-gray-700">
                                            <td className="p-2 text-white">{item.productName}</td>
                                            <td className="p-2 text-center font-bold">{item.quantity || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ConsignmentReport;
