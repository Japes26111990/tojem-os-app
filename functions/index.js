/**
 * TOJEM OS - Autopilot Engine (Firebase Cloud Functions)
 * This file contains all the necessary backend logic for the TOJEM OS.
 *
 * @version 3.0
 * @description Added secure, auditable callable functions for job adjustments
 * and customer orders. Implemented the real-time bottleneck analysis engine.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// =================================================================================================
// HELPER FUNCTIONS
// =================================================================================================

const calculateWorkdayHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const breakMinutes = 45;
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const workMinutes = Math.max(0, durationMinutes - breakMinutes);
  return workMinutes / 60;
};

// =================================================================================================
// AUTOPILOT AGENT 1: JOB & SCAN EVENT PROCESSING
// =================================================================================================

exports.processScanEventForStatusUpdate = functions.firestore
  .document("scanEvents/{eventId}")
  .onCreate(async (snap, context) => {
    const eventData = snap.data();
    const { jobId, statusUpdatedTo, haltReason, employeeName } = eventData;

    if (!jobId || !statusUpdatedTo) {
      console.log("Scan event is missing a jobId or new status. Exiting.");
      return null;
    }

    const q = db.collection("createdJobCards").where("jobId", "==", jobId).limit(1);
    
    try {
      const querySnapshot = await q.get();
      if (querySnapshot.empty) {
        console.error(`Could not find a job with jobId: ${jobId}`);
        return null;
      }

      const jobDoc = querySnapshot.docs[0];
      const jobRef = jobDoc.ref;
      const currentJobData = jobDoc.data();
      const dataToUpdate = { status: statusUpdatedTo };
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (statusUpdatedTo === "In Progress") {
        if (!currentJobData.startedAt) dataToUpdate.startedAt = now;
        if (currentJobData.status === "Paused" && currentJobData.pausedAt) {
          const pauseStartTime = currentJobData.pausedAt.toDate().getTime();
          const resumeTime = new Date().getTime();
          const pauseDuration = resumeTime - pauseStartTime;
          dataToUpdate.totalPausedMilliseconds = (currentJobData.totalPausedMilliseconds || 0) + pauseDuration;
        }
      }
      
      if (statusUpdatedTo === "Paused" || statusUpdatedTo === "Halted - Issue") {
        dataToUpdate.pausedAt = now;
      }
      
      if (statusUpdatedTo === "Awaiting QC") {
        if (!currentJobData.completedAt) dataToUpdate.completedAt = now;
      }

      if (statusUpdatedTo === "Halted - Issue") {
        dataToUpdate.issueReason = haltReason || "No reason provided.";
        await db.collection("notifications").add({
          type: "job_issue",
          message: `Job ${currentJobData.partName} (${jobId}) was halted by ${employeeName}.`,
          targetRole: "Manager",
          read: false,
          createdAt: now,
          jobId: jobId,
        });
      }
      
      await jobRef.update(dataToUpdate);
      return { success: true, jobId: jobId, newStatus: statusUpdatedTo };

    } catch (error) {
      console.error(`Failed to update job status for jobId: ${jobId}`, error);
      return null;
    }
  });

exports.calculateJobCostOnCompletion = functions.firestore
  .document("createdJobCards/{docId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (newData.status !== "Complete" || oldData.status === "Complete" || typeof newData.totalCost === "number") {
      return null;
    }

    const { employeeId, tools, processedConsumables, startedAt, completedAt, totalPausedMilliseconds } = newData;
    const materialCost = (processedConsumables || []).reduce((sum, c) => sum + (c.price || 0) * (c.quantity || 0), 0);
    let laborCost = 0;
    const employeeDoc = await db.collection("employees").doc(employeeId).get();
    if (employeeDoc.exists) {
        const directRate = employeeDoc.data().hourlyRate || 0;
        const overheadRate = 50; // Placeholder for dynamic overhead rate
        const burdenedRate = directRate + overheadRate;
        if (startedAt && completedAt) {
            const durationHours = (completedAt.toMillis() - startedAt.toMillis() - (totalPausedMilliseconds || 0)) / 3600000;
            if (durationHours > 0) laborCost = durationHours * burdenedRate;
        }
    }

    let machineCost = 0;
    if (tools && tools.length > 0 && startedAt && completedAt) {
        const durationHours = (completedAt.toMillis() - startedAt.toMillis() - (totalPausedMilliseconds || 0)) / 3600000;
        for (const tool of tools) {
            const toolDoc = await db.collection("tools").doc(tool.id).get();
            if (toolDoc.exists() && toolDoc.data().hourlyRate > 0) {
                machineCost += durationHours * toolDoc.data().hourlyRate;
            }
        }
    }

    return change.after.ref.update({
        materialCost,
        laborCost,
        machineCost,
        totalCost: materialCost + laborCost + machineCost,
    });
  });

// =================================================================================================
// AUTOPILOT AGENT 3: SECURE CALLABLE FUNCTIONS (NEW)
// =================================================================================================

/**
 * Securely adjusts a job card's details and logs the change.
 */
