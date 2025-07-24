// src/api/firestore.js (FULLY REFACTORED & CORRECTED)
// This version re-introduces any missing functions like `getPurchaseQueue`
// to ensure full compatibility with all components, while keeping the unified inventory system.

import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    where,
    getDoc,
    writeBatch,
    setDoc,
    runTransaction,
    increment,
    limit,
    startAfter
} from 'firebase/firestore';
import { db, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

// =================================================================================================
// UNIFIED INVENTORY API
// =================================================================================================

const inventoryCollection = collection(db, 'inventoryItems');

/**
 * Fetches all items from the unified inventory. Can be filtered by category.
 * @param {string} [category] - Optional category to filter by (e.g., 'Product', 'Component').
 * @returns {Promise<Array>} A promise that resolves to an array of inventory items.
 */
export const getAllInventoryItems = async (category) => {
    let q = inventoryCollection;
    if (category) {
        q = query(inventoryCollection, where('category', '==', category));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Adds a new item to the inventory. The category must be specified in the data.
 * @param {Object} itemData - The data for the new inventory item, including a 'category' field.
 * @returns {Promise} A promise that resolves when the item is added.
 */
export const addInventoryItem = (itemData) => {
    if (!itemData.category) {
        return Promise.reject(new Error("Item data must include a 'category' field."));
    }
    return addDoc(inventoryCollection, { ...itemData, createdAt: serverTimestamp() });
};

/**
 * Updates an existing inventory item.
 * @param {string} itemId - The ID of the item to update.
 * @param {Object} updatedData - The data to update.
 * @returns {Promise}
 */
export const updateInventoryItem = (itemId, updatedData) => {
    const itemDoc = doc(db, 'inventoryItems', itemId);
    const { id, ...dataToSave } = updatedData;
    return updateDoc(itemDoc, dataToSave);
};

/**
 * Deletes an inventory item and all its associated supplier pricing.
 * @param {string} itemId - The ID of the item to delete.
 * @returns {Promise}
 */
export const deleteInventoryItem = async (itemId) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'inventoryItems', itemId));
    const pricingSnapshot = await getDocs(query(collection(db, 'supplierItemPricing'), where('itemId', '==', itemId)));
    pricingSnapshot.forEach(priceDoc => batch.delete(priceDoc.ref));
    return batch.commit();
};

/**
 * Finds a single inventory item by its unique itemCode.
 * @param {string} itemCode - The unique item code to search for.
 * @returns {Promise<Object>} The found inventory item.
 */
export const findInventoryItemByItemCode = async (itemCode) => {
    if (!itemCode) throw new Error("Item code is required.");
    const q = query(inventoryCollection, where("itemCode", "==", itemCode), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        throw new Error(`No inventory item found with code: ${itemCode}`);
    }
    const itemDoc = querySnapshot.docs[0];
    return { id: itemDoc.id, ...itemDoc.data() };
};

/**
 * Updates stock level based on a weight measurement.
 * @param {string} itemId - The ID of the item.
 * @param {number} grossWeight - The gross weight measured.
 * @returns {Promise<Object>}
 */
export const updateStockByWeight = async (itemId, grossWeight) => {
    if (!itemId || isNaN(parseFloat(grossWeight))) {
        throw new Error("Item ID and a valid gross weight are required.");
    }
    const itemRef = doc(db, 'inventoryItems', itemId);
    return runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) throw new Error("Inventory item not found.");
        
        const itemData = itemDoc.data();
        const tareWeight = parseFloat(itemData.tareWeight) || 0;
        const unitWeight = parseFloat(itemData.unitWeight) || 1;
        if (unitWeight <= 0) throw new Error("Item has an invalid unit weight of zero or less.");

        const netWeight = parseFloat(grossWeight) - tareWeight;
        const newQuantity = Math.round(netWeight / unitWeight);
        if (newQuantity < 0) throw new Error("Calculated quantity is negative. Please check weights.");
        
        transaction.update(itemRef, { currentStock: newQuantity });
        return { newQuantity };
    });
};

// =================================================================================================
// ALL OTHER APIs
// =================================================================================================

