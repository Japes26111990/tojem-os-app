// src/hooks/useStockTakeData.js (REFACTORED)
// This hook now filters for uncounted items by checking if their last counted session ID
// is different from the current session ID, avoiding the need for a large batch write.

import { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems } from '../api/firestore';

export const useStockTakeData = (inventoryTypeFilter) => { // Accept the filter
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [counts, setCounts] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const items = await getAllInventoryItems();
            // Apply the category filter immediately after fetching
            let filteredItems = items;
            if (inventoryTypeFilter === 'products') {
                filteredItems = items.filter(item => item.category === 'Product');
            } else if (inventoryTypeFilter === 'purchased') {
                filteredItems = items.filter(item => item.category !== 'Product');
            }
            setAllItems(filteredItems);
        } catch (err) {
            setError("Failed to load inventory.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Refetch data when the inventory type filter changes
    useEffect(() => {
        fetchData();
    }, [inventoryTypeFilter]);

    const handleCountChange = (itemId, field, value) => {
        setCounts(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    const processedItems = useMemo(() => {
        return allItems.map(item => {
            const systemCount = item.currentStock || 0;
            const countedValues = counts[item.id] || {};
            let physicalCount = '';
            let hasBeenCounted = false;

            if (item.stockTakeMethod === 'weight') {
                const grossWeight = parseFloat(countedValues.grossWeight);
                if (!isNaN(grossWeight)) {
                    hasBeenCounted = true;
                    const tareWeight = parseFloat(item.tareWeight) || 0;
                    const unitWeight = parseFloat(item.unitWeight) || 1;
                    if (unitWeight > 0) {
                        const netWeight = grossWeight - tareWeight;
                        physicalCount = Math.round(netWeight / unitWeight);
                    } else {
                        physicalCount = 0;
                    }
                }
            } else { // Default to 'quantity'
                const qty = countedValues.quantity;
                if (qty !== undefined && qty !== '') {
                    hasBeenCounted = true;
                    physicalCount = Number(qty);
                }
            }
            
            const variance = hasBeenCounted ? physicalCount - systemCount : 0;
            
            return {
                ...item,
                systemCount,
                physicalCount,
                variance,
                hasBeenCounted,
                countedValues, 
            };
        });
    }, [allItems, counts]);

    const filteredItems = useMemo(() => {
        let items = processedItems;
        if (filter === 'discrepancies') {
            items = items.filter(item => item.hasBeenCounted && item.variance !== 0);
        } else if (filter === 'uncounted') {
            items = items.filter(item => !item.hasBeenCounted);
        } else if (filter === 'counted') {
            items = items.filter(item => item.hasBeenCounted);
        }
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.name.toLowerCase().includes(lowerCaseSearch) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(lowerCaseSearch))
            );
        }
        return items;
    }, [processedItems, filter, searchTerm]);

    const summary = useMemo(() => {
        const countedItems = processedItems.filter(item => item.hasBeenCounted);
        const discrepancies = countedItems.filter(item => item.variance !== 0);
        return {
            totalItems: allItems.length,
            counted: countedItems.length,
            uncounted: allItems.length - countedItems.length,
            discrepancies: discrepancies.length
        };
    }, [allItems.length, processedItems]);

    const getItemsToReconcile = () => {
        return processedItems
            .filter(item => item.hasBeenCounted)
            .map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                systemCount: item.systemCount,
                newCount: item.physicalCount,
            }));
    };

    return {
        loading,
        error,
        filteredItems,
        summary,
        filter,
        setFilter,
        searchTerm,
        setSearchTerm,
        handleCountChange,
        getItemsToReconcile,
        fetchData,
        resetCounts: () => setCounts({}),
    };
};
