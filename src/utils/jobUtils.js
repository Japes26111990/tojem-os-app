// src/utils/jobUtils.js

import { CATALYST_RULES } from '../config';

/**
 * Processes raw recipe consumables into a display-friendly format, calculating catalyst additions.
 * This centralized function ensures consistent consumable processing across the app.
 * @param {Array} consumablesFromRecipe - The raw consumables array from a job or recipe.
 * @param {Array} allInventoryItems - The master list of all inventory items.
 * @param {number} temperature - The current temperature for catalyst calculation.
 * @returns {Array} A list of processed consumables ready for display or costing.
 */
export const processConsumables = (consumablesFromRecipe, allInventoryItems, temperature) => {
    if (!consumablesFromRecipe || !Array.isArray(consumablesFromRecipe)) return [];

    const processedList = [];
    const catalystItem = allInventoryItems.find(c => c.name.toLowerCase().includes('catalyst') || c.name.toLowerCase().includes('hardener'));

    for (const consumable of consumablesFromRecipe) {
        // Find the full details from the master inventory list using either itemId (from recipe) or id (from inventory)
        const masterItem = allInventoryItems.find(c => c.id === (consumable.itemId || consumable.id));
        const itemDetails = masterItem || consumable;
        if (!itemDetails) continue;

        if (consumable.type === 'fixed') {
            processedList.push({ ...itemDetails, quantity: consumable.quantity, notes: '' });
            if (itemDetails.requiresCatalyst && catalystItem && temperature) {
                let percentage = 0;
                for (const rule of CATALYST_RULES) {
                    if (temperature <= rule.temp_max) {
                        percentage = rule.percentage;
                        break;
                    }
                }
                if (percentage > 0) {
                    const calculatedQty = consumable.quantity * (percentage / 100);
                    processedList.push({ ...catalystItem, quantity: calculatedQty, notes: `(Auto-added at ${percentage}% for ${temperature}°C)` });
                }
            }
        } else if (consumable.type === 'dimensional') {
            processedList.push({ ...itemDetails, cuts: consumable.cuts, notes: `See ${consumable.cuts.length} cutting instruction(s)` });
        } else if (!consumable.type && consumable.quantity) {
            // This handles cases where old data might not have a 'type' but has a quantity
            processedList.push({ ...itemDetails, notes: '' });
        }
    }
    return processedList;
};

/**
 * Calculates the duration of a job.
 * @param {Object} job - The job object from Firestore.
 * @param {number} currentTime - The current time (Date.now()) for live calculation.
 * @returns {{text: string, totalMinutes: number} | null} - The formatted duration and total minutes, or null.
 */
export const calculateJobDuration = (job, currentTime) => {
    if (!job.startedAt) return null;

    let durationSeconds;
    const startTime = job.startedAt.seconds * 1000;
    const pausedMilliseconds = job.totalPausedMilliseconds || 0;

    // Determine the end time based on job status
    if (['Complete', 'Awaiting QC', 'Issue', 'Archived - Issue'].includes(job.status)) {
        // For completed/finalized jobs, use the completedAt timestamp
        if (!job.completedAt) return null;
        durationSeconds = (job.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
    } else if (job.status === 'In Progress') {
        // For active jobs, use the current time
        durationSeconds = (currentTime - startTime - pausedMilliseconds) / 1000;
    } else if (job.status === 'Paused' && job.pausedAt) {
        // For paused jobs, use the pausedAt timestamp
        durationSeconds = (job.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
    } else {
        // For other statuses (e.g., Pending or unexpected), duration is not calculable yet
        return null;
    }
    
    // Ensure duration is not negative in case of data inconsistencies
    if (durationSeconds < 0) return null;

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);

    return { text: `${minutes}m ${seconds}s`, totalMinutes: durationSeconds / 60 };
};
