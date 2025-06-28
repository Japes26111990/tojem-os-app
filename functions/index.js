const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.updateJobCardWithAdjustments = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to make adjustments.');
    }

    const { jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId } = data;

    if (!jobId) {
        throw new functions.https.HttpsError('invalid-argument', 'Job ID is required.');
    }
    if (!adjustmentReason || adjustmentReason.trim() === '') {
        throw new functions.https.HttpsError('invalid-argument', 'Adjustment reason is required.');
    }

    const db = admin.firestore();
    const jobDocRef = db.collection('createdJobCards').doc(jobId);
    const inventoryCollections = ['components', 'rawMaterials', 'workshopSupplies'];
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    try {
        await db.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobDocRef);
            if (!jobDoc.exists) {
                throw new functions.https.HttpsError('not-found', `No job found with ID: ${jobId}`);
            }
            const jobData = jobDoc.data();

            // Update time taken
            const newActualTimeTaken = (jobData.newActualTimeTaken || jobData.estimatedTime || 0) + timeAdjustment;
            batch.update(jobDocRef, {
                newActualTimeTaken: newActualTimeTaken,
                lastAdjustedAt: now,
                adjustmentReason: adjustmentReason,
                adjustmentAuditLog: admin.firestore.FieldValue.arrayUnion({
                    adjustedBy: userId,
                    adjustedAt: now,
                    timeAdjustment: timeAdjustment,
                    consumableAdjustments: consumableAdjustments,
                    reason: adjustmentReason,
                }),
            });

            // Update consumables used
            if (consumableAdjustments) {
                for (const itemId in consumableAdjustments) {
                    const qtyChange = consumableAdjustments[itemId];
                    if (qtyChange !== 0) {
                        let inventoryCollectionName = null;
                        let inventoryDocRef = null;

                        for (const collectionName of inventoryCollections) {
                            const docRef = db.collection(collectionName).doc(itemId);
                            const docSnap = await transaction.get(docRef);
                            if (docSnap.exists) {
                                inventoryCollectionName = collectionName;
                                inventoryDocRef = docRef;
                                break;
                            }
                        }

                        if (inventoryDocRef) {
                            const inventoryDoc = await transaction.get(inventoryDocRef);
                            if (inventoryDoc.exists) {
                                const currentQuantity = inventoryDoc.data().currentStock || 0;
                                const newQuantity = currentQuantity - qtyChange;
                                transaction.update(inventoryDocRef, { currentStock: newQuantity });

                                // Add to stock transaction log
                                const logDocRef = db.collection('stockTransactionLog').doc();
                                batch.set(logDocRef, {
                                    itemId: itemId,
                                    itemName: inventoryDoc.data().name,
                                    transactionType: qtyChange > 0 ? 'out' : 'in',
                                    quantity: Math.abs(qtyChange),
                                    timestamp: now,
                                    reason: `Job Adjustment - ${jobId}`,
                                    adjustedBy: userId,
                                    currentStockLevel: newQuantity,
                                });
                            } else {
                                console.warn(`Inventory item not found: ${itemId}`);
                            }
                        } else {
                            console.warn(`Inventory item with ID ${itemId} not found in any inventory collection.`);
                        }
                    }
                }

                // Update consumablesUsedActual in the job card
                const updatedConsumables = {};
                const initialConsumables = jobData.consumablesUsedInitial || {};
                for (const itemId in initialConsumables) {
                    updatedConsumables[itemId] = (updatedConsumables[itemId] || 0) + initialConsumables[itemId];
                }
                for (const itemId in consumableAdjustments) {
                    updatedConsumables[itemId] = (updatedConsumables[itemId] || 0) + consumableAdjustments[itemId];
                }
                batch.update(jobDocRef, { consumablesUsedActual: updatedConsumables });
            }
        });

        await batch.commit();
        return { success: true, message: `Job card ${jobId} adjusted successfully.` };

    } catch (error) {
        console.error('Error in updateJobCardWithAdjustments transaction:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});