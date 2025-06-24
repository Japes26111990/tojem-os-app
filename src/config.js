// src/config.js

/**
 * Defines the rules for calculating the percentage of catalyst needed based on ambient temperature.
 * This central configuration makes it easy to adjust business rules without changing component logic.
 */
export const CATALYST_RULES = [
    { temp_max: 18, percentage: 3.0 },
    { temp_max: 28, percentage: 2.0 },
    { temp_max: 100, percentage: 1.0 }
];