exports.updateJobCardWithAdjustments = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const { jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId } = data;
    
    const jobQuery = await db.collection("createdJobCards").where("jobId", "==", jobId).limit(1).get();
    if (jobQuery.empty) {
        throw new functions.https.HttpsError("not-found", `Job with ID ${jobId} not found.`);
    }
    const jobRef = jobQuery.docs[0].ref;

    await db.runTransaction(async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        const jobData = jobDoc.data();
        
        // Time Adjustment
        const newEstimatedTime = (jobData.estimatedTime || 0) + timeAdjustment;
        
        // Consumable Adjustment
        const newConsumables = [...(jobData.processedConsumables || [])];
        Object.entries(consumableAdjustments).forEach(([itemId, qtyChange]) => {
            const index = newConsumables.findIndex(c => c.id === itemId);
            if (index > -1) {
                newConsumables[index].quantity += qtyChange;
            } else {
                // This would require fetching item details; simplified for now.
                console.warn(`Cannot add new consumable '${itemId}' via adjustment yet.`);
            }
        });

        transaction.update(jobRef, {
            estimatedTime: newEstimatedTime,
            processedConsumables: newConsumables.filter(c => c.quantity > 0),
        });

        // Audit Log
        const auditLogRef = db.collection("auditLogs").doc();
        transaction.set(auditLogRef, {
            action: "job_adjustment",
            userId: userId,
            details: { jobId, timeAdjustment, consumableAdjustments, adjustmentReason },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { success: true };
});

/**
 * Securely submits a customer order, applies discounts, and creates related documents.
 */
exports.submitCustomerOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const { items, poNumber } = data;
    const clientUid = context.auth.uid;

    const userDoc = await db.collection("users").doc(clientUid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Client user document not found.");
    }
    const userData = userDoc.data();
    const discountPercentage = userData.discountPercentage || 0;

    // Calculate totals on the server to ensure accuracy
    const subtotal = items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    const discountAmount = subtotal * (discountPercentage / 100);
    const total = subtotal - discountAmount;

    const batch = db.batch();
    const salesOrderRef = db.collection("salesOrders").doc();
    const pickingListRef = db.collection("pickingLists").doc();
    
    const salesOrderData = {
        salesOrderId: `SO-${Date.now()}`,
        customerName: userData.companyName,
        customerEmail: userData.email,
        poNumber: poNumber,
        subtotal,
        discountAmount,
        total,
        status: "Pending Production",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lineItems: items.map(item => ({...item, id: db.collection("_").doc().id, status: "Pending"})),
    };
    batch.set(salesOrderRef, salesOrderData);

    // Create a picking list for items that are in stock
    const itemsToPick = items
        .filter(item => item.isCatalogItem) // Assuming catalog items are picked
        .map(item => ({ id: item.id, name: item.name, quantity: item.quantity, location: item.location || "N/A" }));

    if (itemsToPick.length > 0) {
        batch.set(pickingListRef, {
            salesOrderId: salesOrderData.salesOrderId,
            customerName: salesOrderData.customerName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "Pending",
            items: itemsToPick,
        });
    }

    await batch.commit();
    return { success: true, salesOrderId: salesOrderData.salesOrderId };
});


