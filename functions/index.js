// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Define overdue thresholds in minutes
const OVERDUE_THRESHOLDS = [0, 5, 10, 30]; // Immediately, 5 mins, 10 mins, 30 mins overdue

/**
 * Helper function to calculate job duration in minutes.
 * Handles both Firestore Timestamp and JS Date for the `currentTime` parameter.
 */
function calculateJobDurationInMinutes(jobData, currentTime) {
    if (!jobData.startedAt) return null;

    let durationSeconds;
    const startTimeMillis = jobData.startedAt.toDate().getTime();
    const pausedMilliseconds = jobData.totalPausedMilliseconds || 0;

    // Convert currentTime to milliseconds if it's a Firestore Timestamp
    const currentTimeMillis = (currentTime instanceof admin.firestore.Timestamp) ? currentTime.toDate().getTime() : currentTime.getTime();

    if (['Complete', 'Awaiting QC', 'Issue', 'Archived - Issue'].includes(jobData.status)) {
        if (!jobData.completedAt) return null;
        durationSeconds = (jobData.completedAt.toDate().getTime() - startTimeMillis - pausedMilliseconds) / 1000;
    } else if (jobData.status === 'In Progress') {
        durationSeconds = (currentTimeMillis - startTimeMillis - pausedMilliseconds) / 1000;
    } else if (jobData.status === 'Paused' && jobData.pausedAt) {
        durationSeconds = (jobData.pausedAt.toDate().getTime() - startTimeMillis - pausedMilliseconds) / 1000;
    } else {
        return null;
    }
    
    return durationSeconds > 0 ? (durationSeconds / 60) : 0; // Return 0 if negative or no duration
}


// --- MAIN JOB CARD NOTIFICATIONS ---
exports.sendJobStatusNotification = functions.runWith({ runtime: 'nodejs18' }).firestore
    .document('createdJobCards/{jobId}')
    .onUpdate(async (change, context) => {
        const oldData = change.before.data();
        const newData = change.after.data();
        const jobId = context.params.jobId;
        const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
        const serverCurrentTime = admin.firestore.Timestamp.now();

        const notificationsRef = admin.firestore().collection('notifications');
        const targetRole = 'Manager';

        // --- 1. Notification for Awaiting QC ---
        if (newData.status === 'Awaiting QC' && oldData.status !== 'Awaiting QC') {
            const notificationMessage = `Job ${newData.jobId} (${newData.partName}) has been completed and is now AWAITING QC!`;
            await notificationsRef.add({
                message: notificationMessage,
                type: 'qc_awaiting',
                jobId: newData.jobId,
                partName: newData.partName,
                createdAt: serverTimestamp,
                read: false,
                targetRole: targetRole,
            });
            console.log(`Notification: Job ${newData.jobId} is Awaiting QC.`);
        }

        // --- 2. Notification for Job with Issue ---
        if (newData.status === 'Issue' && oldData.status !== 'Issue') {
            const notificationMessage = `Job ${newData.jobId} (${newData.partName}) has an ISSUE: ${newData.issueReason || 'No reason provided.'}`;
            await notificationsRef.add({
                message: notificationMessage,
                type: 'job_issue',
                jobId: newData.jobId,
                partName: newData.partName,
                issueReason: newData.issueReason,
                createdAt: serverTimestamp,
                read: false,
                targetRole: targetRole,
            });
            console.log(`Notification: Job ${newData.jobId} has an Issue.`);
        }

        // --- 3. Notification for Tiered Job Over Estimated Time ---
        const oldLastOverdueThreshold = oldData.lastOverdueNotificationSentMinutes || -1;
        const newLastOverdueThreshold = newData.lastOverdueNotificationSentMinutes || -1;

        if (
            newData.estimatedTime > 0 &&
            newData.startedAt &&
            ['In Progress', 'Paused', 'Awaiting QC', 'Complete'].includes(newData.status)
        ) {
            const actualDurationMinutes = calculateJobDurationInMinutes(newData, serverCurrentTime);

            if (actualDurationMinutes !== null && actualDurationMinutes > newData.estimatedTime) {
                let thresholdToNotify = -1;
                for (const threshold of OVERDUE_THRESHOLDS) {
                    if (actualDurationMinutes >= (newData.estimatedTime + threshold) && threshold > oldLastOverdueThreshold) {
                        thresholdToNotify = threshold;
                    }
                }

                if (thresholdToNotify !== -1) {
                    const overdueByMinutes = Math.round(actualDurationMinutes - newData.estimatedTime);
                    const notificationMessage = `Job ${newData.jobId} (${newData.partName}) is now OVERDUE by ${overdueByMinutes} minutes (Threshold: +${thresholdToNotify}min)!`;
                    
                    await notificationsRef.add({
                        message: notificationMessage,
                        type: 'job_overdue',
                        jobId: newData.jobId,
                        partName: newData.partName,
                        overdueByMinutes: overdueByMinutes,
                        threshold: thresholdToNotify,
                        createdAt: serverTimestamp,
                        read: false,
                        targetRole: targetRole,
                    });
                    console.log(`Notification: Job ${newData.jobId} is overdue by ${overdueByMinutes} mins, notified for threshold +${thresholdToNotify}min.`);

                    await admin.firestore().collection('createdJobCards').doc(jobId).update({
                        lastOverdueNotificationSentMinutes: thresholdToNotify
                    });
                }
            }
        } else if (newData.lastOverdueNotificationSentMinutes !== -1) {
            if (!['In Progress', 'Paused', 'Awaiting QC', 'Complete', 'Issue', 'Archived - Issue'].includes(newData.status) || newData.estimatedTime === 0 || newData.status === 'Complete') {
                 await admin.firestore().collection('createdJobCards').doc(jobId).update({
                    lastOverdueNotificationSentMinutes: -1
                });
                console.log(`Reset overdue tracking for job ${newData.jobId}`);
            }
        }

        return null;
    });


