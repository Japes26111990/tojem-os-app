// src/api/firestore.js

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
import { JOB_STATUSES, SYSTEM_ROLES } from '../config';

// =================================================================================================
// ROUTINE TASK COMPLETION API
// =================================================================================================

export const markRoutineTaskAsDone = (taskId, taskName, userId, userEmail) => {
    const completionId = `${taskId}_${new Date().toISOString().split('T')[0]}`;
    const completionRef = doc(db, 'routineTaskCompletions', completionId);
    return setDoc(completionRef, {
        taskId,
        taskName,
        completedByUserId: userId,
        completedByUserEmail: userEmail,
        completionDate: new Date().toISOString().split('T')[0],
        timestamp: serverTimestamp(),
    });
};

export const getTodaysCompletedRoutineTasks = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'routineTaskCompletions'), where('completionDate', '==', todayStr));
    const snapshot = await getDocs(q);
    const completedIds = new Set();
    snapshot.forEach(doc => {
        completedIds.add(doc.data().taskId);
    });
    return completedIds;
};


// =================================================================================================
// AUDIT LOGGING API
// =================================================================================================

export const logAuditEvent = (action, userId, userEmail, details) => {
    const auditLogsCollection = collection(db, 'auditLogs');
    return addDoc(auditLogsCollection, {
        action,
        userId,
        userEmail,
        details,
        timestamp: serverTimestamp(),
    });
};


// =================================================================================================
// UNIFIED INVENTORY API
// =================================================================================================

const inventoryCollection = collection(db, 'inventoryItems');

export const getAllInventoryItems = async (category) => {
    let q = inventoryCollection;
    if (category) {
        q = query(inventoryCollection, where('category', '==', category));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addInventoryItem = (itemData) => {
    if (!itemData.category) {
        return Promise.reject(new Error("Item data must include a 'category' field."));
    }
    return addDoc(inventoryCollection, { ...itemData, createdAt: serverTimestamp() });
};

export const updateInventoryItem = (itemId, updatedData) => {
    const itemDoc = doc(db, 'inventoryItems', itemId);
    const { id, ...dataToSave } = updatedData;
    return updateDoc(itemDoc, dataToSave);
};

export const deleteInventoryItem = async (itemId) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'inventoryItems', itemId));
    const pricingSnapshot = await getDocs(query(collection(db, 'supplierItemPricing'), where('itemId', '==', itemId)));
    pricingSnapshot.forEach(priceDoc => batch.delete(priceDoc.ref));
    return batch.commit();
};

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

export const addKaizenSuggestion = (suggestionData) => addDoc(collection(db, 'kaizenSuggestions'), { ...suggestionData, createdAt: serverTimestamp(), status: 'new' });
export const addPraise = (praiseData) => addDoc(collection(db, 'praise'), { ...praiseData, createdAt: serverTimestamp() });

export const listenToPraiseForEmployee = (employeeId, callback) => {
    const q = query(collection(db, 'praise'), where('recipientId', '==', employeeId));
    return onSnapshot(q, (snapshot) => {
        const praiseItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        praiseItems.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        callback(praiseItems);
    });
};

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

