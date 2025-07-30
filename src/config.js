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

/**
 * Defines standard job statuses used throughout the application.
 * Centralizing these helps prevent typos and ensures consistency.
 */
export const JOB_STATUSES = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    PAUSED: 'Paused',
    AWAITING_QC: 'Awaiting QC',
    COMPLETE: 'Complete',
    ISSUE: 'Issue',
    HALTED_ISSUE: 'Halted - Issue',
    ARCHIVED_ISSUE: 'Archived - Issue',
    PRODUCT: 'Product', // Added for inventory categorization consistency
};

/**
 * Defines constants related to work hours and calculations.
 */
export const WORK_CONSTANTS = {
    WORK_HOURS_PER_DAY: 8,
    BREAK_MINUTES_PER_DAY: 45,
    AVG_HOURS_PER_MONTH: 173.2, // Average working hours in a month (40 hours/week * 52 weeks/year / 12 months/year)
};

/**
 * Defines standard system roles.
 */
export const SYSTEM_ROLES = {
    MANAGER: 'Manager',
    WORKSHOP_EMPLOYEE: 'Workshop Employee',
    CLIENT: 'Client',
    ADMIN: 'Admin', // Assuming an Admin role might exist or be needed
};

/**
 * Defines titles and labels for sales reports and comparisons.
 */
export const SALES_REPORT_TITLES = {
    CURRENT_MONTH_SALES_ACCOUNTING: "This Month's Sales (from Accounting)",
    VS_LAST_YEAR: "vs. Last Year",
    CURRENT_MONTH_SALES_LIVE: "This Month's Sales (Live)",
};