// --- LOW STOCK NOTIFICATIONS FOR INVENTORY COLLECTIONS ---

const inventoryCollections = ['components', 'rawMaterials', 'workshopSupplies'];
const NOTIFICATION_DEBOUNCE_HOURS = 24; // Only send low stock notification once every X hours for the same item

inventoryCollections.forEach(collectionName => {
    exports[`sendLowStockNotification_${collectionName}`] = functions.runWith({ runtime: 'nodejs18' }).firestore
        .document(`${collectionName}/{itemId}`)
        .onUpdate(async (change, context) => {
            const oldData = change.before.data();
            const newData = change.after.data();
            const itemId = context.params.itemId;
            const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

            const notificationsRef = admin.firestore().collection('notifications');
            const targetRole = 'Manager';

            if (
                newData.reorderLevel > 0 &&
                newData.currentStock <= newData.reorderLevel
            ) {
                const wasBelowBefore = (oldData.reorderLevel > 0 && oldData.currentStock <= oldData.reorderLevel);
                const lastNotifiedAt = newData.lastLowStockNotificationSent?.toDate();

                const now = new Date();
                const shouldNotify = (
                    (!wasBelowBefore && newData.currentStock < oldData.currentStock) ||
                    (wasBelowBefore && (!lastNotifiedAt || (now.getTime() - lastNotifiedAt.getTime()) / (1000 * 60 * 60) >= NOTIFICATION_DEBOUNCE_HOURS))
                );

                if (shouldNotify) {
                    const notificationMessage = `LOW STOCK ALERT: ${newData.name} (${newData.itemCode || 'N/A'}) - only ${newData.currentStock} ${newData.unit} left! Reorder level: ${newData.reorderLevel}.`;
                    
                    await notificationsRef.add({
                        message: notificationMessage,
                        type: 'low_stock',
                        itemId: itemId,
                        itemName: newData.name,
                        currentStock: newData.currentStock,
                        reorderLevel: newData.reorderLevel,
                        createdAt: serverTimestamp,
                        read: false,
                        targetRole: targetRole,
                    });
                    console.log(`Notification: Low stock for ${newData.name}.`);

                    await admin.firestore().collection(collectionName).doc(itemId).update({
                        lastLowStockNotificationSent: serverTimestamp
                    });
                }
            }
            return null;
        });
});

// --- USER MANAGEMENT CLOUD FUNCTIONS ---

// Function to create a new Firebase Auth user and set their role in Firestore
exports.createUserAndSetRole = functions.runWith({ runtime: 'nodejs18' }).https.onCall(async (data, context) => {
    // Ensure the caller is authenticated and has the 'Manager' role
    if (!context.auth || context.auth.token.role !== 'Manager') {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Only managers can create new users.'
        );
    }

    const email = data.email;
    const password = data.password;
    const role = data.role;

    if (!email || !password || !role) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Email, password, and role are required.'
        );
    }

    try {
        // 1. Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: true // You might want to set this to false and implement email verification
        });

        // 2. Create user document in Firestore with role
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            email: email,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Set custom claims (optional, but good for fine-grained security rules)
        // await admin.auth().setCustomUserClaims(userRecord.uid, { role: role });
        // Note: Custom claims propagate to the client ID token on next login/refresh.
        // For simplicity, we are relying on the Firestore 'users' document for role check.

        return { uid: userRecord.uid, email: userRecord.email, role: role, message: 'User created successfully.' };

    } catch (error) {
        console.error("Error creating user:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new functions.https.HttpsError('already-exists', 'The email address is already in use by another account.');
        }
        throw new functions.https.HttpsError('internal', 'Failed to create user: ' + error.message);
    }
});

// Function to delete a Firebase Auth user and their Firestore user document
exports.deleteUserAndRole = functions.runWith({ runtime: 'nodejs18' }).https.onCall(async (data, context) => {
    // Ensure the caller is authenticated and has the 'Manager' role
    // And prevent managers from deleting themselves!
    if (!context.auth || context.auth.token.role !== 'Manager') {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Only managers can delete users.'
        );
    }

    const userIdToDelete = data.userId;

    if (!userIdToDelete) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'User ID is required.'
        );
    }

    // Prevent a user from deleting their own account (unless explicit flow is designed)
    if (context.auth.uid === userIdToDelete) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Managers cannot delete their own account through this interface.'
        );
    }

    try {
        // 1. Delete user document from Firestore
        await admin.firestore().collection('users').doc(userIdToDelete).delete();

        // 2. Delete Firebase Auth user
        await admin.auth().deleteUser(userIdToDelete);

        return { userId: userIdToDelete, message: 'User deleted successfully.' };

    } catch (error) {
        console.error("Error deleting user:", error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'User not found in Firebase Authentication.');
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete user: ' + error.message);
    }
});
