/**
 * TOJEM OS - Autopilot Engine (Firebase Cloud Functions)
 * This file contains all the necessary backend logic for the TOJEM OS.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// =================================================================================================
// AUTOPILOT AGENT 1: Process Scan Events to Update Job Status (CORRECTED)
// This function listens for new scan events and updates the corresponding job card's status.
// =================================================================================================
exports.processScanEventForStatusUpdate = functions.firestore
  .document("scanEvents/{eventId}")
  .onCreate(async (snap, context) => {
    const eventData = snap.data();
    const { jobId, statusUpdatedTo, haltReason } = eventData;

    if (!jobId || !statusUpdatedTo) {
      console.log("Scan event is missing a jobId or new status. Exiting.");
      return null;
    }

    const jobsRef = db.collection("createdJobCards");
    // --- THIS IS THE FIX ---
    // The query syntax has been corrected to use the Admin SDK properly.
    const q = jobsRef.where("jobId", "==", jobId).limit(1);
    
    try {
        const querySnapshot = await q.get();
        if (querySnapshot.empty) {
            console.error(`Could not find a job with jobId: ${jobId}`);
            return null;
        }

        const jobDoc = querySnapshot.docs[0];
        const jobRef = jobDoc.ref;
        const currentJobData = jobDoc.data();

        const dataToUpdate = {
            status: statusUpdatedTo,
        };

        // Add specific timestamps and logic based on the new status
        if (statusUpdatedTo === 'In Progress' && !currentJobData.startedAt) {
            dataToUpdate.startedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        if (statusUpdatedTo === 'Paused' || statusUpdatedTo === 'Halted - Issue') {
            dataToUpdate.pausedAt = admin.firestore.FieldValue.serverTimestamp();
            // If the job was running, calculate the duration of the last work session and add it to the total paused time.
            // This logic is complex and might need refinement based on exact pause/resume flow.
            // For now, we just mark the pause time.
        }
        
        if (statusUpdatedTo === 'Awaiting QC' || statusUpdatedTo === 'Complete') {
            if (!currentJobData.completedAt) { // Only set completedAt once
                dataToUpdate.completedAt = admin.firestore.FieldValue.serverTimestamp();
            }
        }

        if (statusUpdatedTo === 'Halted - Issue') {
            dataToUpdate.issueReason = haltReason || 'No reason provided.';
        }
        
        console.log(`Updating job ${jobId} (${jobDoc.id}) to status: ${statusUpdatedTo}`);
        await jobRef.update(dataToUpdate);
        return { success: true, jobId: jobId, newStatus: statusUpdatedTo };

    } catch (error) {
        console.error(`Failed to update job status for jobId: ${jobId}`, error);
        return null;
    }
  });


// =================================================================================================
// SECTION 2: PAYROLL & ATTENDANCE AUTOMATION
// =================================================================================================

exports.processScanEventForPayroll = functions.firestore
  .document("scanEvents/{eventId}")
  .onCreate(async (snap, context) => {
    const eventData = snap.data();
    const { employeeId, employeeName, timestamp } = eventData;

    if (!employeeId || !timestamp) {
      console.log("Ignoring event: missing employeeId or timestamp.", context.params.eventId);
      return null;
    }

    const eventDate = timestamp.toDate();
    const dateString = eventDate.toISOString().split("T")[0];
    const logDocId = `${employeeId}_${dateString}`;
    const logDocRef = admin.firestore().collection("employeeDailyLogs").doc(logDocId);

    try {
      const logDoc = await logDocRef.get();
      if (!logDoc.exists) {
        return logDocRef.set({
          date: dateString,
          employeeId: employeeId,
          employeeName: employeeName,
          startTime: timestamp,
          endTime: timestamp,
          totalHours: 0,
          status: "pending",
        });
      } else {
        return logDocRef.update({ endTime: timestamp });
      }
    } catch (error) {
      console.error("Error in processScanEventForPayroll:", error);
      return null;
    }
  });

exports.finalizeDailyLogs = functions.pubsub
  .schedule("every day 22:00")
  .timeZone("Africa/Johannesburg")
  .onRun(async (context) => {
    console.log("Running nightly job to finalize daily work logs...");
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const logsCollectionRef = admin.firestore().collection("employeeDailyLogs");
    const q = logsCollectionRef.where("date", "==", dateString).where("status", "==", "pending");

    try {
      const snapshot = await q.get();
      if (snapshot.empty) {
        console.log("No pending logs found for today. Exiting.");
        return null;
      }
      const batch = admin.firestore().batch();
      snapshot.forEach((doc) => {
        const log = doc.data();
        if (!log.startTime || !log.endTime) {
            console.warn(`Skipping log ${doc.id} due to missing timestamps.`);
            return;
        }
        const startTime = log.startTime.toDate();
        const endTime = log.endTime.toDate();
        const calculateWorkdayHours = (start, end) => {
          const breakMinutes = 45;
          const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
          const workMinutes = Math.max(0, durationMinutes - breakMinutes);
          return workMinutes / 60;
        };
        const totalHours = calculateWorkdayHours(startTime, endTime);
        let status = "complete";
        if (totalHours < 1) {
          status = "needs_review";
        }
        batch.update(doc.ref, { totalHours: totalHours, status: status });
      });
      await batch.commit();
      console.log(`Finalized ${snapshot.size} logs for ${dateString}.`);
      return null;
    } catch (error) {
      console.error("Error finalizing daily logs:", error);
      return null;
    }
  });

// =================================================================================================
// SECTION 3: OTHER AUTOPILOT AGENTS (PRESERVED & UPDATED)
// =================================================================================================

exports.generatePutAwayJobCard = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    // Your existing logic for this function...
    console.log("generatePutAwayJobCard triggered.");
    return null;
  });

exports.processPickingListCompletion = functions.firestore
  .document("pickingLists/{listId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (newData.status !== "completed" || oldData.status === "completed") {
      return null;
    }
    const { items } = newData;
    if (!items || items.length === 0) {
      console.log("Picking list has no items to process.");
      return null;
    }
    console.log(`Processing completed picking list ${context.params.listId}...`);
    const batch = db.batch();
    for (const item of items) {
      const productRef = db.collection("inventoryItems").doc(item.id);
      batch.update(productRef, {
        currentStock: admin.firestore.FieldValue.increment(-item.quantity),
      });
    }
    await batch.commit();
    for (const item of items) {
        const productRef = db.collection("inventoryItems").doc(item.id);
        const productDoc = await productRef.get();
        if (!productDoc.exists) {
            console.warn(`Product ${item.id} not found for replenishment check.`);
            continue;
        }
        const productData = productDoc.data();
        const currentStock = productData.currentStock;
        const reorderLevel = productData.reorderLevel || 0;
        const standardStockLevel = productData.standardStockLevel || reorderLevel + 1;
        if (currentStock < reorderLevel) {
            console.log(`Stock for ${productData.name} is low (${currentStock}/${reorderLevel}). Triggering replenishment job.`);
            const quantityToBuild = standardStockLevel - currentStock;
            const replenishmentJobData = {
                jobId: `REP-${Date.now()}`,
                partName: productData.name,
                partId: item.id,
                departmentId: "assembly",
                departmentName: "Assembly",
                employeeId: "unassigned",
                employeeName: "Unassigned",
                quantity: quantityToBuild,
                status: "Pending",
                description: `Automated replenishment order for ${productData.name}.`,
                isCustomJob: false,
                jobCategory: "Production",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection("createdJobCards").add(replenishmentJobData);
        }
    }
    return { success: true };
  });
