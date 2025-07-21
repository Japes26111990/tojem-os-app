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
 * AUTOPILOT AGENT 1: Automated Time & Attendance Logger
 * ===================================================================================
 * Trigger: onUpdate of any document in the 'createdJobCards' collection.
 *
 * Philosophy:
 * - First Principles (Elon Musk): Why do we need manual timesheets? We don't.
 * The system should know when work starts and stops based on actual production activity.
 *
 * How it works:
 * 1.  When a job's status changes, this function activates.
 * 2.  It checks if the status is 'In Progress' (a start event) or a terminal status
 * like 'Complete', 'Awaiting QC', 'Paused' (a stop event).
 * 3.  It identifies the employee and the current date.
 * 4.  For a "start event", it checks if a work log for that employee for today exists.
 * If not, it creates one, effectively CLOCKING THEM IN at the time of their first scan.
 * 5.  For any "stop event", it updates the same work log with the current time as the
 * 'endTime'. This happens on every stop scan, ensuring the final scan of the day
 * becomes the official CLOCK OUT time.
 * 6.  It also calculates the total workday hours, excluding a standard break.
 */
exports.handleWorkLogsOnJobUpdate = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    const employeeId = newData.employeeId;
    const employeeName = newData.employeeName;
    const status = newData.status;
    const oldStatus = oldData.status;

    // Exit if there's no employee or the status hasn't changed to a relevant one
    if (!employeeId || employeeId === "unassigned" || status === oldStatus) {
      return null;
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // e.g., "2025-07-21"
    const logId = `${employeeId}_${dateStr}`;
    const workLogRef = db.collection("dailyWorkLogs").doc(logId);

    // --- CLOCK IN LOGIC ---
    if (status === "In Progress") {
      const workLogDoc = await workLogRef.get();
      if (!workLogDoc.exists) {
        // First scan of the day, create the log and clock them in
        console.log(`Clocking IN ${employeeName} (${employeeId}) for ${dateStr}`);
        return workLogRef.set({
          employeeId,
          employeeName,
          date: dateStr,
          startTime: now, // First scan time is the clock-in time
          endTime: null, // End time is null until a stop scan
          totalHours: 0,
        });
      }
    }

    // --- CLOCK OUT & DURATION LOGIC ---
    // Any status that signifies work has stopped for this job
    const isStopEvent = [
      "Paused",
      "Awaiting QC",
      "Complete",
      "Issue",
      "Halted - Issue",
    ].includes(status);

    if (isStopEvent) {
      const workLogDoc = await workLogRef.get();
      if (workLogDoc.exists) {
        const logData = workLogDoc.data();
        const startTime = logData.startTime.toDate();
        const breakMinutes = 45; // Standard break time

        const durationMillis = now.getTime() - startTime.getTime();
        const durationMinutes = Math.max(0, durationMillis / (1000 * 60));
        const workMinutes = Math.max(0, durationMinutes - breakMinutes);
        const totalHours = workMinutes / 60;

        console.log(`Updating Clock OUT for ${employeeName} to ${now}. Total hours: ${totalHours.toFixed(2)}`);
        return workLogRef.update({
          endTime: now, // Update on every stop scan
          totalHours: totalHours,
        });
      }
    }

    return null; // No action needed for other status changes
  });


/**
 * ===================================================================================
 * AUTOPILOT AGENT 2: Automated Logistics Job Creator (Put-Away)
 * ===================================================================================
 * Trigger: onUpdate of a document in 'createdJobCards' when status becomes 'Complete'.
 *
 * Philosophy:
 * - First Principles (Elon Musk): Why should a manager create a job to shelve a part?
 * The system knows the part is finished; it should create the task itself.
 * - Lean / TPS (Toyota): Reduce waste of motion and waiting. The next step in the
 * value stream is automatically queued.
 *
 * How it works:
 * 1.  When a job's status changes from anything to 'Complete', this function runs.
 * 2.  It checks if the job was for a manufactured 'Product' (not a component or supply).
 * 3.  It fetches the completed product's details from the 'products' collection.
 * 4.  It reads the product's storage address (location, shelf_number, shelf_level).
 * 5.  It creates a brand new job card with the category "Logistics", instructing the
 * same employee to move the finished part to its designated home.
 */
exports.generatePutAwayJobCard = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Trigger condition: Job is for a product and just moved to 'Complete'
    const isNowComplete = newData.status === "Complete" && oldData.status !== "Complete";
    const isProduct = newData.partId && newData.departmentId; // Basic check if it's a manufactured item

    if (!isNowComplete || !isProduct) {
      return null;
    }

    try {
      const productRef = db.collection("products").doc(newData.partId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        console.log(`Product ${newData.partId} not found. Cannot create put-away job.`);
        return null;
      }

      const productData = productDoc.data();
      const { location, shelf_number, shelf_level } = productData;

      if (!location || !shelf_number) {
        console.log(`Product ${productData.name} has no storage location defined. Skipping put-away job.`);
        return null;
      }

      const putAwayJobId = `LOG-${Date.now()}`;
      const description = `Move ${newData.quantity} x "${productData.name}" to Location: ${location}, Shelf: ${shelf_number}, Level: ${shelf_level || "N/A"}`;

      const putAwayJobData = {
        jobId: putAwayJobId,
        partName: `Put-Away: ${productData.name}`,
        partId: newData.partId,
        departmentId: "logistics", // A designated ID for logistics/internal movement
        departmentName: "Logistics",
        employeeId: newData.employeeId, // Assign to the same employee who finished the job
        employeeName: newData.employeeName,
        quantity: newData.quantity,
        status: "Pending",
        description: description,
        estimatedTime: 15, // A default time for put-away tasks
        steps: [
          `1. Collect ${newData.quantity} x "${productData.name}" from QC area.`,
          `2. Transport to storage location: ${location}.`,
          `3. Place on Shelf ${shelf_number}, Level ${shelf_level || "any"}.`,
          `4. Scan this card to confirm completion.`,
        ],
        tools: [],
        accessories: [],
        processedConsumables: [],
        isCustomJob: false,
        jobCategory: "Logistics", // A new category to distinguish these tasks
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      console.log(`Generating put-away job for ${productData.name}.`);
      await db.collection("createdJobCards").add(putAwayJobData);
      return { success: true, newJobId: putAwayJobId };

    } catch (error) {
      console.error("Error generating put-away job:", error);
      return { success: false, error: error.message };
    }
  });
