import { calculateJobDuration } from './jobUtils';

// Helper to create mock date objects from seconds for consistent testing
const createTimestamp = (seconds) => ({ seconds, toDate: () => new Date(seconds * 1000) });

describe('calculateJobDuration', () => {

    const MOCK_CURRENT_TIME = new Date('2025-07-07T16:00:00Z').getTime(); // A fixed point in time for live calculations

    test('should return null if job has not started', () => {
        const job = { status: 'Pending' };
        expect(calculateJobDuration(job, MOCK_CURRENT_TIME)).toBeNull();
    });

    test('should calculate duration for a simple completed job', () => {
        const job = {
            status: 'Complete',
            startedAt: createTimestamp(1720360800), // 14:00:00 UTC
            completedAt: createTimestamp(1720364400) // 15:00:00 UTC
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('60m 0s');
        expect(duration.totalMinutes).toBe(60);
    });

    test('should calculate duration for an active "In Progress" job', () => {
        const job = {
            status: 'In Progress',
            startedAt: createTimestamp(1720366800) // 15:40:00 UTC
        };
        // MOCK_CURRENT_TIME is 16:00:00 UTC, so duration should be 20 minutes
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('20m 0s');
        expect(duration.totalMinutes).toBe(20);
    });

    test('should correctly subtract paused time from a completed job', () => {
        const job = {
            status: 'Complete',
            startedAt: createTimestamp(1720360800), // 14:00:00 UTC
            completedAt: createTimestamp(1720364400), // 15:00:00 UTC
            totalPausedMilliseconds: 600000 // 10 minutes
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('50m 0s');
        expect(duration.totalMinutes).toBe(50);
    });
    
    test('should calculate duration correctly for a job that is currently paused', () => {
        const job = {
            status: 'Paused',
            startedAt: createTimestamp(1720364400), // 15:00:00 UTC
            pausedAt: createTimestamp(1720366200), // 15:30:00 UTC
            totalPausedMilliseconds: 0
        };
        const duration = calculateJobDuration(job, MOCK_CURRENT_TIME);
        // --- MODIFICATION: Updated expectation to include seconds ---
        expect(duration.text).toBe('30m 0s');
        expect(duration.totalMinutes).toBe(30);
    });

    test('should return null for jobs with inconsistent timestamps', () => {
        const job = {
            status: 'Complete',
            startedAt: createTimestamp(1720364400), // 15:00:00 UTC
            completedAt: createTimestamp(1720360800) // 14:00:00 UTC (completed before started)
        };
        expect(calculateJobDuration(job, MOCK_CURRENT_TIME)).toBeNull();
    });
});