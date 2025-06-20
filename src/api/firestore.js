import { db } from './firebase'; // Ensure 'db' is correctly imported from your firebase.js setup
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy, updateDoc, where, getDoc, writeBatch, setDoc, runTransaction, increment, limit, startAfter } from 'firebase/firestore'; 

// --- DEPARTMENTS API ---
const departmentsCollection = collection(db, 'departments'); 
export const getDepartments = async () => { 
  const snapshot = await getDocs(departmentsCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addDepartment = (departmentName) => { 
  return addDoc(departmentsCollection, { name: departmentName }); 
};
export const deleteDepartment = (departmentId) => { 
  const departmentDoc = doc(db, 'departments', departmentId); 
  return deleteDoc(departmentDoc); 
};

// --- TOOLS API ---
const toolsCollection = collection(db, 'tools'); 
export const getTools = async () => { 
  const snapshot = await getDocs(toolsCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addTool = (toolName) => { 
  return addDoc(toolsCollection, { name: toolName }); 
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
    return addDoc(toolAccessoriesCollection, accessoryData); 
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

// --- WORKSHOP SUPPLIES API ---
const workshopSuppliesCollection = collection(db, 'workshopSupplies'); 
export const getWorkshopSupplies = async () => { 
  const snapshot = await getDocs(workshopSuppliesCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addWorkshopSupply = (supplyData) => { 
  return addDoc(workshopSuppliesCollection, supplyData); 
};
export const deleteWorkshopSupply = (supplyId) => { 
  const supplyDoc = doc(db, 'workshopSupplies', supplyId); 
  return deleteDoc(supplyDoc); 
};
export const updateWorkshopSupply = (supplyId, updatedData) => { 
    const supplyDoc = doc(db, 'workshopSupplies', supplyId); 
    return updateDoc(supplyDoc, updatedData); 
};

// --- COMPONENTS API ---
const componentsCollection = collection(db, 'components'); 
export const getComponents = async () => { 
  const snapshot = await getDocs(componentsCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addComponent = (componentData) => { 
  return addDoc(componentsCollection, componentData); 
};
export const deleteComponent = (componentId) => { 
  const componentDoc = doc(db, 'components', componentId); 
  return deleteDoc(componentDoc); 
};
export const updateComponent = (componentId, updatedData) => { 
    const componentDoc = doc(db, 'components', componentId); 
    return updateDoc(componentDoc, updatedData); 
};

// --- RAW MATERIALS API ---
const rawMaterialsCollection = collection(db, 'rawMaterials'); 
export const getRawMaterials = async () => { 
  const snapshot = await getDocs(rawMaterialsCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addRawMaterial = (materialData) => { 
  return addDoc(rawMaterialsCollection, materialData); 
};
export const deleteRawMaterial = (materialId) => { 
  const materialDoc = doc(db, 'rawMaterials', materialId); 
  return deleteDoc(materialDoc); // FIXED: Ensure this uses materialDoc, not materialId
};
export const updateRawMaterial = (materialId, updatedData) => { 
    const materialDoc = doc(db, 'rawMaterials', materialId); 
    return updateDoc(materialDoc, updatedData); 
};

// --- OVERHEADS API (UPDATED FOR CATEGORIES AND EXPENSES) ---
const overheadsCategoriesCollection = collection(db, 'overheadsCategories'); // Top-level collection for categories
export const getOverheadCategories = async () => {
    const snapshot = await getDocs(overheadsCategoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addOverheadCategory = (categoryData) => { // Changed param name to categoryData for consistency
    return addDoc(overheadsCategoriesCollection, categoryData); // Pass the full object
};

export const updateOverheadCategory = (categoryId, updatedData) => {
    const categoryDoc = doc(db, 'overheadsCategories', categoryId);
    return updateDoc(categoryDoc, updatedData);
};

export const deleteOverheadCategory = async (categoryId) => {
    const categoryDocRef = doc(db, 'overheadsCategories', categoryId);
    // IMPORTANT: When deleting a category, you typically want to delete its sub-expenses too.
    // This requires fetching and deleting all documents within the subcollection first.
    const expensesSnapshot = await getDocs(collection(categoryDocRef, 'expenses'));
    const batch = writeBatch(db);
    expensesSnapshot.docs.forEach(expDoc => {
        batch.delete(expDoc.ref);
    });
    batch.delete(categoryDocRef); // Then delete the category document itself
    return batch.commit();
};

// Sub-collection expenses API
export const getOverheadExpenses = async (categoryId) => {
    const expensesCollectionRef = collection(db, 'overheadsCategories', categoryId, 'expenses');
    const snapshot = await getDocs(expensesCollectionRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addOverheadExpense = (categoryId, expenseData) => {
    const expensesCollectionRef = collection(db, 'overheadsCategories', categoryId, 'expenses');
    return addDoc(expensesCollectionRef, expenseData);
};

export const updateOverheadExpense = (categoryId, expenseId, updatedData) => {
    const expenseDocRef = doc(db, 'overheadsCategories', categoryId, 'expenses', expenseId);
    return updateDoc(expenseDocRef, updatedData);
};

export const deleteOverheadExpense = (categoryId, expenseId) => {
    const expenseDocRef = doc(db, 'overheadsCategories', categoryId, 'expenses', expenseId);
    return deleteDoc(expenseDocRef);
};


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
    const batch = writeBatch(db); 
    const inventoryDoc = await getDoc(inventoryDocRef); 
    if (!inventoryDoc.exists()) throw new Error("Original inventory item not found."); 
    const currentStock = inventoryDoc.data().currentStock || 0; 
    const newStockLevel = Number(currentStock) + Number(quantityReceived); 
    batch.update(inventoryDocRef, { currentStock: newStockLevel }); 
    batch.update(purchaseQueueDocRef, { status: 'completed' }); 
    return batch.commit(); 
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
        getComponents(), 
        getRawMaterials(), 
        getWorkshopSupplies() 
    ]);
    const allItems = [ 
        ...components.map(item => ({ ...item, category: 'Component' })), 
        ...rawMaterials.map(item => ({ ...item, category: 'Raw Material' })), 
        ...workshopSupplies.map(item => ({ ...item, category: 'Workshop Supply' })), 
    ];
    return allItems; 
};

// --- JOB STEP DETAILS API ---
const jobStepDetailsCollection = collection(db, 'jobStepDetails'); 
export const getJobStepDetails = async () => { 
    const snapshot = await getDocs(jobStepDetailsCollection); 
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const setJobStepDetail = (partId, departmentId, data) => { 
    const docRef = doc(db, 'jobStepDetails', `<span class="math-inline">\{partId\}\_</span>{departmentId}`); 
    return setDoc(docRef, { ...data, partId, departmentId }); 
};

// --- PRODUCT CATALOG API ---
const manufacturersCollection = collection(db, 'manufacturers'); 
const makesCollection = collection(db, 'makes'); 
const modelsCollection = collection(db, 'models'); 
const partsCollection = collection(db, 'parts'); 
export const getManufacturers = async () => { 
  const snapshot = await getDocs(manufacturersCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addManufacturer = (name) => addDoc(manufacturersCollection, { name }); 
export const getMakes = async () => { 
  const snapshot = await getDocs(makesCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addMake = (data) => addDoc(makesCollection, data); 
export const getModels = async () => { 
  const snapshot = await getDocs(modelsCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addModel = (data) => addDoc(modelsCollection, data); 
export const getParts = async () => { 
  const snapshot = await getDocs(partsCollection); 
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const addPart = (data) => addDoc(partsCollection, data); 
export const updatePart = (partId, updatedData) => { 
  const partDoc = doc(db, 'parts', partId); 
  return updateDoc(partDoc, updatedData); 
};

// --- JOB CARDS API ---
const jobCardsCollection = collection(db, 'createdJobCards'); 
export const searchPreviousJobs = async (searchText) => { 
    if (!searchText) return []; 
    // Firestore doesn't support case-insensitive "contains" or "like" queries natively.
    // This is a common workaround for "starts with" searches.
    const q = query( 
        jobCardsCollection, 
        where('partName', '>=', searchText), 
        where('partName', '<=', searchText + '\uf8ff'), 
        orderBy('partName'), 
        orderBy('createdAt', 'desc'), 
        limit(10) 
    );
    const snapshot = await getDocs(q); 
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
};
export const checkExistingJobRecipe = async (partId, departmentId) => { 
  if (!partId || !departmentId) { 
    return false; 
  }
  // This check is specifically for existing job *cards* that link to a specific partId and departmentId
  // It implies a recipe has been used before for this combo.
  const q = query( 
    jobCardsCollection, 
    where('partId', '==', partId), 
    where('departmentId', '==', departmentId),
    limit(1) // We only need to know if one exists
  );
  const snapshot = await getDocs(q); 
  return !snapshot.empty; 
};
export const addJobCard = (jobCardData) => { 
  return addDoc(jobCardsCollection, { 
    ...jobCardData, 
    createdAt: serverTimestamp() 
  });
};
export const listenToJobCards = (callback) => { 
  const q = query(jobCardsCollection, orderBy('createdAt', 'desc')); 
  const unsubscribe = onSnapshot(q, (snapshot) => { 
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
    callback(jobs); 
  });
  return unsubscribe; 
};
export const getJobByJobId = async (jobId) => { 
  const q = query(jobCardsCollection, where("jobId", "==", jobId)); 
  const querySnapshot = await getDocs(q); 
  if (querySnapshot.empty) { 
    throw new Error(`No job found with ID: ${jobId}`); 
  }
  const jobDoc = querySnapshot.docs[0]; 
  return { id: jobDoc.id, ...jobDoc.data() }; 
};
export const updateJobStatus = async (docId, newStatus) => { 
    const jobDocRef = doc(db, 'createdJobCards', docId); 
    const jobDoc = await getDoc(jobDocRef); 
    if (!jobDoc.exists()) { 
        throw new Error("Job not found!"); 
    }
    const currentData = jobDoc.data(); 
    const dataToUpdate = { 
        status: newStatus, 
    };
    if (newStatus === 'In Progress') { 
        if (!currentData.startedAt) { 
            dataToUpdate.startedAt = serverTimestamp(); 
        }
        else if (currentData.status === 'Paused' && currentData.pausedAt) { 
            const pauseDuration = new Date().getTime() - currentData.pausedAt.toDate().getTime(); 
            dataToUpdate.totalPausedMilliseconds = increment(pauseDuration); 
            // We also clear pausedAt when resuming from Paused to In Progress
            dataToUpdate.pausedAt = null; 
        }
    }
    else if (newStatus === 'Paused') { 
        dataToUpdate.pausedAt = serverTimestamp(); 
    }
    else if (newStatus === 'Awaiting QC') { 
        dataToUpdate.completedAt = serverTimestamp(); 
    }
    return updateDoc(jobDocRef, dataToUpdate); 
};
export const processQcDecision = async (job, isApproved, rejectionReason = '') => { 
  const allInventory = await getAllInventoryItems(); 
  const inventoryMap = new Map(allInventory.map(item => [item.id, item])); 
  const allEmployees = await getEmployees(); 
  const employeeMap = new Map(allEmployees.map(emp => [emp.id, emp])); 
  return runTransaction(db, async (transaction) => { 
    const jobRef = doc(db, 'createdJobCards', job.id); 
    const jobDoc = await transaction.get(jobRef); 
    if (!jobDoc.exists()) { 
        throw "Job document does not exist!"; 
    }
    const currentJobData = jobDoc.data(); 
    const dataToUpdate = {}; 
    if (isApproved) { 
        dataToUpdate.status = 'Complete'; 
        dataToUpdate.completedAt = serverTimestamp(); // Set completion time on approval
        let materialCost = 0; 
        let laborCost = 0; 
        // Processed consumables might already be on the job if it was a custom job or a cloned job without a standard recipe
        if (currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) { 
            for (const consumable of currentJobData.processedConsumables) { 
                const inventoryItem = inventoryMap.get(consumable.id); // Try to get from inventory based on ID
                if (inventoryItem && inventoryItem.price !== undefined) { // If it's a known inventory item and has a price
                    materialCost += (inventoryItem.price * consumable.quantity); 
                } else if (consumable.price !== undefined) { // If the custom consumable itself has a price defined directly
                    materialCost += (consumable.price * consumable.quantity);
                }
            }
        }
        dataToUpdate.materialCost = materialCost; 
        const employee = employeeMap.get(currentJobData.employeeId); 
        const hourlyRate = employee?.hourlyRate || 0; 
        if (currentJobData.startedAt && hourlyRate > 0) { 
            let activeSeconds = (new Date().getTime() - currentJobData.startedAt.toDate().getTime()) / 1000; 
            if (currentJobData.totalPausedMilliseconds) { 
                activeSeconds -= Math.floor(currentJobData.totalPausedMilliseconds / 1000); 
            }
            const activeHours = activeSeconds > 0 ? activeSeconds / 3600 : 0; 
            laborCost = activeHours * hourlyRate; 
        }
        dataToUpdate.laborCost = laborCost; 
        dataToUpdate.totalCost = materialCost + laborCost; 
    } else { 
      dataToUpdate.status = 'Issue'; 
      dataToUpdate.issueReason = rejectionReason; 
    }
    transaction.update(jobRef, dataToUpdate); 
    
    // Only deduct stock if job is approved AND processedConsumables are linked to actual inventory items
    if (isApproved && currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) { 
        for (const consumable of currentJobData.processedConsumables) { 
            const inventoryItem = inventoryMap.get(consumable.id); // Check if it's a real inventory item by ID
            if (!inventoryItem) continue; // Skip deduction if not a recognized inventory item (e.g., free-text custom consumable without linked ID)

            let collectionName = ''; 
            if (inventoryItem.category === 'Component') collectionName = 'components'; 
            else if (inventoryItem.category === 'Raw Material') collectionName = 'rawMaterials'; 
            else if (inventoryItem.category === 'Workshop Supply') collectionName = 'workshopSupplies'; 
            
            if (collectionName) { 
                const itemRef = doc(db, collectionName, consumable.id); 
                transaction.update(itemRef, { currentStock: increment(-consumable.quantity) }); 
                const currentStock = Number(inventoryItem.currentStock); 
                const reorderLevel = Number(inventoryItem.reorderLevel); 
                const newStockLevel = currentStock - consumable.quantity; 
                if (reorderLevel > 0 && currentStock >= reorderLevel && newStockLevel < reorderLevel) { 
                    const newQueueDocRef = doc(collection(db, 'purchaseQueue')); 
                    transaction.set(newQueueDocRef, { 
                        itemId: inventoryItem.id, itemName: inventoryItem.name, supplierId: inventoryItem.supplierId, 
                        itemCode: inventoryItem.itemCode || '', category: inventoryItem.category, currentStock: newStockLevel, 
                        reorderLevel: reorderLevel, standardStockLevel: inventoryItem.standardStockLevel, price: inventoryItem.price, 
                        unit: inventoryItem.unit, status: 'pending', queuedAt: serverTimestamp() 
                    });
                }
            }
        }
    }
  });
};

// --- GENERIC DOCUMENT API ---
export const getDocumentsPaginated = async (collectionName, pageSize, lastVisible = null) => { 
    try { 
        const collectionRef = collection(db, collectionName); 
        let q; 
        if (lastVisible) { 
            q = query(collectionRef, limit(pageSize), startAfter(lastVisible)); 
        } else { 
            q = query(collectionRef, limit(pageSize)); 
        }
        const snapshot = await getDocs(q); 
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        const newLastVisible = snapshot.docs[snapshot.docs.length - 1]; 
        return { docs, lastVisible: newLastVisible }; 
    } catch (error) { 
        console.error("Error fetching documents: ", error); 
        throw error; 
    }
};
export const updateDocument = async (collectionName, docId, data) => { // ADDED 'export'
    const docRef = doc(db, collectionName, docId); 
    const dataToSave = { ...data }; 
    delete dataToSave.id; 
    return updateDoc(docRef, dataToSave); 
};
export const deleteDocument = async (collectionName, docId) => { // ADDED 'export'
    const docRef = doc(db, collectionName, docId); 
    return deleteDoc(docRef); 
};