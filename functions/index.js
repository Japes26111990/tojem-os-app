const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Define overdue thresholds in minutes
const OVERDUE_THRESHOLDS = [0, 5, 10, 30];

/**
 * Helper function to calculate job duration in minutes.
 */
function calculateJobDurationInMinutes(jobData, currentTime) {
    if (!jobData.startedAt) return null;
    const startTimeMillis = jobData.startedAt.toDate().getTime();
    const pausedMilliseconds = jobData.totalPausedMilliseconds || 0;
    const currentTimeMillis = (currentTime instanceof admin.firestore.Timestamp) ? currentTime.toDate().getTime() : new Date(currentTime).getTime();

    let endTimeMillis;
    if (['Complete', 'Awaiting QC', 'Issue', 'Archived - Issue'].includes(jobData.status)) {
        if (!jobData.completedAt) return null;
        endTimeMillis = jobData.completedAt.toDate().getTime();
    } else if (jobData.status === 'In Progress') {
        endTimeMillis = currentTimeMillis;
    } else if (jobData.status === 'Paused' && jobData.pausedAt) {
        endTimeMillis = jobData.pausedAt.toDate().getTime();
    } else {
        return null;
    }
    
    const durationSeconds = (endTimeMillis - startTimeMillis - pausedMilliseconds) / 1000;
    return durationSeconds > 0 ? (durationSeconds / 60) : 0;
}


// --- MAIN JOB CARD NOTIFICATIONS ---
exports.sendJobStatusNotification = functions.runWith({ runtime: 'nodejs18' }).firestore
    .document('createdJobCards/{jobId}')
    .onUpdate(async (change, context) => {
        const oldData = change.before.data();
        const newData = change.after.data();
        const jobId = context.params.jobId;
        const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
        const notificationsRef = admin.firestore().collection('notifications');
        const targetRole = 'Manager';
        const jobCardRef = admin.firestore().collection('createdJobCards').doc(jobId);

        // --- Notification for Awaiting QC ---
        if (newData.status === 'Awaiting QC' && oldData.status !== 'Awaiting QC') {
            const notificationMessage = `Job ${newData.jobId} (${newData.partName}) has been completed and is now AWAITING QC!`;
            await notificationsRef.add({
                message: notificationMessage, type: 'qc_awaiting', jobId: newData.jobId,
                partName: newData.partName, createdAt: serverTimestamp, read: false, targetRole: targetRole,
            });
            console.log(`Notification: Job ${newData.jobId} is Awaiting QC.`);
        }

        // --- Notification for Job with Issue ---
        if (newData.status === 'Issue' && oldData.status !== 'Issue') {
            const notificationMessage = `Job ${newData.jobId} (${newData.partName}) has an ISSUE: ${newData.issueReason || 'No reason provided.'}`;
            await notificationsRef.add({
                message: notificationMessage, type: 'job_issue', jobId: newData.jobId,
                partName: newData.partName, issueReason: newData.issueReason, createdAt: serverTimestamp, read: false, targetRole: targetRole,
            });
            console.log(`Notification: Job ${newData.jobId} has an Issue.`);
        }

        // --- Overdue Job Check ---
        const isRelevantForOverdueCheck = newData.estimatedTime > 0 && newData.startedAt && ['In Progress', 'Paused'].includes(newData.status);
        if (isRelevantForOverdueCheck) {
            const actualDurationMinutes = calculateJobDurationInMinutes(newData, new Date());
            if (actualDurationMinutes !== null && actualDurationMinutes > newData.estimatedTime) {
                const oldLastOverdueThreshold = oldData.lastOverdueNotificationSentMinutes || -1;
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
                        message: notificationMessage, type: 'job_overdue', jobId: newData.jobId, partName: newData.partName,
                        overdueByMinutes: overdueByMinutes, threshold: thresholdToNotify, createdAt: serverTimestamp, read: false, targetRole: targetRole,
                    });
                    await jobCardRef.update({ lastOverdueNotificationSentMinutes: thresholdToNotify });
                    console.log(`Notification sent for overdue job ${newData.jobId} at threshold ${thresholdToNotify}`);
                }
            }
        }
        
        // --- Reset overdue tracking if job is completed or has an issue ---
        const needsReset = ['Complete', 'Issue', 'Archived - Issue'].includes(newData.status) && oldData.status !== newData.status;
        if (needsReset && (newData.lastOverdueNotificationSentMinutes || 0) > -1) {
            await jobCardRef.update({ lastOverdueNotificationSentMinutes: -1 });
            console.log(`Reset overdue tracking for job ${newData.jobId}`);
        }
    });


