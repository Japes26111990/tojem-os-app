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
    limit
} from 'firebase/firestore';
import { db, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

// --- NEW: Update a standard recipe from a completed job's data ---
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


// --- NEW: Update the priority field for multiple jobs ---
export const updateJobPriorities = async (orderedJobs) => {
    const batch = writeBatch(db);
    orderedJobs.forEach((job, index) => {
        const jobRef = doc(db, 'createdJobCards', job.id);
        batch.update(jobRef, { priority: index });
    });
    return batch.commit();
};

// --- NEW: Find an inventory item by its unique item code ---
export const findInventoryItemByItemCode = async (itemCode) => {
    if (!itemCode) throw new Error("Item code is required.");
    const collectionsToSearch = ['components', 'rawMaterials', 'workshopSupplies'];
    for (const collectionName of collectionsToSearch) {
        const q = query(collection(db, collectionName), where("itemCode", "==", itemCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const itemDoc = querySnapshot.docs[0];
            return { id: itemDoc.id, category: collectionName, ...itemDoc.data() };
        }
    }
    throw new Error(`No inventory item found with code: ${itemCode}`);
};

// --- NEW: Update stock level based on a weight measurement ---
export const updateStockByWeight = async (itemId, category, grossWeight) => {
    if (!itemId || !category || isNaN(parseFloat(grossWeight))) {
        throw new Error("Item ID, category, and a valid gross weight are required.");
    }
    const itemRef = doc(db, category, itemId);
    return runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
            throw new Error("Inventory item not found.");
        }
        const itemData = itemDoc.data();
        const tareWeight = parseFloat(itemData.tareWeight) || 0;
        const unitWeight = parseFloat(itemData.unitWeight) || 1;
        if (unitWeight <= 0) {
            throw new Error("Item has an invalid unit weight of zero or less.");
        }
        const netWeight = parseFloat(grossWeight) - tareWeight;
        const newQuantity = Math.round(netWeight / unitWeight);
        if (newQuantity < 0) {
            throw new Error("Calculated quantity is negative. Please check weights.");
        }
        transaction.update(itemRef, { currentStock: newQuantity });
        return { newQuantity };
    });
};

// --- SYSTEM STATUS API ---
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


