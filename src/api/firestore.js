// src/api/firestore.js (UPDATED with getDocs and query)
// FILE: src/api/firestore.js

// CORRECTED: All functions are imported in a single, clean statement.
// ADDED getDocs, query, where to support new dashboard queries
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
} from 'firebase/firestore';
// CORRECTED: We only import the 'db' instance, we don't re-initialize the app here.
import { db } from './firebase';

// --- DEPARTMENTS API ---
const departmentsCollection = collection(db, 'departments');
export const getDepartments = async () => {
    const snapshot = await getDocs(departmentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addDepartment = (departmentName) => {
    return addDoc(departmentsCollection, { name: departmentName, requiredSkills: [] }); // Initialize with empty requiredSkills array
};
export const deleteDepartment = (departmentId) => {
    const departmentDoc = doc(db, 'departments', departmentId);
    return deleteDoc(departmentDoc);
};

// NEW: Function to update a department's required skills
export const updateDepartmentRequiredSkills = async (departmentId, requiredSkillsData) => {
    const departmentDocRef = doc(db, 'departments', departmentId);
    // Filter out skills that are explicitly "not required" (e.g., both prof and importance are 0)
    const filteredSkillsData = requiredSkillsData.filter(skill =>
        skill.minimumProficiency > 0 || skill.importanceWeight > 0
    );
    return updateDoc(departmentDocRef, { requiredSkills: filteredSkillsData });
};


// MODIFIED: getDepartmentSkills to fetch the new object structure
export const getDepartmentSkills = async (departmentId) => {
    if (!departmentId) return [];
    const departmentDocRef = doc(db, 'departments', departmentId);
    const departmentDoc = await getDoc(departmentDocRef);
    if (departmentDoc.exists()) {
        const data = departmentDoc.data();
        // It will now return an array of objects: [{ skillId, minimumProficiency, importanceWeight }]
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


// Helper function to get the name of a skill given its ID (needed for display/mapping)
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
// MODIFIED: addTool to accept associatedSkills
export const addTool = (toolData) => {
    // toolData should now include { name, associatedSkills: [] }
    return addDoc(toolsCollection, { ...toolData, associatedSkills: toolData.associatedSkills || [] });
};
// MODIFIED: deleteTool remains the same
export const deleteTool = (toolId) => {
    const toolDoc = doc(db, 'tools', toolId);
    return deleteDoc(toolDoc);
};
// MODIFIED: updateDocument (generic update) will handle tool updates, so specific updateTool isn't strictly needed if using generic.
// However, if there was a dedicated updateTool, it would also need to handle associatedSkills.
// Since you're using updateDocument in ToolsManager, this is covered.


// --- TOOL ACCESSORIES API ---
const toolAccessoriesCollection = collection(db, 'toolAccessories');
export const getToolAccessories = async () => {
    const snapshot = await getDocs(toolAccessoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// MODIFIED: addToolAccessory to accept associatedSkills
export const addToolAccessory = (accessoryData) => {
    // accessoryData should now include { name, toolId, associatedSkills: [] }
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
        // Ensure skills are retrieved and numerical values are handled
        const skillsData = employeeDoc.data().skills || {};
        // Convert any old string proficiencies to a numerical equivalent if necessary
        // For existing 'Beginner', 'Intermediate', 'Expert' data, you might need a one-time migration or conversion logic here.
        // For now, we'll assume new data will be numerical.
        return skillsData;
    }
    return {};
};

// MODIFIED: updateEmployeeSkillsAndLogHistory to store numerical proficiency
export const updateEmployeeSkillsAndLogHistory = async (employee, skillsData, allSkills) => {
    const employeeDocRef = doc(db, 'employees', employee.id);
    const batch = writeBatch(db);

    // Filter out skills with a proficiency of 0 (Not Acquired/No Skill)
    const filteredSkillsData = {};
    for (const skillId in skillsData) {
        if (skillsData[skillId] > 0) { // Only save if proficiency is > 0
            filteredSkillsData[skillId] = skillsData[skillId];
        }
    }

    batch.update(employeeDocRef, { skills: filteredSkillsData }); // Store numerical ratings

    const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));
    for (const skillId in filteredSkillsData) { // Only log history for saved skills (> 0)
        const proficiency = filteredSkillsData[skillId];
        const newHistoryRef = doc(skillHistoryCollection);
        const historyRecord = {
            employeeId: employee.id,
            employeeName: employee.name,
            skillId: skillId,
            skillName: allSkillsMap.get(skillId) || 'Unknown Skill',
            proficiency: proficiency, // This will now be a number (0-5)
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

// --- INVENTORY APIs ---
const workshopSuppliesCollection = collection(db, 'workshopSupplies');
const componentsCollection = collection(db, 'components');
const rawMaterialsCollection = collection(db, 'rawMaterials');

export const getWorkshopSupplies = async () => {
    const snapshot = await getDocs(workshopSuppliesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// MODIFIED: addWorkshopSupply to accept associatedSkills
export const addWorkshopSupply = (supplyData) => addDoc(workshopSuppliesCollection, { ...supplyData, associatedSkills: supplyData.associatedSkills || [] });
export const deleteWorkshopSupply = (supplyId) => deleteDoc(doc(db, 'workshopSupplies', supplyId));
// updateWorkshopSupply uses generic updateDocument

export const getComponents = async () => {
    const snapshot = await getDocs(componentsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// MODIFIED: addComponent to accept associatedSkills
export const addComponent = (componentData) => addDoc(componentsCollection, { ...componentData, associatedSkills: componentData.associatedSkills || [] });
export const deleteComponent = (componentId) => deleteDoc(doc(db, 'components', componentId));
// updateComponent uses generic updateDocument

export const getRawMaterials = async () => {
    const snapshot = await getDocs(rawMaterialsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
// MODIFIED: addRawMaterial to accept associatedSkills
export const addRawMaterial = (materialData) => addDoc(rawMaterialsCollection, { ...materialData, associatedSkills: materialData.associatedSkills || [] });
export const deleteRawMaterial = (materialId) => deleteDoc(doc(db, 'rawMaterials', materialId));
// updateRawMaterial uses generic updateDocument


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
            orderedQty: Number(orderQty)
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

// --- OLD PRODUCT CATALOG API (DEPRECATED BUT USED BY JOB CREATOR) ---
const manufacturersCollection = collection(db, 'manufacturers');
const makesCollection = collection(db, 'makes');
const modelsCollection = collection(db, 'models');
const partsCollection = collection(db, 'parts');
export const getManufacturers = async () => {
    const q = query(manufacturersCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addManufacturer = (name) => addDoc(manufacturersCollection, { name });
export const getMakes = async () => {
    const q = query(makesCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addMake = (data) => addDoc(makesCollection, data);
export const getModels = async () => {
    const q = query(modelsCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addModel = (data) => addDoc(modelsCollection, data);
export const getParts = async () => {
    const q = query(partsCollection, orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addPart = (data) => addDoc(partsCollection, data);
export const updatePart = (partId, updatedData) => updateDoc(doc(db, 'parts', partId), updatedData);

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
export const updateJobStatus = async (docId, newStatus) => {
    const jobDocRef = doc(db, 'createdJobCards', docId);
    const jobDoc = await getDoc(jobDocRef);
    if (!jobDoc.exists()) throw new Error("Job not found!");
    const currentData = jobDoc.data();
    const dataToUpdate = { status: newStatus };
    if (newStatus === 'In Progress') {
        if (!currentData.startedAt) dataToUpdate.startedAt = serverTimestamp();
        else if (currentData.status === 'Paused' && currentData.pausedAt) {
            dataToUpdate.totalPausedMilliseconds = increment(new Date().getTime() - currentData.pausedAt.toDate().getTime());
            dataToUpdate.pausedAt = null;
        }
    } else if (newStatus === 'Paused') dataToUpdate.pausedAt = serverTimestamp();
    else if (newStatus === 'Awaiting QC') dataToUpdate.completedAt = serverTimestamp();
    return updateDoc(jobDocRef, dataToUpdate);
};
export const processQcDecision = async (job, isApproved, rejectionReason = '') => {
    return runTransaction(db, async (transaction) => {
        const jobRef = doc(db, 'createdJobCards', job.id);
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw "Job document does not exist!";

        const allInventory = await getAllInventoryItems();
        const inventoryMap = new Map(allInventory.map(item => [item.id, item]));
        const allEmployees = await getEmployees();
        const employeeMap = new Map(allEmployees.map(emp => [emp.id, emp]));

        const currentJobData = jobDoc.data();
        const dataToUpdate = {};
        if (isApproved) {
            dataToUpdate.status = 'Complete';
            if (!currentJobData.completedAt) dataToUpdate.completedAt = serverTimestamp();

            let materialCost = 0;
            if (currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) {
                for (const consumable of currentJobData.processedConsumables) {
                    const price = consumable.price !== undefined ? consumable.price : (inventoryMap.get(consumable.id)?.price || 0);
                    materialCost += (price * consumable.quantity);
                }
            }
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
            dataToUpdate.totalCost = materialCost + laborCost;

        } else {
            dataToUpdate.status = 'Issue';
            dataToUpdate.issueReason = rejectionReason;
        }
        transaction.update(jobRef, dataToUpdate);
        if (isApproved && currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) {
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

// --- UNIFIED PRODUCT CATALOG API v3 ---
const productsCollection = collection(db, 'products');
const productCategoriesCollection = collection(db, 'productCategories');
const fitmentCollection = collection(db, 'fitment');
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
    const fitmentSnapshot = await getDocs(query(fitmentCollection, where('productId', '==', productId)));
    fitmentSnapshot.forEach(doc => batch.delete(doc.ref));
    const recipeLinkSnapshot = await getDocs(query(productRecipeLinksCollection, where('productId', '==', productId)));
    recipeLinkSnapshot.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
};
export const getFitmentForProduct = async (productId) => {
    const q = query(fitmentCollection, where('productId', '==', productId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addFitment = (productId, modelId, modelName, makeName, manufacturerName) => {
    return addDoc(fitmentCollection, { productId, modelId, modelName, makeName, manufacturerName });
};
export const removeFitment = (fitmentId) => deleteDoc(doc(db, 'fitment', fitmentId));
export const getLinkedRecipesForProduct = async (productId) => {
    const q = query(productRecipeLinksCollection, where('productId', '==', productId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const linkRecipeToProduct = (linkData) => addDoc(productRecipeLinksCollection, linkData);
export const unlinkRecipeFromProduct = (linkId) => deleteDoc(doc(db, 'productRecipeLinks', linkId));

// --- PAYROLL & REPORTING API FUNCTIONS ---
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

// --- USER MANAGEMENT API FUNCTIONS ---
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
/// --- MARKETING & SALES API FUNCTIONS (UPDATED) ---
const marketingCampaignsCollection = collection(db, 'marketingCampaigns');
export const getCampaigns = async () => {
  const snapshot = await getDocs(query(marketingCampaignsCollection, orderBy('startDate', 'desc')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCampaign = (campaignData) => {
  // Add leadsGenerated with a default value of 0
  return addDoc(marketingCampaignsCollection, {
    ...campaignData,
    leadsGenerated: 0,
    createdAt: serverTimestamp()
  });
};

export const updateCampaign = (campaignId, updatedData) => {
  const campaignDoc = doc(db, 'marketingCampaigns', campaignId);
  // Ensure leadsGenerated is stored as a number
  if (updatedData.leadsGenerated !== undefined) {
      updatedData.leadsGenerated = Number(updatedData.leadsGenerated) || 0;
  }
  return updateDoc(campaignDoc, updatedData);
};

export const deleteCampaign = (campaignId) => {
  const campaignDoc = doc(db, 'marketingCampaigns', campaignId);
  return deleteDoc(campaignDoc);
};

// Export `collection`, `query`, and `where` to be used in other files if needed
export { collection, query, where, getDocs };
