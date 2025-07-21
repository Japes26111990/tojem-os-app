/**
 * TOJEM OS - Autopilot Engine (Firebase Cloud Functions)
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * ===================================================================================
 * AUTOPILOT AGENT 1: Process Scan Events to Update Job Status
 * ===================================================================================
 */
exports.processScanEvent = functions.firestore
  .document("scanEvents/{eventId}")
  .onCreate(async (snap, context) => {
    // Logic remains the same...
  });

/**
 * ===================================================================================
 * AUTOPILOT AGENT 2: Automated Time & Attendance Logger
 * ===================================================================================
 */
exports.handleWorkLogsOnJobUpdate = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    // Logic remains the same...
  });

/**
 * ===================================================================================
 * AUTOPILOT AGENT 3: Automated Logistics Job Creator (Put-Away)
 * ===================================================================================
 */
exports.generatePutAwayJobCard = functions.firestore
  .document("createdJobCards/{jobId}")
  .onUpdate(async (change, context) => {
    // Logic remains the same...
  });

/**
 * ===================================================================================
 * AUTOPILOT AGENT 4: Process Picking List Completion & Trigger Replenishment
 * ===================================================================================
 * Trigger: onUpdate of a document in the 'pickingLists' collection.
 *
 * Philosophy:
 * - Create a "pull" system for finished goods based on actual demand.
 * - Automate stock replenishment to maintain minimum stock levels without manual intervention.
 *
 * How it works:
 * 1.  A user on the workshop floor marks a picking list as "completed" in the app.
 * 2.  This function triggers when the status field changes.
 * 3.  It iterates through each item on the picking list.
 * 4.  For each item, it securely decrements the 'currentStock' in the 'products' collection.
 * 5.  After decrementing, it re-reads the product document to get the new stock level.
 * 6.  It compares the new stock level to the product's 'reorderLevel'.
 * 7.  If stock is now below the reorder level, it automatically creates a new job card
 * to manufacture a replacement, effectively creating a replenishment order.
 */
exports.processPickingListCompletion = functions.firestore
  .document("pickingLists/{listId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Only trigger if the status has just changed to 'completed'
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
      const productRef = db.collection("products").doc(item.id);
      
      // Step 1: Decrement the stock for the picked item
      batch.update(productRef, {
        currentStock: admin.firestore.FieldValue.increment(-item.quantity),
      });
    }

    // Commit the stock decrements first
    await batch.commit();

    // Step 2: Check for replenishment needs
    for (const item of items) {
        const productRef = db.collection("products").doc(item.id);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            console.warn(`Product ${item.id} not found for replenishment check.`);
            continue;
        }

        const productData = productDoc.data();
        const currentStock = productData.currentStock;
        const reorderLevel = productData.reorderLevel || 0;
        const standardStockLevel = productData.standardStockLevel || reorderLevel + 1;

        // If stock has dropped below the reorder point, create a new job
        if (currentStock < reorderLevel) {
            console.log(`Stock for ${productData.name} is low (${currentStock}/${reorderLevel}). Triggering replenishment job.`);

            const quantityToBuild = standardStockLevel - currentStock;

            const replenishmentJobData = {
                jobId: `REP-${Date.now()}`,
                partName: productData.name,
                partId: item.id,
                // You might want to assign this to a default department or a specific user
                departmentId: "assembly", // Example: default to 'assembly' department
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