// --- SCAN EVENTS ---
export const logScanEvent = (jobData, newStatus, options = {}) => {
    const { haltReason = null } = options;
    const eventData = {
        employeeId: jobData.employeeId,
        employeeName: jobData.employeeName,
        jobId: jobData.jobId,
        statusUpdatedTo: newStatus,
        timestamp: serverTimestamp(),
        notes: haltReason ? `Halted: ${haltReason}` : `Status changed to ${newStatus}`,
        haltReason: haltReason,
    };
    return addDoc(collection(db, 'scanEvents'), eventData);
};

// --- KAIZEN & PRAISE ---
export const addKaizenSuggestion = (suggestionData) => addDoc(collection(db, 'kaizenSuggestions'), { ...suggestionData, createdAt: serverTimestamp(), status: 'new' });
export const addPraise = (praiseData) => addDoc(collection(db, 'praise'), { ...praiseData, createdAt: serverTimestamp() });
export const listenToPraiseForEmployee = (employeeId, callback) => {
    const q = query(collection(db, 'praise'), where('recipientId', '==', employeeId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
};

// --- SYSTEM STATUS ---
export const listenToSystemStatus = (callback) => {
    const statusDocRef = doc(db, 'systemStatus', 'latest');
    return onSnapshot(statusDocRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        } else {
            callback({ bottleneckToolName: 'N/A', bottleneckUtilization: 0 });
        }
    });
};