// --- LOW STOCK NOTIFICATIONS ---
const inventoryCollections = ['components', 'rawMaterials', 'workshopSupplies'];
const NOTIFICATION_DEBOUNCE_HOURS = 24;
inventoryCollections.forEach(collectionName => {
    exports[`sendLowStockNotification_${collectionName}`] = functions.runWith({ runtime: 'nodejs18' }).firestore
        .document(`${collectionName}/{itemId}`)
        .onUpdate(async (change, context) => {
            const oldData = change.before.data();
            const newData = change.after.data();
            if (newData.reorderLevel > 0 && newData.currentStock < newData.reorderLevel) {
                const lastNotifiedAt = newData.lastLowStockNotificationSent?.toDate();
                if (!lastNotifiedAt || (new Date().getTime() - lastNotifiedAt.getTime()) / 36e5 >= NOTIFICATION_DEBOUNCE_HOURS) {
                    const notificationMessage = `LOW STOCK ALERT: ${newData.name} - only ${newData.currentStock} left!`;
                    await admin.firestore().collection('notifications').add({
                        message: notificationMessage, type: 'low_stock',
                        itemId: context.params.itemId, itemName: newData.name,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(), read: false, targetRole: 'Manager',
                    });
                    await change.after.ref.update({ lastLowStockNotificationSent: admin.firestore.FieldValue.serverTimestamp() });
                }
            }
        });
});

// --- USER MANAGEMENT CLOUD FUNCTIONS ---
exports.createUserAndSetRole = functions.runWith({ runtime: 'nodejs18' }).https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'Manager') {
        throw new functions.https.HttpsError('unauthenticated', 'Only managers can create new users.');
    }
    const { email, password, role } = data;
    if (!email || !password || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'Email, password, and role are required.');
    }
    try {
        const userRecord = await admin.auth().createUser({ email, password, emailVerified: true });
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            email, role, createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { uid: userRecord.uid, email, role, message: 'User created successfully.' };
    } catch (error) {
        console.error("Error creating user:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new functions.https.HttpsError('already-exists', 'The email address is already in use.');
        }
        throw new functions.https.HttpsError('internal', 'Failed to create user: ' + error.message);
    }
});
exports.deleteUserAndRole = functions.runWith({ runtime: 'nodejs18' }).https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'Manager') {
        throw new functions.https.HttpsError('unauthenticated', 'Only managers can delete users.');
    }
    const { userId } = data;
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required.');
    }
    if (context.auth.uid === userId) {
        throw new functions.https.HttpsError('permission-denied', 'Managers cannot delete their own account.');
    }
    try {
        await admin.firestore().collection('users').doc(userId).delete();
        await admin.auth().deleteUser(userId);
        return { userId, message: 'User deleted successfully.' };
    } catch (error) {
        console.error("Error deleting user:", error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'User not found in Firebase Authentication.');
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete user: ' + error.message);
    }
});


// --- PREDICTIVE ALERT FUNCTION ---
exports.checkJobPacing = functions.pubsub.schedule("every 60 minutes").onRun(async (context) => {
    const db = admin.firestore();
    const now = new Date();
    const inProgressJobsSnapshot = await db.collection("createdJobCards").where("status", "==", "In Progress").get();
    if (inProgressJobsSnapshot.empty) {
        console.log("No jobs in progress. Exiting pacing check.");
        return null;
    }
    const notificationsCollection = db.collection("notifications");
    for (const doc of inProgressJobsSnapshot.docs) {
        const job = doc.data();
        const jobId = job.jobId || doc.id;
        if (!job.estimatedTime || !job.startedAt || !job.steps || job.steps.length === 0) {
            continue;
        }
        const timeElapsedMinutes = (now.getTime() - job.startedAt.toDate().getTime()) / 60000;
        const timeElapsedPercent = (timeElapsedMinutes / job.estimatedTime) * 100;
        const progressPercent = ((job.completedSteps || 0) / job.steps.length) * 100;

        if (timeElapsedPercent > 75 && progressPercent < 50) {
            const existingNotifQuery = await notificationsCollection.where("jobId", "==", jobId).where("type", "==", "job_at_risk").limit(1).get();
            if (existingNotifQuery.empty) {
                const notification = {
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    message: `Warning: Job ${jobId} (${job.partName}) is pacing behind schedule.`,
                    type: "job_at_risk",
                    targetRole: "Manager",
                    jobId: jobId,
                    read: false,
                };
                await notificationsCollection.add(notification);
                console.log(`Notification created for at-risk job: ${jobId}`);
            }
        }
    }
    return null;
});
