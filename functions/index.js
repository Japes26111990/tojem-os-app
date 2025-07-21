/**
 * TOJEM OS - Autopilot Engine (Firebase Cloud Functions)
 *
 * This file contains the backend logic that automates key operational processes.
 * These functions are triggered by events in the Firestore database, allowing the
 * system to react intelligently without human intervention.
 *
 * @version 1.0.0
 * @author TOJEM Development
 */

// Import Firebase Functions and Admin SDK modules
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * ===================================================================================
 * AUTOPILOT AGENT 1: Process Scan Events to Update Job Status
 * ===================================================================================
 * Trigger: onCreate of any document in the 'scanEvents' collection.
 *
 * Philosophy:
 * - This function acts as the secure gatekeeper for all job status changes.
 * - The frontend logs an "intent" to change status by creating a scanEvent.
 * - This backend function validates and executes the change with admin privileges.
 *
 * How it works:
 * 1.  A new document is created in 'scanEvents' from the Scanner or Kanban board.
 * 2.  This function is triggered with the data from that event.
 * 3.  It finds the corresponding job card in the 'createdJobCards' collection.
 * 4.  It constructs the correct update payload, including timestamps for starting,
 * pausing, or completing the job.
 * 5.  It securely updates the job card's status.
 */
exports.processScanEvent = functions.firestore
  .document("scanEvents/{eventId}")
  .onCreate(async (snap, context) => {
    const eventData = snap.data();
    const { jobId, statusUpdatedTo, haltReason } = eventData;

    if (!jobId) {
      console.error("Scan event is missing a jobId.", eventData);
      return null;
    }

    // Find the document reference in createdJobCards using the jobId field
    const jobsRef = db.collection("createdJobCards");
    const q = jobsRef.where("jobId", "==", jobId).limit(1);
    const jobSnapshot = await q.get();

    if (jobSnapshot.empty) {
      console.error(`No job found with jobId: ${jobId}`);
      return null;
    }

    const jobDoc = jobSnapshot.docs[0];
    const jobRef = jobDoc.ref;
    const currentData = jobDoc.data();

    const dataToUpdate = { status: statusUpdatedTo };

    if (statusUpdatedTo === "In Progress") {
      if (!currentData.startedAt) {
        dataToUpdate.startedAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (currentData.status === "Paused" && currentData.pausedAt) {
        const pausedAtMillis = currentData.pausedAt.toMillis();
        const nowMillis = new Date().getTime();
        dataToUpdate.totalPausedMilliseconds = admin.firestore.FieldValue.increment(nowMillis - pausedAtMillis);
        dataToUpdate.pausedAt = null;
      }
    } else if (statusUpdatedTo === "Paused") {
      dataToUpdate.pausedAt = admin.firestore.FieldValue.serverTimestamp();
    } else if (statusUpdatedTo === "Awaiting QC") {
      dataToUpdate.completedAt = admin.firestore.FieldValue.serverTimestamp();
    } else if (statusUpdatedTo === "Halted - Issue") {
      dataToUpdate.haltedAt = admin.firestore.FieldValue.serverTimestamp();
      dataToUpdate.issueLog = [
        ...(currentData.issueLog || []),
        {
          reason: haltReason,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          user: eventData.employeeName || "SYSTEM",
        },
      ];
      // Create a notification for management
      const notificationRef = db.collection("notifications").doc();
      const notificationData = {
        message: `Job ${currentData.jobId} (${currentData.partName}) was halted. Reason: ${haltReason}`,
        type: "job_halted",
        targetRole: "Manager",
        jobId: currentData.jobId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      };
      await notificationRef.set(notificationData);
    }

    console.log(`Processing event: Updating job ${jobId} to status ${statusUpdatedTo}`);
    return jobRef.update(dataToUpdate);
  });


/**
 * ===================================================================================
 * AUTOPILOT AGENT 2: Automated Time & Attendance Logger
 * ===================================================================================
 */
exports.handleWorkLogsOnJobUpdate = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const employeeId = newData.employeeId;
    const employeeName = newData.employeeName;
    const status = newData.status;

    if (!employeeId || employeeId === "unassigned") return null;

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const logId = `${employeeId}_${dateStr}`;
    const workLogRef = db.collection("dailyWorkLogs").doc(logId);

    if (status === "In Progress") {
      const workLogDoc = await workLogRef.get();
      if (!workLogDoc.exists) {
        console.log(`Clocking IN ${employeeName} for ${dateStr}`);
        return workLogRef.set({
          employeeId, employeeName, date: dateStr,
          startTime: now, endTime: null, totalHours: 0,
        });
      }
    }

    const isStopEvent = ["Paused", "Awaiting QC", "Complete", "Issue", "Halted - Issue"].includes(status);
    if (isStopEvent) {
      const workLogDoc = await workLogRef.get();
      if (workLogDoc.exists) {
        const logData = workLogDoc.data();
        const startTime = logData.startTime.toDate();
        const breakMinutes = 45;
        const durationMillis = now.getTime() - startTime.getTime();
        const durationMinutes = Math.max(0, durationMillis / (1000 * 60));
        const workMinutes = Math.max(0, durationMinutes - breakMinutes);
        const totalHours = workMinutes / 60;
        console.log(`Updating Clock OUT for ${employeeName} to ${now}.`);
        return workLogRef.update({ endTime: now, totalHours: totalHours });
      }
    }
    return null;
  });

/**
 * ===================================================================================
 * AUTOPILOT AGENT 3: Automated Logistics Job Creator (Put-Away)
 * ===================================================================================
 */
exports.generatePutAwayJobCard = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    const isNowComplete = newData.status === "Complete" && oldData.status !== "Complete";
    if (!isNowComplete || !newData.partId) return null;

    try {
      const productDoc = await db.collection("products").doc(newData.partId).get();
      if (!productDoc.exists) return null;

      const productData = productDoc.data();
      const { location, shelf_number, shelf_level } = productData;
      if (!location || !shelf_number) return null;

      const description = `Move ${newData.quantity} x "${productData.name}" to Location: ${location}, Shelf: ${shelf_number}, Level: ${shelf_level || "N/A"}`;
      const putAwayJobData = {
        jobId: `LOG-${Date.now()}`,
        partName: `Put-Away: ${productData.name}`,
        partId: newData.partId,
        departmentId: "logistics",
        departmentName: "Logistics",
        employeeId: newData.employeeId,
        employeeName: newData.employeeName,
        quantity: newData.quantity,
        status: "Pending",
        description: description,
        estimatedTime: 15,
        steps: [
          `1. Collect ${newData.quantity} x "${productData.name}" from QC area.`,
          `2. Transport to storage location: ${location}.`,
          `3. Place on Shelf ${shelf_number}, Level ${shelf_level || "any"}.`,
          `4. Scan this card to confirm completion.`,
        ],
        isCustomJob: false,
        jobCategory: "Logistics",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      console.log(`Generating put-away job for ${productData.name}.`);
      await db.collection("createdJobCards").add(putAwayJobData);
      return { success: true };
    } catch (error) {
      console.error("Error in generatePutAwayJobCard:", error);
      return { success: false, error: error.message };
    }
  });
