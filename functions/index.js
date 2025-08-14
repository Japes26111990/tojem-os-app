/**
 * TOJEM OS - Autopilot Engine (Firebase Cloud Functions)
 * This file contains all the necessary backend logic for the TOJEM OS.
 *
 * @version 3.2
 * @description Integrated the Kaizen Autopilot agent to automatically detect and suggest
 * process improvements based on real-world job performance.
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
// AUTOPILOT AGENT 3: SECURE CALLABLE FUNCTIONS
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
        
        const newEstimatedTime = (jobData.estimatedTime || 0) + timeAdjustment;
        
        const newConsumables = [...(jobData.processedConsumables || [])];
        Object.entries(consumableAdjustments).forEach(([itemId, qtyChange]) => {
            const index = newConsumables.findIndex(c => c.id === itemId);
            if (index > -1) {
                newConsumables[index].quantity += qtyChange;
            } else {
                console.warn(`Cannot add new consumable '${itemId}' via adjustment yet.`);
            }
        });

        transaction.update(jobRef, {
            estimatedTime: newEstimatedTime,
            processedConsumables: newConsumables.filter(c => c.quantity > 0),
        });

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

    const itemsToPick = items
        .filter(item => item.isCatalogItem)
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
// AUTOPILOT AGENT 4: SYSTEM BOTTLENECK ANALYSIS
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
// SECTION 5: AUTOMATED TIME & ATTENDANCE
// Replaces the old per-scan and 10pm finalizer functions with a single, accurate nightly process.
// =================================================================================================
exports.dailyAttendanceProcessor = functions.pubsub.schedule("every day 00:10").timeZone("Africa/Johannesburg").onRun(async (context) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const startOfDay = new Date(yesterdayStr + "T00:00:00.000Z");
    const endOfDay = new Date(yesterdayStr + "T23:59:59.999Z");

    console.log(`Processing scan events for attendance on: ${yesterdayStr}`);

    const scanEventsSnapshot = await db.collection("scanEvents")
        .where("timestamp", ">=", startOfDay)
        .where("timestamp", "<=", endOfDay)
        .get();

    if (scanEventsSnapshot.empty) {
        console.log("No scan events found for yesterday. Exiting attendance processing.");
        return null;
    }

    // Group scans by employee to find first and last scan
    const scansByEmployee = {};
    scanEventsSnapshot.forEach(doc => {
        const event = doc.data();
        if (!event.employeeId) return;

        if (!scansByEmployee[event.employeeId]) {
            scansByEmployee[event.employeeId] = {
                employeeId: event.employeeId,
                employeeName: event.employeeName,
                scans: [],
            };
        }
        scansByEmployee[event.employeeId].scans.push(event.timestamp.toDate());
    });

    const batch = db.batch();

    for (const employeeId in scansByEmployee) {
        const employeeData = scansByEmployee[employeeId];
        // We need at least two scans (a start and an end) to calculate a duration
        if (employeeData.scans.length < 2) continue;

        employeeData.scans.sort((a, b) => a - b); // Sort timestamps chronologically

        const startTime = employeeData.scans[0];
        const endTime = employeeData.scans[employeeData.scans.length - 1];
        
        // Use the existing helper function to calculate the hours worked
        const totalHours = calculateWorkdayHours(startTime, endTime);

        // Create or update a document in the `employeeDailyLogs` collection
        const logDocId = `${employeeId}_${yesterdayStr}`;
        const logDocRef = db.collection("employeeDailyLogs").doc(logDocId);

        const logData = {
            employeeId: employeeId,
            employeeName: employeeData.employeeName,
            date: yesterdayStr,
            startTime: admin.firestore.Timestamp.fromDate(startTime),
            endTime: admin.firestore.Timestamp.fromDate(endTime),
            totalHours: totalHours,
            status: "finalized", // Mark this log as complete
        };
        
        batch.set(logDocRef, logData, { merge: true });
    }

    await batch.commit();
    console.log(`Successfully processed attendance for ${Object.keys(scansByEmployee).length} employees.`);
    return null;
});

// =================================================================================================
// SECTION 6: OTHER AUTOPILOT AGENTS
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

// =================================================================================================
// AUTOPILOT AGENT 7: KAIZEN AUTOPILOT (NEW)
// Automatically analyzes completed jobs to find opportunities for improving standard recipes.
// =================================================================================================
exports.analyzeCompletedJobForKaizen = functions.firestore
  .document("createdJobCards/{docId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Trigger only when a job is marked as "Complete"
    if (newData.status !== "Complete" || oldData.status === "Complete") {
      return null;
    }

    // Ensure the job has the necessary data for analysis
    if (!newData.partId || !newData.departmentId || !newData.estimatedTime || !newData.startedAt || !newData.completedAt) {
      console.log(`Job ${newData.jobId} is missing data for Kaizen analysis.`);
      return null;
    }

    // Calculate actual duration in minutes
    const durationMillis = newData.completedAt.toMillis() - newData.startedAt.toMillis() - (newData.totalPausedMilliseconds || 0);
    const actualMinutes = durationMillis / 60000;

    if (actualMinutes <= 0) return null;

    // Check for significant improvement (e.g., more than 15% faster)
    const efficiencyRatio = newData.estimatedTime / actualMinutes;
    if (efficiencyRatio < 1.15) {
      console.log(`Job ${newData.jobId} did not show significant time improvement (${efficiencyRatio.toFixed(2)}x). No action needed.`);
      return null;
    }

    // --- Verification Step ---
    // Check the last 3 completed jobs for the same part to ensure this isn't a one-off fluke.
    const recentJobsSnapshot = await db.collection("createdJobCards")
      .where("partId", "==", newData.partId)
      .where("departmentId", "==", newData.departmentId)
      .where("status", "==", "Complete")
      .orderBy("completedAt", "desc")
      .limit(3)
      .get();

    if (recentJobsSnapshot.size < 3) {
        console.log(`Not enough historical data for ${newData.partName} to confirm a trend.`);
        return null;
    }

    let consistentImprovement = true;
    recentJobsSnapshot.forEach(doc => {
        const job = doc.data();
        if(!job.startedAt || !job.completedAt || !job.estimatedTime) {
            consistentImprovement = false;
            return;
        }
        const pastDurationMillis = job.completedAt.toMillis() - job.startedAt.toMillis() - (job.totalPausedMilliseconds || 0);
        const pastActualMinutes = pastDurationMillis / 60000;
        if (pastActualMinutes <= 0 || (job.estimatedTime / pastActualMinutes) < 1.10) {
            consistentImprovement = false;
        }
    });

    if (!consistentImprovement) {
        console.log(`Improvement for ${newData.partName} is not consistent. Holding off on suggestion.`);
        return null;
    }

    // Create a new, system-generated Kaizen suggestion
    const suggestionText = `Consistently completing this job faster than the standard. Standard time is ${newData.estimatedTime} min, but recent jobs averaged ~${Math.round(actualMinutes)} min. Recommend updating the standard recipe.`;

    await db.collection("kaizenSuggestions").add({
        jobId: change.after.id,
        jobIdentifier: newData.jobId,
        partName: newData.partName,
        suggestionText: suggestionText,
        submittedBy: "Kaizen Autopilot",
        userId: "system",
        status: "new",
        type: "system_generated", // Differentiates it from manual suggestions
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Kaizen Autopilot created an improvement suggestion for ${newData.partName}.`);
    return { success: true };
  });