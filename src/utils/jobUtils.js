// src/utils/jobUtils.js

import { CATALYST_RULES, JOB_STATUSES } from '../config'; // Import JOB_STATUSES

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
            processedList.push({ ...itemDetails, notes: '' });
        }
    }
    return processedList;
};

/**
 * Calculates the duration of a job, accounting for pauses.
 * @param {Object} job - The job object from Firestore.
 * @param {number} currentTime - The current time (Date.now()) for live calculation.
 * @returns {{text: string, totalMinutes: number} | null} - The formatted duration and total minutes, or null.
 */
export const calculateJobDuration = (job, currentTime) => {
    if (!job.startedAt || typeof job.startedAt.seconds === 'undefined') return null; // Ensure startedAt and its seconds property exist

    let durationSeconds;
    const startTime = job.startedAt.seconds * 1000;
    const pausedMilliseconds = job.totalPausedMilliseconds || 0;

    // Use JOB_STATUSES constants for consistency
    if ([JOB_STATUSES.COMPLETE, JOB_STATUSES.AWAITING_QC, JOB_STATUSES.ISSUE, JOB_STATUSES.ARCHIVED_ISSUE].includes(job.status)) {
        if (!job.completedAt || typeof job.completedAt.seconds === 'undefined') return null; // Ensure completedAt and its seconds property exist
        durationSeconds = (job.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
    } else if (job.status === JOB_STATUSES.IN_PROGRESS) {
        durationSeconds = (currentTime - startTime - pausedMilliseconds) / 1000;
    } else if (job.status === JOB_STATUSES.PAUSED && job.pausedAt && typeof job.pausedAt.seconds !== 'undefined') {
        durationSeconds = (job.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
    } else {
        return null;
    }
    
    if (durationSeconds < 0) return null;

    const totalMinutes = durationSeconds / 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    let text = '';
    if (hours > 0) text += `${hours}h `;
    text += `${minutes}m`;

    return { text, totalMinutes };
};