// --- DEPARTMENTS API ---
const departmentsCollection = collection(db, 'departments');
export const getDepartments = async () => {
    const snapshot = await getDocs(departmentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addDepartment = (departmentName) => {
    return addDoc(departmentsCollection, { name: departmentName, requiredSkills: [] });
};
export const deleteDepartment = (departmentId) => {
    const departmentDoc = doc(db, 'departments', departmentId);
    return deleteDoc(departmentDoc);
};
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

// --- SKILLS API ---
const skillsCollection = collection(db, 'skills');
const skillHistoryCollection = collection(db, 'skillHistory');
export const getSkills = async () => {
    const snapshot = await getDocs(query(skillsCollection, orderBy('name')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addSkill = (skillName) => {
    return addDoc(skillsCollection, { name: skillName });
};
export const updateSkill = (skillId, updatedData) => {
    const skillDoc = doc(db, 'skills', skillId);
    return updateDoc(skillDoc, updatedData);
};
export const deleteSkill = (skillId) => {
    const skillDoc = doc(db, 'skills', skillId);
    return deleteDoc(skillDoc);
};
export const getSkillHistoryForEmployee = async (employeeId) => {
    const q = query(skillHistoryCollection, where('employeeId', '==', employeeId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const getSkillNameById = async (skillId) => {
    const skills = await getSkills();
    const skill = skills.find(s => s.id === skillId);
    return skill ? skill.name : 'Unknown Skill';
};

// --- TOOLS API ---
const toolsCollection = collection(db, 'tools');
export const getTools = async () => {
    const snapshot = await getDocs(toolsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addTool = (toolData) => {
    return addDoc(toolsCollection, { ...toolData, associatedSkills: toolData.associatedSkills || [] });
};
export const deleteTool = (toolId) => {
    const toolDoc = doc(db, 'tools', toolId);
    return deleteDoc(toolDoc);
};

// --- TOOL ACCESSORIES API ---
const toolAccessoriesCollection = collection(db, 'toolAccessories');
export const getToolAccessories = async () => {
    const snapshot = await getDocs(toolAccessoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addToolAccessory = (accessoryData) => {
    return addDoc(toolAccessoriesCollection, { ...accessoryData, associatedSkills: accessoryData.associatedSkills || [] });
};
export const deleteToolAccessory = (accessoryId) => {
    const accessoryDoc = doc(db, 'toolAccessories', accessoryId);
    return deleteDoc(accessoryDoc);
};

// --- EMPLOYEES API ---
const employeesCollection = collection(db, 'employees');
export const getEmployees = async () => {
    const snapshot = await getDocs(employeesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addEmployee = (employeeData) => {
    return addDoc(employeesCollection, employeeData);
};
export const deleteEmployee = (employeeId) => {
    const employeeDoc = doc(db, 'employees', employeeId);
    return deleteDoc(employeeDoc);
};
export const getEmployeeSkills = async (employeeId) => {
    const employeeDocRef = doc(db, 'employees', employeeId);
    const employeeDoc = await getDoc(employeeDocRef);
    if (employeeDoc.exists()) {
        const skillsData = employeeDoc.data().skills || {};
        return skillsData;
    }
    return {};
};
export const updateEmployeeSkillsAndLogHistory = async (employee, skillsData, allSkills) => {
    const employeeDocRef = doc(db, 'employees', employee.id);
    const batch = writeBatch(db);
    const filteredSkillsData = {};
    for (const skillId in skillsData) {
        if (skillsData[skillId] > 0) {
            filteredSkillsData[skillId] = skillsData[skillId];
        }
    }
    batch.update(employeeDocRef, { skills: filteredSkillsData });
    const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));
    for (const skillId in filteredSkillsData) {
        const proficiency = filteredSkillsData[skillId];
        const newHistoryRef = doc(skillHistoryCollection);
        const historyRecord = {
            employeeId: employee.id,
            employeeName: employee.name,
            skillId: skillId,
            skillName: allSkillsMap.get(skillId) || 'Unknown Skill',
            proficiency: proficiency,
            assessmentDate: serverTimestamp()
        };
        batch.set(newHistoryRef, historyRecord);
    }
    return batch.commit();
};

// --- SUPPLIERS API ---
const suppliersCollection = collection(db, 'suppliers');
export const getSuppliers = async () => {
    const snapshot = await getDocs(suppliersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addSupplier = (supplierData) => {
    return addDoc(suppliersCollection, supplierData);
};
export const deleteSupplier = (supplierId) => {
    const supplierDoc = doc(db, 'suppliers', supplierId);
    return deleteDoc(supplierDoc);
};
export const updateSupplier = (supplierId, updatedData) => {
    const supplierDoc = doc(db, 'suppliers', supplierId);
    return updateDoc(supplierDoc, updatedData);
};

// --- SUPPLIER ITEM PRICING API ---
const supplierItemPricingCollection = collection(db, 'supplierItemPricing');
export const getSupplierPricingForItem = async (itemId) => {
    if (!itemId) return [];
    const q = query(supplierItemPricingCollection, where('itemId', '==', itemId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addSupplierPrice = (priceData) => {
    return addDoc(supplierItemPricingCollection, priceData);
};
export const updateSupplierPrice = (priceId, updatedData) => {
    const priceDoc = doc(db, 'supplierItemPricing', priceId);
    return updateDoc(priceDoc, updatedData);
};
export const deleteSupplierPrice = (priceId) => {
    const priceDoc = doc(db, 'supplierItemPricing', priceId);
    return deleteDoc(priceDoc);
};

// --- INVENTORY APIs ---
const workshopSuppliesCollection = collection(db, 'workshopSupplies');
const componentsCollection = collection(db, 'components');
const rawMaterialsCollection = collection(db, 'rawMaterials');

export const getWorkshopSupplies = async () => {
    const snapshot = await getDocs(workshopSuppliesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addWorkshopSupply = (supplyData) => addDoc(workshopSuppliesCollection, { ...supplyData, associatedSkills: supplyData.associatedSkills || [] });
export const deleteWorkshopSupply = async (supplyId) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'workshopSupplies', supplyId));
    const pricingSnapshot = await getDocs(query(supplierItemPricingCollection, where('itemId', '==', supplyId)));
    pricingSnapshot.forEach(priceDoc => batch.delete(priceDoc.ref));
    return batch.commit();
};

export const getComponents = async () => {
    const snapshot = await getDocs(componentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addComponent = (componentData) => addDoc(componentsCollection, { ...componentData, associatedSkills: componentData.associatedSkills || [] });
export const deleteComponent = async (componentId) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'components', componentId));
    const pricingSnapshot = await getDocs(query(supplierItemPricingCollection, where('itemId', '==', componentId)));
    pricingSnapshot.forEach(priceDoc => batch.delete(priceDoc.ref));
    return batch.commit();
};

export const getRawMaterials = async () => {
    const snapshot = await getDocs(rawMaterialsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addRawMaterial = (materialData) => addDoc(rawMaterialsCollection, { ...materialData, associatedSkills: materialData.associatedSkills || [] });
export const deleteRawMaterial = async (materialId) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'rawMaterials', materialId));
    const pricingSnapshot = await getDocs(query(supplierItemPricingCollection, where('itemId', '==', materialId)));
    pricingSnapshot.forEach(priceDoc => batch.delete(priceDoc.ref));
    return batch.commit();
};

// --- MASTER INVENTORY API ---
export const getAllInventoryItems = async () => {
    const [components, rawMaterials, workshopSupplies] = await Promise.all([
        getComponents(), getRawMaterials(), getWorkshopSupplies()
    ]);
    return [
        ...components.map(item => ({ ...item, category: 'Component' })),
        ...rawMaterials.map(item => ({ ...item, category: 'Raw Material' })),
        ...workshopSupplies.map(item => ({ ...item, category: 'Workshop Supply' })),
    ];
};

// --- OVERHEADS API ---
const overheadsCategoriesCollection = collection(db, 'overheadsCategories');
export const getOverheadCategories = async () => {
    const snapshot = await getDocs(overheadsCategoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addOverheadCategory = (categoryData) => addDoc(overheadsCategoriesCollection, categoryData);
export const updateOverheadCategory = (categoryId, updatedData) => updateDoc(doc(db, 'overheadsCategories', categoryId), updatedData);
export const deleteOverheadCategory = async (categoryId) => {
    const categoryDocRef = doc(db, 'overheadsCategories', categoryId);
    const expensesSnapshot = await getDocs(collection(categoryDocRef, 'expenses'));
    const batch = writeBatch(db);
    expensesSnapshot.docs.forEach(expDoc => batch.delete(expDoc.ref));
    batch.delete(categoryDocRef);
    return batch.commit();
};
export const getOverheadExpenses = async (categoryId) => {
    const expensesCollectionRef = collection(db, 'overheadsCategories', categoryId, 'expenses');
    const snapshot = await getDocs(expensesCollectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addOverheadExpense = (categoryId, expenseData) => addDoc(collection(db, 'overheadsCategories', categoryId, 'expenses'), expenseData);
export const updateOverheadExpense = (categoryId, expenseId, updatedData) => updateDoc(doc(db, 'overheadsCategories', categoryId, 'expenses', expenseId), updatedData);
export const deleteOverheadExpense = (categoryId, expenseId) => deleteDoc(doc(db, 'overheadsCategories', categoryId, 'expenses', expenseId));

// --- PURCHASE QUEUE API ---
const purchaseQueueCollection = collection(db, 'purchaseQueue');
export const getPurchaseQueue = async () => {
    const snapshot = await getDocs(purchaseQueueCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const listenToPurchaseQueue = (callback) => {
    const q = query(purchaseQueueCollection, orderBy('queuedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
};
export const addToPurchaseQueue = (itemData) => {
    return addDoc(purchaseQueueCollection, { ...itemData, status: 'pending', queuedAt: serverTimestamp() });
};
export const markItemsAsOrdered = async (supplier, itemsToOrder, orderQuantities) => {
    if (!itemsToOrder || itemsToOrder.length === 0) return;
    const batch = writeBatch(db);
    const orderDate = new Date();
    const etaDays = supplier.estimatedEtaDays || 0;
    const expectedArrivalDate = new Date();
    expectedArrivalDate.setDate(orderDate.getDate() + Number(etaDays));
    itemsToOrder.forEach(item => {
        const docRef = doc(db, 'purchaseQueue', item.id);
        const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
        const orderQty = orderQuantities[item.id] || recommendedQty;
        batch.update(docRef, {
            status: 'ordered',
            orderDate: orderDate,
            expectedArrivalDate: expectedArrivalDate,
            orderedQty: Number(orderQty),
            orderedFromSupplierId: supplier.id,
            orderedFromSupplierName: supplier.name
        });
    });
    return batch.commit();
};
export const receiveStockAndUpdateInventory = async (queuedItem, quantityReceived) => {
    if (!queuedItem || !quantityReceived || quantityReceived <= 0) {
        throw new Error("Invalid item or quantity received.");
    }
    const itemCategory = queuedItem.category;
    const inventoryItemId = queuedItem.itemId;
    let inventoryCollectionName;
    if (itemCategory === 'Component') inventoryCollectionName = 'components';
    else if (itemCategory === 'Raw Material') inventoryCollectionName = 'rawMaterials';
    else if (itemCategory === 'Workshop Supply') inventoryCollectionName = 'workshopSupplies';
    else throw new Error(`Unknown inventory category: ${itemCategory}`);
    const inventoryDocRef = doc(db, inventoryCollectionName, inventoryItemId);
    const purchaseQueueDocRef = doc(db, 'purchaseQueue', queuedItem.id);
    return runTransaction(db, async (transaction) => {
        const inventoryDoc = await transaction.get(inventoryDocRef);
        if (!inventoryDoc.exists()) throw new Error("Original inventory item not found.");
        const newStockLevel = Number(inventoryDoc.data().currentStock || 0) + Number(quantityReceived);
        transaction.update(inventoryDocRef, { currentStock: newStockLevel });
        transaction.update(purchaseQueueDocRef, { status: 'completed' });
    });
};
export const requeueOrDeleteItem = async (queuedItem) => {
    const itemCategory = queuedItem.category.replace(' ', '');
    const inventoryCollectionName = `${itemCategory.charAt(0).toLowerCase() + itemCategory.slice(1)}s`;
    const inventoryDocRef = doc(db, inventoryCollectionName, queuedItem.itemId);
    const purchaseQueueDocRef = doc(db, 'purchaseQueue', queuedItem.id);
    const inventoryDoc = await getDoc(inventoryDocRef);
    if (!inventoryDoc.exists()) {
        return deleteDoc(purchaseQueueDocRef);
    }
    const itemData = inventoryDoc.data();
    if (itemData.currentStock < itemData.reorderLevel) {
        return updateDoc(purchaseQueueDocRef, { status: 'pending' });
    } else {
        return deleteDoc(purchaseQueueDocRef);
    }
};

// --- JOB STEP DETAILS API (RECIPES) ---
const jobStepDetailsCollection = collection(db, 'jobStepDetails');
export const getJobStepDetails = async () => {
    const snapshot = await getDocs(jobStepDetailsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const setJobStepDetail = (productId, departmentId, data) => {
    const recipeId = `${productId}_${departmentId}`;
    const docRef = doc(db, 'jobStepDetails', recipeId);
    return setDoc(docRef, { ...data, productId, departmentId });
};
export const getRecipeForProductDepartment = async (productId, departmentId) => {
    const recipeId = `${productId}_${departmentId}`;
    const docRef = doc(db, 'jobStepDetails', recipeId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// --- JOB CARDS API ---
const jobCardsCollection = collection(db, 'createdJobCards');
export const addJobCard = (jobCardData) => {
    return addDoc(jobCardsCollection, { ...jobCardData, createdAt: serverTimestamp() });
};
export const listenToJobCards = (callback) => {
    const q = query(jobCardsCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(jobs);
    });
};
export const getJobByJobId = async (jobId) => {
    const q = query(jobCardsCollection, where("jobId", "==", jobId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error(`No job found with ID: ${jobId}`);
    const jobDoc = querySnapshot.docs[0];
    return { id: jobDoc.id, ...jobDoc.data() };
};

export const updateJobStatus = async (docId, newStatus, options = {}) => {
    const jobDocRef = doc(db, 'createdJobCards', docId);
    const jobDoc = await getDoc(jobDocRef);
    if (!jobDoc.exists()) throw new Error("Job not found!");

    const currentData = jobDoc.data();
    const dataToUpdate = { status: newStatus };
    const { haltReason } = options;

    if (newStatus === 'In Progress') {
        if (!currentData.startedAt) dataToUpdate.startedAt = serverTimestamp();
        else if (currentData.status === 'Paused' && currentData.pausedAt) {
            dataToUpdate.totalPausedMilliseconds = increment(new Date().getTime() - currentData.pausedAt.toDate().getTime());
            dataToUpdate.pausedAt = null;
        }
    } else if (newStatus === 'Paused') {
        dataToUpdate.pausedAt = serverTimestamp();
    } else if (newStatus === 'Awaiting QC') {
        dataToUpdate.completedAt = serverTimestamp();
    } else if (newStatus === 'Halted - Issue') {
        dataToUpdate.haltedAt = serverTimestamp();
        dataToUpdate.issueLog = [
            ...(currentData.issueLog || []),
            { reason: haltReason, timestamp: serverTimestamp(), user: 'SYSTEM' } 
        ];
    }

    const scanEventRef = doc(collection(db, 'scanEvents'));
    const scanEventData = {
        employeeId: currentData.employeeId,
        employeeName: currentData.employeeName,
        jobId: currentData.jobId,
        statusUpdatedTo: newStatus,
        timestamp: serverTimestamp(),
        notes: haltReason ? `Halted: ${haltReason}` : ''
    };
    const batch = writeBatch(db);
    batch.update(jobDocRef, dataToUpdate);
    batch.set(scanEventRef, scanEventData);
    
    if (newStatus === 'Halted - Issue') {
        const notificationRef = doc(collection(db, 'notifications'));
        const notificationData = {
            message: `Job ${currentData.jobId} (${currentData.partName}) was halted. Reason: ${haltReason}`,
            type: 'job_halted',
            targetRole: 'Manager',
            jobId: currentData.jobId,
            createdAt: serverTimestamp(),
            read: false,
        };
        batch.set(notificationRef, notificationData);
    }
    
    return batch.commit();
};

export const processQcDecision = async (job, isApproved, options = {}) => {
    const { 
        rejectionReason = '', 
        preventStockDeduction = false, 
        reworkDetails = null 
    } = options;

    const allTools = await getTools();
    const toolsMap = new Map(allTools.map(t => [t.id, t]));
    
    return runTransaction(db, async (transaction) => {
        const jobRef = doc(db, 'createdJobCards', job.id);
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw "Job document does not exist!";
        
        const allInventory = await getAllInventoryItems();
        const inventoryMap = new Map(allInventory.map(item => [item.id, item]));
        const allEmployees = await getEmployees();
        const employeeMap = new Map(allEmployees.map(emp => [emp.id, emp]));
        const recipeId = `${job.partId || job.productId}_${job.departmentId}`;
        const recipeDocRef = doc(db, "jobStepDetails", recipeId);
        const recipeDoc = await transaction.get(recipeDocRef);
        const recipe = recipeDoc.exists() ? recipeDoc.data() : null;
        const currentJobData = jobDoc.data();
        const dataToUpdate = {};

        if (isApproved) {
            dataToUpdate.status = 'Complete';
            if (!currentJobData.completedAt) dataToUpdate.completedAt = serverTimestamp();
            
            // --- UPDATED: Final Cost Calculation ---
            const materialCost = (currentJobData.processedConsumables || []).reduce((sum, con) => {
                const price = con.price || 0;
                return sum + (price * con.quantity);
            }, 0);
            dataToUpdate.materialCost = materialCost;

            let laborCost = 0;
            const employee = employeeMap.get(currentJobData.employeeId);
            const hourlyRate = employee?.hourlyRate || 0;
            if (currentJobData.startedAt && hourlyRate > 0) {
                const completedAt = currentJobData.completedAt?.toDate() || new Date();
                const startedAt = currentJobData.startedAt.toDate();
                const pauseMs = currentJobData.totalPausedMilliseconds || 0;
                const activeHours = (completedAt.getTime() - startedAt.getTime() - pauseMs) / 3600000;
                laborCost = activeHours > 0 ? activeHours * hourlyRate : 0;
            }
            dataToUpdate.laborCost = laborCost;

            let machineCost = 0;
            if (recipe && recipe.tools) {
                const jobDurationHours = ((currentJobData.completedAt?.toDate() || new Date()).getTime() - currentJobData.startedAt.toDate().getTime() - (currentJobData.totalPausedMilliseconds || 0)) / 3600000;
                
                recipe.tools.forEach(toolId => {
                    const toolDetails = toolsMap.get(toolId);
                    if (toolDetails && toolDetails.hourlyRate > 0) {
                        machineCost += jobDurationHours * toolDetails.hourlyRate;
                    }
                });
            }
            dataToUpdate.machineCost = machineCost;
            dataToUpdate.totalCost = materialCost + laborCost + machineCost;

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

        if (!preventStockDeduction && currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) {
            for (const consumable of currentJobData.processedConsumables) {
                const inventoryItem = inventoryMap.get(consumable.id);
                if (!inventoryItem) continue;
                const collectionName = `${inventoryItem.category.replace(' ', '').charAt(0).toLowerCase()}${inventoryItem.category.replace(' ', '').slice(1)}s`;
                if (['components', 'rawMaterials', 'workshopSupplies'].includes(collectionName)) {
                    const itemRef = doc(db, collectionName, consumable.id);
                    transaction.update(itemRef, { currentStock: increment(-consumable.quantity) });
                    const newStockLevel = Number(inventoryItem.currentStock) - consumable.quantity;
                    if (newStockLevel < Number(inventoryItem.reorderLevel) && inventoryItem.currentStock >= Number(inventoryItem.reorderLevel)) {
                        const newQueueDocRef = doc(collection(db, 'purchaseQueue'));
                        transaction.set(newQueueDocRef, {
                            itemId: inventoryItem.id, itemName: inventoryItem.name, supplierId: inventoryItem.supplierId,
                            itemCode: inventoryItem.itemCode || '', category: inventoryItem.category, currentStock: newStockLevel,
                            reorderLevel: inventoryItem.reorderLevel, standardStockLevel: inventoryItem.standardStockLevel, price: inventoryItem.price,
                            unit: inventoryItem.unit, status: 'pending', queuedAt: serverTimestamp()
                        });
                    }
                }
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

// --- UNIFIED PRODUCT CATALOG API ---
const productsCollection = collection(db, 'products');
const productCategoriesCollection = collection(db, 'productCategories');
const productRecipeLinksCollection = collection(db, 'productRecipeLinks');
export const getProductCategories = async () => {
    const snapshot = await getDocs(query(productCategoriesCollection, orderBy('name')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addProductCategory = (categoryName) => addDoc(productCategoriesCollection, { name: categoryName });
export const deleteProductCategory = (categoryId) => deleteDoc(doc(db, 'productCategories', categoryId));
export const getProducts = async () => {
    const snapshot = await getDocs(query(productsCollection, orderBy('name')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addProduct = async (productData) => {
    const q = query(productsCollection, where("partNumber", "==", productData.partNumber));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) throw new Error(`A product with Part Number "${productData.partNumber}" already exists.`);
    return addDoc(productsCollection, { ...productData, sellingPrice: Number(productData.sellingPrice) || 0, createdAt: serverTimestamp() });
};
export const updateProduct = (productId, updatedData) => updateDoc(doc(db, 'products', productId), updatedData);
export const deleteProduct = async (productId) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'products', productId));
    const recipeLinkSnapshot = await getDocs(query(productRecipeLinksCollection, where('productId', '==', productId)));
    recipeLinkSnapshot.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
};
export const getLinkedRecipesForProduct = async (productId) => {
    const q = query(productRecipeLinksCollection, where('productId', '==', productId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const linkRecipeToProduct = (linkData) => addDoc(productRecipeLinksCollection, linkData);
export const unlinkRecipeFromProduct = (linkId) => deleteDoc(doc(db, 'productRecipeLinks', linkId));

// --- PAYROLL & REPORTING API ---
export const getCompletedJobsInRange = async (startDate, endDate) => {
    const q = query(jobCardsCollection, where('status', '==', 'Complete'), where('completedAt', '>=', startDate), where('completedAt', '<=', endDate));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const getCompletedJobsForEmployee = async (employeeId) => {
    if (!employeeId) return [];
    const q = query(jobCardsCollection, where('employeeId', '==', employeeId), where('status', 'in', ['Complete', 'Issue', 'Archived - Issue']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- USER MANAGEMENT API ---
const usersCollection = collection(db, 'users');
export const getAllUsers = async () => {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const updateUserRole = async (userId, newRole) => {
    return setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
};
export const createUserWithRole = async (email, password, role) => {
    const functionUrl = 'https://us-central1-tojem-os-production.cloudfunctions.net/createUserAndSetRole';
    const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create user.');
    return data;
};
export const deleteUserWithRole = async (userId) => {
    const functionUrl = 'https://us-central1-tojem-os-production.cloudfunctions.net/deleteUserAndRole';
    const response = await fetch(functionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete user.');
    return data;
};

// --- ROLES API (NEW) ---
export const getRoles = async () => {
    const rolesCollection = collection(db, 'roles');
    const snapshot = await getDocs(rolesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- MARKETING & SALES API ---
const marketingCampaignsCollection = collection(db, 'marketingCampaigns');
export const getCampaigns = async () => {
    const snapshot = await getDocs(query(marketingCampaignsCollection, orderBy('startDate', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addCampaign = (campaignData) => {
    return addDoc(marketingCampaignsCollection, {
        ...campaignData,
        leadsGenerated: 0,
        createdAt: serverTimestamp()
    });
};
export const updateCampaign = (campaignId, updatedData) => {
    const campaignDoc = doc(db, 'marketingCampaigns', campaignId);
    if (updatedData.leadsGenerated !== undefined) {
        updatedData.leadsGenerated = Number(updatedData.leadsGenerated) || 0;
    }
    return updateDoc(campaignDoc, updatedData);
};
export const deleteCampaign = (campaignId) => {
    const campaignDoc = doc(db, 'marketingCampaigns', campaignId);
    return deleteDoc(campaignDoc);
};

// --- TRAINING RESOURCES API ---
const trainingResourcesCollection = collection(db, 'trainingResources');
export const getTrainingResources = async () => {
    const snapshot = await getDocs(trainingResourcesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addTrainingResource = (data) => {
    return addDoc(trainingResourcesCollection, data);
};
export const updateTrainingResource = (id, data) => {
    const resourceDoc = doc(db, 'trainingResources', id);
    return updateDoc(resourceDoc, data);
};
export const deleteTrainingResource = (id) => {
    const resourceDoc = doc(db, 'trainingResources', id);
    return deleteDoc(resourceDoc);
};

// --- SUBCONTRACTOR LOGS API ---
const subcontractorAdHocLogsCollection = collection(db, 'subcontractorAdHocLogs');
const subcontractorTeamLogsCollection = collection(db, 'subcontractorTeamLogs');
export const addSubcontractorAdHocLog = (logData) => {
    return addDoc(subcontractorAdHocLogsCollection, { ...logData, createdAt: serverTimestamp() });
};
export const addSubcontractorTeamLog = (logData) => {
    return addDoc(subcontractorTeamLogsCollection, { ...logData, createdAt: serverTimestamp() });
};

// --- QUOTES API ---
const quotesCollection = collection(db, 'quotes');
export const addQuote = (quoteData) => {
    return addDoc(quotesCollection, { ...quoteData, status: 'draft', createdAt: serverTimestamp() });
};

// --- REWORK REASONS API ---
export const getReworkReasons = async () => {
    const reasonsCollection = collection(db, 'reworkReasons');
    const q = query(reasonsCollection, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- KUDOS API ---
export const giveKudosToJob = (jobId) => {
    const jobDocRef = doc(db, 'createdJobCards', jobId);
    return updateDoc(jobDocRef, { kudos: true });
};

// --- JOB CARD ADJUSTMENT API ---
export const updateJobCardWithAdjustments = (jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId) => {
    const updateFn = httpsCallable(functions, 'updateJobCardWithAdjustments');
    return updateFn({ jobId, timeAdjustment, consumableAdjustments, adjustmentReason, userId });
};

// --- FETCH JOBS AWAITING QC ---
export const getJobsAwaitingQC = async () => {
    const q = query(jobCardsCollection, where('status', '==', 'Awaiting QC'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};


// --- SALES ORDERS & ONE-OFF PURCHASES ---
const salesOrdersCollection = collection(db, 'salesOrders');
const oneOffPurchasesCollection = collection(db, 'oneOffPurchases');

export const createSalesOrderFromQuote = async (quote) => {
    const batch = writeBatch(db);
    const salesOrderRef = doc(salesOrdersCollection);
    const salesOrderData = {
        salesOrderId: `SO-${quote.quoteId.replace('Q-', '')}`,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        total: quote.total,
        status: 'Pending Production',
        createdAt: serverTimestamp(),
        lineItems: quote.lineItems.map(item => ({
            ...item,
            id: doc(collection(db, '_')).id,
            status: 'Pending'
        }))
    };
    batch.set(salesOrderRef, salesOrderData);
    const quoteRef = doc(db, 'quotes', quote.id);
    batch.update(quoteRef, { status: 'Accepted' });
    return batch.commit();
};

export const listenToSalesOrders = (callback) => {
    const q = query(salesOrdersCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(orders);
    });
};

export const listenToOneOffPurchases = (callback) => {
    const q = query(oneOffPurchasesCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
};

export const addPurchasedItemToQueue = (lineItem, salesOrder) => {
    return addDoc(oneOffPurchasesCollection, {
        itemName: lineItem.description,
        quantity: lineItem.quantity,
        estimatedCost: lineItem.unitCost,
        salesOrderId: salesOrder.salesOrderId,
        customerName: salesOrder.customerName,
        status: 'Pending Purchase',
        createdAt: serverTimestamp()
    });
};

export const markOneOffItemsAsOrdered = async (itemIds) => {
    const batch = writeBatch(db);
    itemIds.forEach(id => {
        const docRef = doc(db, 'oneOffPurchases', id);
        batch.update(docRef, { status: 'Ordered' });
    });
    return batch.commit();
};

export const updateSalesOrderLineItemStatus = async (orderId, lineItemId, newStatus) => {
    const orderRef = doc(db, 'salesOrders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists()) {
        throw new Error("Sales Order not found");
    }
    const orderData = orderDoc.data();
    const updatedLineItems = orderData.lineItems.map(item =>
        item.id === lineItemId ? { ...item, status: newStatus } : item
    );
    return updateDoc(orderRef, { lineItems: updatedLineItems });
};

// --- STOCK TAKE API (NEW) ---
export const reconcileStockLevels = async (itemsToReconcile) => {
    const batch = writeBatch(db);

    for (const item of itemsToReconcile) {
        let collectionName;
        switch (item.category) {
            case 'Component':
                collectionName = 'components';
                break;
            case 'Raw Material':
                collectionName = 'rawMaterials';
                break;
            case 'Workshop Supply':
                collectionName = 'workshopSupplies';
                break;
            default:
                console.warn(`Unknown category "${item.category}" for item ${item.name}. Skipping.`);
                continue;
        }

        const itemRef = doc(db, collectionName, item.id);
        batch.update(itemRef, { currentStock: item.newCount });
    }

    return batch.commit();
};


// Export `collection`, `query`, and `where` to be used in other files if needed
export { collection, query, where, getDocs };