// =================================================================================================
// AUTOPILOT AGENT 4: SYSTEM BOTTLENECK ANALYSIS (NEW)
// Runs periodically to analyze the workshop floor and identify the primary constraint.
// =================================================================================================
exports.updateSystemStatus = functions.pubsub.schedule("every 5 minutes").onRun(async (context) => {
    console.log("Running system bottleneck analysis...");
    
    const [toolsSnapshot, jobsSnapshot] = await Promise.all([
        db.collection("tools").get(),
        db.collection("createdJobCards").where("status", "==", "In Progress").get(),
    ]);

    if (toolsSnapshot.empty || jobsSnapshot.empty) {
        return db.collection("systemStatus").doc("latest").set({
            bottleneckToolName: "N/A",
            bottleneckUtilization: 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    const toolCapacity = new Map();
    toolsSnapshot.forEach(doc => {
        const tool = doc.data();
        if (tool.capacityMinutesPerDay > 0) {
            toolCapacity.set(doc.id, {
                name: tool.name,
                capacity: tool.capacityMinutesPerDay,
                assignedMinutes: 0,
            });
        }
    });

    jobsSnapshot.forEach(doc => {
        const job = doc.data();
        (job.tools || []).forEach(toolInUse => {
            if (toolCapacity.has(toolInUse.id)) {
                // Approximate remaining time for utilization calculation
                const remainingTime = job.estimatedTime - ((new Date() - job.startedAt.toDate()) / 60000);
                toolCapacity.get(toolInUse.id).assignedMinutes += Math.max(0, remainingTime);
            }
        });
    });

    let bottleneckToolName = "None";
    let maxUtilization = 0;

    for (const [toolId, data] of toolCapacity.entries()) {
        const utilization = (data.assignedMinutes / data.capacity) * 100;
        if (utilization > maxUtilization) {
            maxUtilization = utilization;
            bottleneckToolName = data.name;
        }
    }

    return db.collection("systemStatus").doc("latest").set({
        bottleneckToolName: bottleneckToolName,
        bottleneckUtilization: maxUtilization,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
});

// =================================================================================================
// SECTION 5: PAYROLL & ATTENDANCE AUTOMATION (PRESERVED)
// =================================================================================================

exports.processScanEventForPayroll = functions.firestore.document("scanEvents/{eventId}").onCreate(async (snap) => {
    const eventData = snap.data();
    const { employeeId, employeeName, timestamp } = eventData;
    if (!employeeId || !timestamp) return null;
    const dateString = timestamp.toDate().toISOString().split("T")[0];
    const logDocRef = db.collection("employeeDailyLogs").doc(`${employeeId}_${dateString}`);
    const logDoc = await logDocRef.get();
    if (!logDoc.exists) {
        return logDocRef.set({ date: dateString, employeeId, employeeName, startTime: timestamp, endTime: timestamp, totalHours: 0, status: "pending" });
    } else {
        return logDocRef.update({ endTime: timestamp });
    }
});

exports.finalizeDailyLogs = functions.pubsub.schedule("every day 22:00").timeZone("Africa/Johannesburg").onRun(async () => {
    const dateString = new Date().toISOString().split("T")[0];
    const q = db.collection("employeeDailyLogs").where("date", "==", dateString).where("status", "==", "pending");
    const snapshot = await q.get();
    if (snapshot.empty) return null;
    const batch = db.batch();
    snapshot.forEach((doc) => {
        const log = doc.data();
        if (!log.startTime || !log.endTime) return;
        const totalHours = calculateWorkdayHours(log.startTime.toDate(), log.endTime.toDate());
        const status = totalHours < 1 ? "needs_review" : "finalized";
        batch.update(doc.ref, { totalHours, status });
    });
    return batch.commit();
});

// =================================================================================================
// SECTION 6: OTHER AUTOPILOT AGENTS (PRESERVED)
// =================================================================================================

exports.generatePutAwayJobCard = functions.firestore.document("createdJobCards/{jobId}").onUpdate(() => {
    console.log("generatePutAwayJobCard triggered.");
    return null;
});

exports.processPickingListCompletion = functions.firestore.document("pickingLists/{listId}").onUpdate(async (change) => {
    const newData = change.after.data();
    if (newData.status !== "Complete" || change.before.data().status === "Complete") return null;
    const { items } = newData;
    if (!items || items.length === 0) return null;

    const batch = db.batch();
    for (const item of items) {
        const productRef = db.collection("inventoryItems").doc(item.id);
        batch.update(productRef, { currentStock: admin.firestore.FieldValue.increment(-item.quantity) });
    }
    await batch.commit();

    for (const item of items) {
        const productRef = db.collection("inventoryItems").doc(item.id);
        const productDoc = await productRef.get();
        if (productDoc.exists) {
            const productData = productDoc.data();
            if (productData.currentStock < productData.reorderLevel) {
                const quantityToBuild = (productData.standardStockLevel || productData.reorderLevel) - productData.currentStock;
                const replenishmentJobData = {
                    jobId: `REP-${productDoc.id.substring(0, 5)}-${Date.now()}`,
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
                    priority: -1,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                await db.collection("createdJobCards").add(replenishmentJobData);
            }
        }
    }
    return { success: true };
});