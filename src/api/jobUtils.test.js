// src/utils/jobUtils.test.js

/**
 * @jest-environment node
 */
import { calculateJobDuration } from '../utils/jobUtils'; // Corrected import path

// Helper to create mock Firestore Timestamp-like objects
const createTimestamp = (seconds) => ({ 
    seconds, 
    nanoseconds: 0,
    toDate: () => new Date(seconds * 1000) 
});

describe('calculateJobDuration', () => {
    // A fixed point in time for live calculations, in milliseconds.
    const MOCK_CURRENT_TIME = new Date('2025-07-07T16:00:00Z').getTime();

    test('should return null if job has not started', () => {
        const job = { status: 'Pending' };
        expect(calculateJobDuration(job, MOCK_CURRENT_TIME)).toBeNull();
    });

    test('should calculate duration for a simple completed job', () => {
        const job = {
            status: 'Complete',
            startedAt: createTimestamp(1720360800), // 14:00:00Z
            completedAt: createTimestamp(1720364400) // 15:00:00Z
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('60m 0s'); 
        expect(duration.totalMinutes).toBe(60);
    });

    test('should calculate duration for an active "In Progress" job', () => {
        const job = {
            status: 'In Progress',
            startedAt: createTimestamp(1720366800) // 15:40:00Z
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('20m 0s'); 
        expect(duration.totalMinutes).toBe(20);
    });

    test('should correctly subtract paused time from a completed job', () => {
        const job = {
            status: 'Complete',
            startedAt: createTimestamp(1720360800), // 14:00:00Z (60 mins gross)
            completedAt: createTimestamp(1720364400), // 15:00:00Z
            totalPausedMilliseconds: 600000 // 10 minutes pause
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation (60 - 10 = 50) ---
        expect(duration.text).toBe('50m 0s');
        expect(duration.totalMinutes).toBe(50);
    });
    
    test('should calculate duration correctly for a job that is currently paused', () => {
        const job = {
            status: 'Paused',
            startedAt: createTimestamp(1720364400), // 15:00:00Z
            pausedAt: createTimestamp(1720366200), // 15:30:00Z (Paused after 30 mins)
            totalPausedMilliseconds: 0 
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('30m 0s');
        expect(duration.totalMinutes).toBe(30);
    });

    test('should return null for jobs with inconsistent timestamps (completed before started)', () => {
        const job = {
            status: 'Complete',
            startedAt: createTimestamp(1720364400), // 15:00:00Z
            completedAt: createTimestamp(1720360800) // 14:00:00Z
        };
        expect(calculateJobDuration(job, MOCK_CURRENT_TIME)).toBeNull();
    });
});