// --- DEPARTMENTS ---
export const getDepartments = async () => getDocs(collection(db, 'departments')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addDepartment = (departmentName) => addDoc(collection(db, 'departments'), { name: departmentName, requiredSkills: [] });
export const deleteDepartment = (departmentId) => deleteDoc(doc(db, 'departments', departmentId));
export const updateDepartmentRequiredSkills = async (departmentId, requiredSkillsData) => {
    const departmentDocRef = doc(db, 'departments', departmentId);
    const filteredSkillsData = requiredSkillsData.filter(skill =>
        skill.minimumProficiency > 0 || skill.importanceWeight > 0
    );
    return updateDoc(departmentDocRef, { requiredSkills: filteredSkillsData });
};
export const getDepartmentSkills = async (departmentId) => {
    if (!departmentId) return [];
    const departmentDocRef = doc(db, 'departments', departmentId);
    const departmentDoc = await getDoc(departmentDocRef);
    if (departmentDoc.exists()) {
        const data = departmentDoc.data();
        return data.requiredSkills || [];
    }
    return [];
};

// --- SKILLS ---
export const getSkills = async () => getDocs(query(collection(db, 'skills'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addSkill = (skillName) => addDoc(collection(db, 'skills'), { name: skillName });
export const updateSkill = (skillId, updatedData) => updateDoc(doc(db, 'skills', skillId), updatedData);
export const deleteSkill = (skillId) => deleteDoc(doc(db, 'skills', skillId));
export const getSkillHistoryForEmployee = async (employeeId) => {
    const q = query(collection(db, 'skillHistory'), where('employeeId', '==', employeeId));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};

// --- TOOLS & ACCESSORIES ---
export const getTools = async () => getDocs(collection(db, 'tools')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addTool = (toolData) => addDoc(collection(db, 'tools'), { ...toolData, associatedSkills: toolData.associatedSkills || [] });
export const deleteTool = (toolId) => deleteDoc(doc(db, 'tools', toolId));
export const getToolAccessories = async () => getDocs(collection(db, 'toolAccessories')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addToolAccessory = (accessoryData) => addDoc(collection(db, 'toolAccessories'), { ...accessoryData, associatedSkills: accessoryData.associatedSkills || [] });
export const deleteToolAccessory = (accessoryId) => deleteDoc(doc(db, 'toolAccessories', accessoryId));

// --- EMPLOYEES ---
export const getEmployees = async () => getDocs(collection(db, 'employees')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addEmployee = (employeeData) => addDoc(collection(db, 'employees'), employeeData);
export const deleteEmployee = (employeeId) => deleteDoc(doc(db, 'employees', employeeId));
export const getEmployeeSkills = async (employeeId) => {
    const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
    return employeeDoc.exists() ? (employeeDoc.data().skills || {}) : {};
};
export const updateEmployeeSkillsAndLogHistory = async (employee, skillsData, allSkills) => {
    const batch = writeBatch(db);
    const filteredSkillsData = {};
    for (const skillId in skillsData) {
        if (skillsData[skillId] > 0) filteredSkillsData[skillId] = skillsData[skillId];
    }
    batch.update(doc(db, 'employees', employee.id), { skills: filteredSkillsData });
    const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));
    for (const skillId in filteredSkillsData) {
        const proficiency = filteredSkillsData[skillId];
        const newHistoryRef = doc(collection(db, 'skillHistory'));
        batch.set(newHistoryRef, {
            employeeId: employee.id,
            employeeName: employee.name,
            skillId: skillId,
            skillName: allSkillsMap.get(skillId) || 'Unknown Skill',
            proficiency: proficiency,
            assessmentDate: serverTimestamp()
        });
    }
    return batch.commit();
};

// --- SUPPLIERS & PRICING ---
export const getSuppliers = async () => getDocs(collection(db, 'suppliers')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addSupplier = (supplierData) => addDoc(collection(db, 'suppliers'), supplierData);
export const updateSupplier = (supplierId, updatedData) => updateDoc(doc(db, 'suppliers', supplierId), updatedData);
export const deleteSupplier = (supplierId) => deleteDoc(doc(db, 'suppliers', supplierId));
export const getSupplierPricingForItem = async (itemId) => {
    if (!itemId) return [];
    const q = query(collection(db, 'supplierItemPricing'), where('itemId', '==', itemId));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};
export const addSupplierPrice = (priceData) => addDoc(collection(db, 'supplierItemPricing'), priceData);
export const updateSupplierPrice = (priceId, updatedData) => updateDoc(doc(db, 'supplierItemPricing', priceId), updatedData);
export const deleteSupplierPrice = (priceId) => deleteDoc(doc(db, 'supplierItemPricing', priceId));

// --- OVERHEADS ---
export const getOverheadCategories = async () => getDocs(collection(db, 'overheadsCategories')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addOverheadCategory = (categoryData) => addDoc(collection(db, 'overheadsCategories'), categoryData);
export const updateOverheadCategory = (categoryId, updatedData) => updateDoc(doc(db, 'overheadsCategories', categoryId), updatedData);
export const deleteOverheadCategory = async (categoryId) => {
    const categoryDocRef = doc(db, 'overheadsCategories', categoryId);
    const expensesSnapshot = await getDocs(collection(categoryDocRef, 'expenses'));
    const batch = writeBatch(db);
    expensesSnapshot.docs.forEach(expDoc => batch.delete(expDoc.ref));
    batch.delete(categoryDocRef);
    return batch.commit();
};
export const getOverheadExpenses = async (categoryId) => getDocs(collection(db, 'overheadsCategories', categoryId, 'expenses')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addOverheadExpense = (categoryId, expenseData) => addDoc(collection(db, 'overheadsCategories', categoryId, 'expenses'), expenseData);
export const updateOverheadExpense = (categoryId, expenseId, updatedData) => updateDoc(doc(db, 'overheadsCategories', categoryId, 'expenses', expenseId), updatedData);
export const deleteOverheadExpense = (categoryId, expenseId) => deleteDoc(doc(db, 'overheadsCategories', categoryId, 'expenses', expenseId));

// --- PURCHASE QUEUE ---
const purchaseQueueCollection = collection(db, 'purchaseQueue');
export const getPurchaseQueue = async () => {
    const snapshot = await getDocs(purchaseQueueCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const listenToPurchaseQueue = (callback) => {
    const q = query(purchaseQueueCollection, orderBy('queuedAt', 'desc'));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
};
export const addToPurchaseQueue = (itemData) => addDoc(purchaseQueueCollection, { ...itemData, status: 'pending', queuedAt: serverTimestamp() });
export const markItemsAsOrdered = async (supplier, itemsToOrder, orderQuantities) => {
    const batch = writeBatch(db);
    itemsToOrder.forEach(item => {
        const docRef = doc(db, 'purchaseQueue', item.id);
        const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
        const orderQty = orderQuantities[item.id] || recommendedQty;
        batch.update(docRef, {
            status: 'ordered',
            orderDate: serverTimestamp(),
            orderedQty: Number(orderQty),
            orderedFromSupplierId: supplier.id,
            orderedFromSupplierName: supplier.name
        });
    });
    return batch.commit();
};
export const receiveStockAndUpdateInventory = async (queuedItem, quantityReceived) => {
    if (!queuedItem || !quantityReceived || quantityReceived <= 0) throw new Error("Invalid item or quantity.");
    const inventoryDocRef = doc(db, 'inventoryItems', queuedItem.itemId);
    const purchaseQueueDocRef = doc(db, 'purchaseQueue', queuedItem.id);
    return runTransaction(db, async (transaction) => {
        const inventoryDoc = await transaction.get(inventoryDocRef);
        if (!inventoryDoc.exists()) throw new Error("Original inventory item not found.");
        transaction.update(inventoryDocRef, { currentStock: increment(Number(quantityReceived)) });
        transaction.update(purchaseQueueDocRef, { status: 'completed' });
    });
};
export const requeueOrDeleteItem = async (queuedItem) => {
    const inventoryDocRef = doc(db, 'inventoryItems', queuedItem.itemId);
    const purchaseQueueDocRef = doc(db, 'purchaseQueue', queuedItem.id);
    const inventoryDoc = await getDoc(inventoryDocRef);
    if (!inventoryDoc.exists()) return deleteDoc(purchaseQueueDocRef);
    const itemData = inventoryDoc.data();
    if (itemData.currentStock < itemData.reorderLevel) {
        return updateDoc(purchaseQueueDocRef, { status: 'pending' });
    } else {
        return deleteDoc(purchaseQueueDocRef);
    }
};

// --- JOB STEP DETAILS (RECIPES) ---
export const getJobStepDetails = async () => getDocs(collection(db, 'jobStepDetails')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const setJobStepDetail = (productId, departmentId, data) => {
    const recipeId = `${productId}_${departmentId}`;
    const docRef = doc(db, 'jobStepDetails', recipeId);
    return setDoc(docRef, { ...data, productId, departmentId });
};
export const getRecipeForProductDepartment = async (productId, departmentId) => {
    const recipeId = `${productId}_${departmentId}`;
    const docSnap = await getDoc(doc(db, 'jobStepDetails', recipeId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
export const updateStandardRecipe = async (jobData) => {
    if (!jobData.partId || !jobData.departmentId) {
        throw new Error("Cannot update recipe without a valid Part ID and Department ID.");
    }
    const recipeId = `${jobData.partId}_${jobData.departmentId}`;
    const recipeRef = doc(db, 'jobStepDetails', recipeId);
    const recipeDataToUpdate = {
        description: jobData.description,
        estimatedTime: jobData.estimatedTime,
        steps: jobData.steps.map((step, index) => ({ text: step, time: 0, order: index })),
        tools: jobData.tools.map(tool => tool.id),
        accessories: jobData.accessories.map(acc => acc.id),
        consumables: jobData.consumables,
    };
    return updateDoc(recipeRef, recipeDataToUpdate);
};

// --- JOB CARDS ---
const jobCardsCollection = collection(db, 'createdJobCards');
export const addJobCard = (jobCardData) => addDoc(jobCardsCollection, { ...jobCardData, createdAt: serverTimestamp() });
export const listenToJobCards = (callback, options = {}) => {
    let q = query(jobCardsCollection, orderBy('createdAt', 'desc'));
    if (options.limit) {
        if (options.startAfter) q = query(q, startAfter(options.startAfter));
        q = query(q, limit(options.limit));
        return onSnapshot(q, (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            callback({ jobs, lastVisible });
        });
    } else {
        return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    }
};
export const getJobByJobId = async (jobId) => {
    const q = query(jobCardsCollection, where("jobId", "==", jobId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error(`No job found with ID: ${jobId}`);
    const jobDoc = querySnapshot.docs[0];
    return { id: jobDoc.id, ...jobDoc.data() };
};
export const updateJobPriorities = async (orderedJobs) => {
    const batch = writeBatch(db);
    orderedJobs.forEach((job, index) => {
        const jobRef = doc(db, 'createdJobCards', job.id);
        batch.update(jobRef, { priority: index });
    });
    return batch.commit();
};

// --- QC & JOB ADJUSTMENT ---
export const getJobsAwaitingQC = async () => {
    const q = query(jobCardsCollection, where('status', '==', 'Awaiting QC'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const updateJobCardWithAdjustments = (jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId) => {
    const updateFn = httpsCallable(functions, 'updateJobCardWithAdjustments');
    return updateFn({ jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId });
};
export const processQcDecision = async (job, isApproved, options = {}) => {
    const { rejectionReason = '', preventStockDeduction = false, reworkDetails = null } = options;
    return runTransaction(db, async (transaction) => {
        const jobRef = doc(db, 'createdJobCards', job.id);
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw "Job document does not exist!";
        const currentJobData = jobDoc.data();
        const dataToUpdate = {};
        if (isApproved) {
            dataToUpdate.status = 'Complete';
            if (!currentJobData.completedAt) dataToUpdate.completedAt = serverTimestamp();
            if (job.partId) {
                const productRef = doc(db, 'inventoryItems', job.partId);
                transaction.update(productRef, { currentStock: increment(job.quantity || 1) });
            }
        } else {
            if (reworkDetails && reworkDetails.requeue) {
                dataToUpdate.status = 'Pending';
                dataToUpdate.issueReason = `REWORK: ${rejectionReason}`;
                dataToUpdate.employeeId = reworkDetails.newEmployeeId || job.employeeId;
                dataToUpdate.employeeName = reworkDetails.newEmployeeName || job.employeeName;
                dataToUpdate.completedAt = null;
            } else {
                dataToUpdate.status = 'Issue';
                dataToUpdate.issueReason = rejectionReason;
            }
        }
        if (!preventStockDeduction && currentJobData.processedConsumables?.length > 0) {
            for (const consumable of currentJobData.processedConsumables) {
                const itemRef = doc(db, 'inventoryItems', consumable.id);
                transaction.update(itemRef, { currentStock: increment(-consumable.quantity) });
            }
        }
        transaction.update(jobRef, dataToUpdate);
    });
};

// --- GENERIC DOCUMENT API ---
export const updateDocument = async (collectionName, docId, data) => {
    const docRef = doc(db, collectionName, docId);
    const dataToSave = { ...data };
    delete dataToSave.id;
    return updateDoc(docRef, dataToSave);
};
export const deleteDocument = async (collectionName, docId) => {
    const docRef = doc(db, collectionName, docId);
    return deleteDoc(docRef);
};

// --- PRODUCT CATALOG (NOW A VIEW OF INVENTORY) ---
export const getProducts = async () => getAllInventoryItems('Product');
export const addProduct = async (productData) => {
    const q = query(inventoryCollection, where("partNumber", "==", productData.partNumber), where("category", "==", "Product"));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) throw new Error(`A product with Part Number "${productData.partNumber}" already exists.`);
    return addInventoryItem({ ...productData, category: 'Product' });
};
export const updateProduct = (productId, updatedData) => updateInventoryItem(productId, updatedData);
export const deleteProduct = (productId) => deleteInventoryItem(productId);

// --- PRODUCT CATEGORIES (Legacy, may be phased out) ---
const productCategoriesCollection = collection(db, 'productCategories');
export const getProductCategories = async () => getDocs(query(productCategoriesCollection, orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addProductCategory = (categoryName) => addDoc(productCategoriesCollection, { name: categoryName });
export const deleteProductCategory = (categoryId) => deleteDoc(doc(db, 'productCategories', categoryId));

// --- PRODUCT RECIPE LINKS ---
const productRecipeLinksCollection = collection(db, 'productRecipeLinks');
export const getLinkedRecipesForProduct = async (productId) => {
    const q = query(productRecipeLinksCollection, where('productId', '==', productId));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};
export const linkRecipeToProduct = (linkData) => addDoc(productRecipeLinksCollection, linkData);
export const unlinkRecipeFromProduct = (linkId) => deleteDoc(doc(db, 'productRecipeLinks', linkId));

// --- PAYROLL & REPORTING ---
export const getCompletedJobsInRange = async (startDate, endDate) => {
    const q = query(jobCardsCollection, where('status', '==', 'Complete'), where('completedAt', '>=', startDate), where('completedAt', '<=', endDate));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};
export const getCompletedJobsForEmployee = async (employeeId) => {
    if (!employeeId) return [];
    const q = query(jobCardsCollection, where('employeeId', '==', employeeId), where('status', 'in', ['Complete', 'Issue', 'Archived - Issue']));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};

// --- USER MANAGEMENT ---
export const getAllUsers = async () => getDocs(collection(db, 'users')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const updateUserRole = async (userId, newRole, discountPercentage, companyName) => {
    const dataToUpdate = { role: newRole };
    if (discountPercentage !== undefined) dataToUpdate.discountPercentage = Number(discountPercentage) || 0;
    if (companyName !== undefined) dataToUpdate.companyName = companyName;
    return setDoc(doc(db, 'users', userId), dataToUpdate, { merge: true });
};
export const createUserWithRole = httpsCallable(functions, 'createUserAndSetRole');
export const deleteUserWithRole = httpsCallable(functions, 'deleteUserAndRole');

// --- ROLES ---
export const getRoles = async () => getDocs(collection(db, 'roles')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));

// --- MARKETING & SALES ---
export const getCampaigns = async () => getDocs(query(collection(db, 'marketingCampaigns'), orderBy('startDate', 'desc'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addCampaign = (campaignData) => addDoc(collection(db, 'marketingCampaigns'), { ...campaignData, leadsGenerated: 0, createdAt: serverTimestamp() });
export const updateCampaign = (campaignId, updatedData) => updateDoc(doc(db, 'marketingCampaigns', campaignId), updatedData);
export const deleteCampaign = (campaignId) => deleteDoc(doc(db, 'marketingCampaigns', campaignId));

// --- TRAINING RESOURCES ---
export const getTrainingResources = async () => getDocs(collection(db, 'trainingResources')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addTrainingResource = (data) => addDoc(collection(db, 'trainingResources'), data);
export const updateTrainingResource = (id, data) => updateDoc(doc(db, 'trainingResources', id), data);
export const deleteTrainingResource = (id) => deleteDoc(doc(db, 'trainingResources', id));

// --- SUBCONTRACTOR LOGS ---
export const addSubcontractorAdHocLog = (logData) => addDoc(collection(db, 'subcontractorAdHocLogs'), { ...logData, createdAt: serverTimestamp() });
export const addSubcontractorTeamLog = (logData) => addDoc(collection(db, 'subcontractorTeamLogs'), { ...logData, createdAt: serverTimestamp() });

// --- QUOTES & SALES ORDERS ---
export const addQuote = (quoteData) => addDoc(collection(db, 'quotes'), { ...quoteData, status: 'draft', createdAt: serverTimestamp() });
export const createSalesOrderFromQuote = async (quote) => {
    const batch = writeBatch(db);
    const salesOrderRef = doc(collection(db, 'salesOrders'));
    batch.set(salesOrderRef, {
        salesOrderId: `SO-${quote.quoteId.replace('Q-', '')}`,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        total: quote.total,
        status: 'Pending Production',
        createdAt: serverTimestamp(),
        lineItems: quote.lineItems.map(item => ({ ...item, id: doc(collection(db, '_')).id, status: 'Pending' }))
    });
    batch.update(doc(db, 'quotes', quote.id), { status: 'Accepted' });
    return batch.commit();
};
export const listenToSalesOrders = (callback) => onSnapshot(query(collection(db, 'salesOrders'), orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))));
export const listenToOneOffPurchases = (callback) => onSnapshot(query(collection(db, 'oneOffPurchases'), orderBy('createdAt', 'desc')), s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))));
export const addPurchasedItemToQueue = (lineItem, salesOrder) => addDoc(collection(db, 'oneOffPurchases'), {
    itemName: lineItem.description,
    quantity: lineItem.quantity,
    estimatedCost: lineItem.unitCost,
    salesOrderId: salesOrder.salesOrderId,
    customerName: salesOrder.customerName,
    status: 'Pending Purchase',
    createdAt: serverTimestamp()
});
export const markOneOffItemsAsOrdered = async (itemIds) => {
    const batch = writeBatch(db);
    itemIds.forEach(id => batch.update(doc(db, 'oneOffPurchases', id), { status: 'Ordered' }));
    return batch.commit();
};
export const updateSalesOrderLineItemStatus = async (orderId, lineItemId, newStatus) => {
    const orderRef = doc(db, 'salesOrders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) throw new Error("Sales Order not found");
    const updatedLineItems = orderDoc.data().lineItems.map(item =>
        item.id === lineItemId ? { ...item, status: newStatus } : item
    );
    return updateDoc(orderRef, { lineItems: updatedLineItems });
};

// --- STOCK TAKE ---
export const updateStockCount = async (itemId, category, newCount, sessionId) => {
    const itemRef = doc(db, 'inventoryItems', itemId);
    return updateDoc(itemRef, {
        currentStock: Number(newCount),
        lastCountedInSessionId: sessionId
    });
};
export const reconcileStockLevels = async (itemsToReconcile) => {
    const batch = writeBatch(db);
    for (const item of itemsToReconcile) {
        const itemRef = doc(db, 'inventoryItems', item.id);
        batch.update(itemRef, { currentStock: item.newCount });
    }
    return batch.commit();
};

// --- CUSTOMER ORDERS & FEEDBACK ---
export const submitCustomerOrder = httpsCallable(functions, 'submitCustomerOrder');
export const listenToCustomerSalesOrders = (customerEmail, callback) => {
    const q = query(collection(db, 'salesOrders'), where('customerEmail', '==', customerEmail));
    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        orders.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        callback(orders);
    });
};
export const listenToJobsForSalesOrder = (salesOrderId, callback) => {
    if (!salesOrderId) return () => {};
    const q = query(collection(db, 'createdJobCards'), where('salesOrderId', '==', salesOrderId));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};
export const addCustomerFeedback = (feedbackData) => addDoc(collection(db, 'customerFeedback'), { ...feedbackData, submittedAt: serverTimestamp() });

// --- REWORK & KUDOS ---
export const getReworkReasons = async () => getDocs(query(collection(db, 'reworkReasons'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const giveKudosToJob = (jobId) => updateDoc(doc(db, 'createdJobCards', jobId), { kudos: true });
export const listenToReworkQueue = (callback) => {
    const q = query(collection(db, 'createdJobCards'), where('status', 'in', ['Issue', 'Halted - Issue']));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};
export const resolveReworkJob = (jobDocId) => updateDoc(doc(db, 'createdJobCards', jobDocId), { status: 'Pending', issueReason: 'Rework Resolved - Re-queued' });

// --- ROUTINE TASKS ---
export const getRoutineTasks = async () => getDocs(query(collection(db, 'routineTasks'), orderBy('timeOfDay'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addRoutineTask = (taskData) => addDoc(collection(db, 'routineTasks'), taskData);
export const updateRoutineTask = (taskId, updatedData) => updateDoc(doc(db, 'routineTasks', taskId), updatedData);
export const deleteRoutineTask = (taskId) => deleteDoc(doc(db, 'routineTasks', taskId));

// --- PICKING LISTS ---
export const listenToPickingLists = (callback) => {
    const q = query(collection(db, 'pickingLists'), where('status', '==', 'pending'));
    return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        lists.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        callback(lists);
    });
};
export const markPickingListAsCompleted = (listId) => updateDoc(doc(db, 'pickingLists', listId), { status: 'completed' });

// --- CONSIGNMENT STOCK ---
export const getClientUsers = async () => getDocs(query(collection(db, 'users'), where('role', '==', 'Client'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const listenToConsignmentStockForClient = (clientId, callback) => {
    if (!clientId) return () => {};
    const q = query(collection(db, 'consignmentStock'), where('clientId', '==', clientId), orderBy('productName'));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};
export const addConsignmentItem = (itemData) => addDoc(collection(db, 'consignmentStock'), { ...itemData, lastCounted: serverTimestamp() });
export const updateConsignmentStockCounts = async (updates) => {
    if (!updates || updates.length === 0) return;
    const batch = writeBatch(db);
    updates.forEach(update => {
        batch.update(doc(db, 'consignmentStock', update.id), { 
            quantity: Number(update.newCount),
            lastCounted: serverTimestamp()
        });
    });
    return batch.commit();
};

// --- LEARNING PATHS ---
export const getLearningPaths = async () => getDocs(query(collection(db, 'learningPaths'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addLearningPath = (pathData) => addDoc(collection(db, 'learningPaths'), { ...pathData, skillIds: [] });
export const updateLearningPath = (pathId, updatedData) => updateDoc(doc(db, 'learningPaths', pathId), updatedData);
export const deleteLearningPath = (pathId) => deleteDoc(doc(db, 'learningPaths', pathId));

// Export `collection`, `query`, and `where` to be used in other files if needed
export { collection, query, where, getDocs, onSnapshot };