export const getSkills = async () => getDocs(query(collection(db, 'skills'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addSkill = (skillName) => addDoc(collection(db, 'skills'), { name: skillName });
export const updateSkill = (skillId, updatedData) => updateDoc(doc(db, 'skills', skillId), updatedData);
export const deleteSkill = (skillId) => deleteDoc(doc(db, 'skills', skillId));
export const getSkillHistoryForEmployee = async (employeeId) => {
    const q = query(collection(db, 'skillHistory'), where('employeeId', '==', employeeId));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};

export const getTools = async () => getDocs(collection(db, 'tools')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addTool = (toolData) => addDoc(collection(db, 'tools'), { ...toolData, associatedSkills: toolData.associatedSkills || [] });
export const deleteTool = (toolId) => deleteDoc(doc(db, 'tools', toolId));
export const getToolAccessories = async () => getDocs(collection(db, 'toolAccessories')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addToolAccessory = (accessoryData) => addDoc(collection(db, 'toolAccessories'), { ...accessoryData, associatedSkills: accessoryData.associatedSkills || [] });
export const deleteToolAccessory = (accessoryId) => deleteDoc(doc(db, 'toolAccessories', accessoryId));

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

const purchaseQueueCollection = collection(db, 'purchaseQueue');
export const getPurchaseQueue = async () => {
    const snapshot = await getDocs(purchaseQueueCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const listenToPurchaseQueue = (callback) => {
    const q = query(purchaseQueueCollection, orderBy('queuedAt', 'desc'));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
};
export const addToPurchaseQueue = (itemData) => addDoc(purchaseQueueCollection, { ...itemData, status: JOB_STATUSES.PENDING, queuedAt: serverTimestamp() });
export const markItemsAsOrdered = async (supplier, itemsToOrder, orderQuantities) => {
    const batch = writeBatch(db);
    itemsToOrder.forEach(item => {
        const docRef = doc(db, 'purchaseQueue', item.id);
        const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
        const orderQty = orderQuantities[item.id] || recommendedQty;
        batch.update(docRef, {
            status: JOB_STATUSES.ORDERED,
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
        transaction.update(purchaseQueueDocRef, { status: JOB_STATUSES.COMPLETE });
    });
};
export const requeueOrDeleteItem = async (queuedItem) => {
    const inventoryDocRef = doc(db, 'inventoryItems', queuedItem.itemId);
    const purchaseQueueDocRef = doc(db, 'purchaseQueue', queuedItem.id);
    const inventoryDoc = await getDoc(inventoryDocRef);
    if (!inventoryDoc.exists()) return deleteDoc(purchaseQueueDocRef);
    const itemData = inventoryDoc.data();
    if (itemData.currentStock < itemData.reorderLevel) {
        return updateDoc(purchaseQueueDocRef, { status: JOB_STATUSES.PENDING });
    } else {
        return deleteDoc(purchaseQueueDocRef);
    }
};

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

const jobCardsCollection = collection(db, 'createdJobCards');

export const addJobCard = async (jobCardData) => {
    if (!jobCardData.jobId || !jobCardData.partName || !jobCardData.status) {
        throw new Error('Job card must include jobId, partName, and status.');
    }
    try {
        const docRef = await addDoc(jobCardsCollection, { ...jobCardData, createdAt: serverTimestamp() });
        return docRef;
    } catch (error) {
        console.error('Error adding job card:', error);
        throw new Error(`Failed to create job card: ${error.message}`);
    }
};

export const listenToJobCards = (callback, options = {}) => {
    const jobsCollectionRef = collection(db, 'createdJobCards');
    let q = query(jobsCollectionRef, orderBy('createdAt', 'desc'));
    if (options.limit) {
        if (options.startAfter && options.startAfter.exists?.()) {
            q = query(q, startAfter(options.startAfter));
        }
        q = query(q, limit(options.limit));
        
        return onSnapshot(q, (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
            callback({ jobs, lastVisible }); 
        }, (error) => {
            console.error("Error listening to paginated job cards:", error);
            callback({ jobs: [], lastVisible: null, error });
        });
    } else {
        return onSnapshot(q, (snapshot) => {
            const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback({ jobs, lastVisible: null });
        }, (error) => {
            console.error("Error listening to all job cards:", error);
            callback({ jobs: [], lastVisible: null, error });
        });
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

export const getJobsAwaitingQC = async () => {
    const q = query(jobCardsCollection, where('status', '==', JOB_STATUSES.AWAITING_QC));
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
            dataToUpdate.status = JOB_STATUSES.COMPLETE;
            if (!currentJobData.completedAt) dataToUpdate.completedAt = serverTimestamp();
            if (job.partId) {
                const productRef = doc(db, 'inventoryItems', job.partId);
                transaction.update(productRef, { currentStock: increment(job.quantity || 1) });
            }
        } else {
            if (reworkDetails && reworkDetails.requeue) {
                dataToUpdate.status = JOB_STATUSES.PENDING;
                dataToUpdate.issueReason = `REWORK: ${rejectionReason}`;
                dataToUpdate.employeeId = reworkDetails.newEmployeeId || job.employeeId;
                dataToUpdate.employeeName = reworkDetails.newEmployeeName || job.employeeName;
                dataToUpdate.completedAt = null;
            } else {
                dataToUpdate.status = JOB_STATUSES.ISSUE;
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

export const getProducts = async () => getAllInventoryItems(JOB_STATUSES.PRODUCT);
export const addProduct = async (productData) => {
    const q = query(inventoryCollection, where("partNumber", "==", productData.partNumber), where("category", "==", JOB_STATUSES.PRODUCT));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) throw new Error(`A product with Part Number "${productData.partNumber}" already exists.`);
    return addInventoryItem({ ...productData, category: JOB_STATUSES.PRODUCT });
};
export const updateProduct = (productId, updatedData) => updateInventoryItem(productId, updatedData);
export const deleteProduct = (productId) => deleteInventoryItem(productId);

const productCategoriesCollection = collection(db, 'productCategories');
export const getProductCategories = async () => getDocs(query(productCategoriesCollection, orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addProductCategory = (categoryName) => addDoc(productCategoriesCollection, { name: categoryName });
export const deleteProductCategory = (categoryId) => deleteDoc(doc(db, 'productCategories', categoryId));

const getGenericOptions = async (collectionName) => {
    const q = query(collection(db, collectionName), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getMakes = () => getGenericOptions('makes');
export const addMake = (name, categoryIds) => addDoc(collection(db, 'makes'), { name, categoryIds });
export const deleteMake = (id) => deleteDoc(doc(db, 'makes', id));

export const getModels = () => getGenericOptions('models');
export const addModel = (name, makeId) => addDoc(collection(db, 'models'), { name, makeId });
export const deleteModel = (id) => deleteDoc(doc(db, 'models', id));

export const getUnits = () => getGenericOptions('units');
export const addUnit = (name) => addDoc(collection(db, 'units'), { name });
export const deleteUnit = (id) => deleteDoc(doc(db, 'units', id));

const productRecipeLinksCollection = collection(db, 'productRecipeLinks');
export const getLinkedRecipesForProduct = async (productId) => {
    const q = query(productRecipeLinksCollection, where('productId', '==', productId));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};
export const linkRecipeToProduct = (linkData) => addDoc(productRecipeLinksCollection, linkData);
export const unlinkRecipeFromProduct = (linkId) => deleteDoc(doc(db, 'productRecipeLinks', linkId));

export const getCompletedJobsInRange = async (startDate, endDate) => {
    const q = query(jobCardsCollection, where('status', '==', JOB_STATUSES.COMPLETE), where('completedAt', '>=', startDate), where('completedAt', '<=', endDate));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};
export const getCompletedJobsForEmployee = async (employeeId) => {
    if (!employeeId) return [];
    const q = query(jobCardsCollection, where('employeeId', '==', employeeId), where('status', 'in', [JOB_STATUSES.COMPLETE, JOB_STATUSES.ISSUE, JOB_STATUSES.ARCHIVED_ISSUE]));
    return getDocs(q).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};

export const getAllUsers = async () => getDocs(collection(db, 'users')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const updateUserRole = async (userId, newRole, discountPercentage, companyName) => {
    const dataToUpdate = { role: newRole };
    if (discountPercentage !== undefined) dataToUpdate.discountPercentage = Number(discountPercentage) || 0;
    if (companyName !== undefined) dataToUpdate.companyName = companyName;
    return setDoc(doc(db, 'users', userId), dataToUpdate, { merge: true });
};
export const createUserWithRole = httpsCallable(functions, 'createUserAndSetRole');
export const deleteUserWithRole = httpsCallable(functions, 'deleteUserAndRole');

export const getRoles = async () => getDocs(collection(db, 'roles')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));

export const getCampaigns = async () => getDocs(query(collection(db, 'marketingCampaigns'), orderBy('startDate', 'desc'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addCampaign = (campaignData) => addDoc(collection(db, 'marketingCampaigns'), { ...campaignData, leadsGenerated: 0, createdAt: serverTimestamp() });
export const updateCampaign = (campaignId, updatedData) => updateDoc(doc(db, 'marketingCampaigns', campaignId), updatedData);
export const deleteCampaign = (campaignId) => deleteDoc(doc(db, 'marketingCampaigns', campaignId));

export const getTrainingResources = async () => getDocs(query(collection(db, 'trainingResources'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addTrainingResource = (data) => addDoc(collection(db, 'trainingResources'), data);
export const updateTrainingResource = (id, data) => updateDoc(doc(db, 'trainingResources', id), data);
export const deleteTrainingResource = (id) => deleteDoc(doc(db, 'trainingResources', id));

export const addSubcontractorAdHocLog = (logData) => addDoc(collection(db, 'subcontractorAdHocLogs'), { ...logData, createdAt: serverTimestamp() });
export const addSubcontractorTeamLog = (logData) => addDoc(collection(db, 'subcontractorTeamLogs'), { ...logData, createdAt: serverTimestamp() });

export const addQuote = (quoteData) => addDoc(collection(db, 'quotes'), { ...quoteData, status: 'draft', createdAt: serverTimestamp() });
export const createSalesOrderFromQuote = async (quote) => {
    const batch = writeBatch(db);
    const salesOrderRef = doc(collection(db, 'salesOrders'));
    
    const salesOrderData = {
        salesOrderId: `SO-${quote.quoteId.replace('Q-', '')}`,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        total: quote.total,
        status: 'Pending Production',
        createdAt: serverTimestamp(),
        lineItems: quote.lineItems.map(item => ({ ...item, id: doc(collection(db, '_')).id, status: JOB_STATUSES.PENDING }))
    };

    batch.set(salesOrderRef, salesOrderData);
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
    itemIds.forEach(id => batch.update(doc(db, 'oneOffPurchases', id), { status: JOB_STATUSES.ORDERED }));
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

export const updateStockCount = async (itemId, category, newCount, sessionId) => {
    const itemRef = doc(db, 'inventoryItems', itemId);
    return updateDoc(itemRef, {
        currentStock: Number(newCount),
        lastCountedInSessionId: sessionId
    });
};

export const reconcileStockLevels = async (itemsToReconcile) => {
    const BATCH_LIMIT = 500;
    const batches = [];
    
    for (let i = 0; i < itemsToReconcile.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = itemsToReconcile.slice(i, i + BATCH_LIMIT);
        for (const item of chunk) {
            const itemRef = doc(db, 'inventoryItems', item.id);
            batch.update(itemRef, { currentStock: item.newCount });
        }
        batches.push(batch.commit());
    }

    return Promise.all(batches);
};

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

export const getReworkReasons = async () => getDocs(query(collection(db, 'reworkReasons'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const giveKudosToJob = (jobId) => updateDoc(doc(db, 'createdJobCards', jobId), { kudos: true });
export const listenToReworkQueue = (callback) => {
    const q = query(collection(db, 'createdJobCards'), where('status', 'in', [JOB_STATUSES.ISSUE, JOB_STATUSES.HALTED_ISSUE]));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};
export const resolveReworkJob = (jobDocId) => updateDoc(doc(db, 'createdJobCards', jobDocId), { status: JOB_STATUSES.PENDING, issueReason: 'Rework Resolved - Re-queued' });

export const getRoutineTasks = async () => getDocs(query(collection(db, 'routineTasks'), orderBy('timeOfDay'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addRoutineTask = (taskData) => addDoc(collection(db, 'routineTasks'), taskData);
export const updateRoutineTask = (taskId, updatedData) => updateDoc(doc(db, 'routineTasks', taskId), updatedData);
export const deleteRoutineTask = (taskId) => deleteDoc(doc(db, 'routineTasks', taskId));

export const listenToPickingLists = (callback) => {
    const q = query(collection(db, 'pickingLists'), where('status', '==', JOB_STATUSES.PENDING));
    return onSnapshot(q, (snapshot) => {
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        lists.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        callback(lists);
    });
};
export const markPickingListAsCompleted = (listId) => updateDoc(doc(db, 'pickingLists', listId), { status: JOB_STATUSES.COMPLETE });

export const getClientUsers = async () => getDocs(query(collection(db, 'users'), where('role', '==', SYSTEM_ROLES.CLIENT))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const listenToConsignmentStockForClient = (clientId, callback) => {
    if (!clientId) return () => {};
    const q = query(collection(db, 'consignmentStock'), where('clientId', '==', clientId), orderBy('productName'));
    return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
};

// --- UPDATED: addConsignmentItem now accepts make and model for grouping ---
export const addConsignmentItem = (itemData) => {
    const data = {
        ...itemData,
        lastCounted: serverTimestamp(),
        reorderLevel: Number(itemData.reorderLevel) || 0,
        standardStockLevel: Number(itemData.standardStockLevel) || 0,
        make: itemData.make || '', // Add make
        model: itemData.model || '', // Add model
    };
    return addDoc(collection(db, 'consignmentStock'), data);
};

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

export const bookOutConsignmentItemAndTriggerReplenishment = async (user, product) => {
    return runTransaction(db, async (transaction) => {
        const consignmentRef = collection(db, 'consignmentStock');
        const q = query(consignmentRef, 
            where("clientId", "==", user.uid), 
            where("productId", "==", product.id),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error("This item was not found in your consignment stock.");
        }

        const consignmentDoc = snapshot.docs[0];
        const consignmentData = consignmentDoc.data();
        const newQuantity = (consignmentData.quantity || 0) - 1;

        if (newQuantity < 0) {
            throw new Error("Cannot book out. Stock level is already zero.");
        }

        // 1. Update the consignment stock quantity
        transaction.update(consignmentDoc.ref, { quantity: newQuantity });

        // 2. Log a notification for management
        const newNotifRef = doc(collection(db, 'notifications'));
        transaction.set(newNotifRef, {
            type: 'consignment_sold',
            message: `${user.companyName} sold one unit of ${product.name}.`,
            targetRole: 'Manager',
            read: false,
            createdAt: serverTimestamp(),
            productId: product.id,
            clientId: user.uid,
        });

        // 3. Check for reorder and create picking list if necessary
        const reorderLevel = consignmentData.reorderLevel || 0;
        if (newQuantity <= reorderLevel) {
            const pickingListRef = doc(collection(db, 'pickingLists'));
            const quantityToPick = (consignmentData.standardStockLevel || 0) - newQuantity;

            if (quantityToPick > 0) {
                transaction.set(pickingListRef, {
                    salesOrderId: `CONSIGN-${user.companyName.substring(0, 5).toUpperCase()}-${Date.now()}`,
                    customerName: `${user.companyName} (Consignment)`,
                    status: JOB_STATUSES.PENDING,
                    createdAt: serverTimestamp(),
                    items: [{
                        id: product.id,
                        name: product.name,
                        quantity: quantityToPick,
                        location: product.location || 'N/A',
                        shelf_number: product.shelf_number || 'N/A',
                        shelf_level: product.shelf_level || 'N/A',
                    }]
                });
            }
        }
    });
};


export const getLearningPaths = async () => getDocs(query(collection(db, 'learningPaths'), orderBy('name'))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
export const addLearningPath = (pathData) => addDoc(collection(db, 'learningPaths'), { ...pathData, skillIds: [] });
export const updateLearningPath = (pathId, updatedData) => updateDoc(doc(db, 'learningPaths', pathId), updatedData);
export const deleteLearningPath = (pathId) => deleteDoc(doc(db, 'learningPaths', pathId));

export { collection, query, where, getDocs, onSnapshot };