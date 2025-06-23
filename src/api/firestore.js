import { db } from './firebase';
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
export const getEmployeeSkills = async (employeeId) => {
  const employeeDocRef = doc(db, 'employees', employeeId);
  const employeeDoc = await getDoc(employeeDocRef);
  if (employeeDoc.exists()) {
    return employeeDoc.data().skills || {};
  }
  return {};
};
export const updateEmployeeSkillsAndLogHistory = async (employee, skillsData, allSkills) => {
  const employeeDocRef = doc(db, 'employees', employee.id);
  const batch = writeBatch(db);
  batch.update(employeeDocRef, { skills: skillsData });
  const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));
  for (const skillId in skillsData) {
    const proficiency = skillsData[skillId];
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

// --- INVENTORY APIs ---
const workshopSuppliesCollection = collection(db, 'workshopSupplies');
const componentsCollection = collection(db, 'components');
const rawMaterialsCollection = collection(db, 'rawMaterials');
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
export const getRawMaterials = async () => {
  const snapshot = await getDocs(rawMaterialsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addRawMaterial = (materialData) => {
  return addDoc(rawMaterialsCollection, materialData);
};
export const deleteRawMaterial = (materialId) => {
  const materialDoc = doc(db, 'rawMaterials', materialId);
  return deleteDoc(materialDoc);
};
export const updateRawMaterial = (materialId, updatedData) => {
  const materialDoc = doc(db, 'rawMaterials', materialId);
  return updateDoc(materialDoc, updatedData);
};

// --- OVERHEADS API ---
const overheadsCategoriesCollection = collection(db, 'overheadsCategories');
export const getOverheadCategories = async () => {
  const snapshot = await getDocs(overheadsCategoriesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addOverheadCategory = (categoryData) => {
  return addDoc(overheadsCategoriesCollection, categoryData);
};
export const updateOverheadCategory = (categoryId, updatedData) => {
  const categoryDoc = doc(db, 'overheadsCategories', categoryId);
  return updateDoc(categoryDoc, updatedData);
};
export const deleteOverheadCategory = async (categoryId) => {
  const categoryDocRef = doc(db, 'overheadsCategories', categoryId);
  const expensesSnapshot = await getDocs(collection(categoryDocRef, 'expenses'));
  const batch = writeBatch(db);
  expensesSnapshot.docs.forEach(expDoc => {
    batch.delete(expDoc.ref);
  });
  batch.delete(categoryDocRef);
  return batch.commit();
};
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
export const setJobStepDetail = (productId, departmentId, data) => {
  const recipeId = `${productId}_${departmentId}`;
  const docRef = doc(db, 'jobStepDetails', recipeId);
  return setDoc(docRef, { ...data, productId, departmentId });
};


// --- OLD PRODUCT CATALOG API (Used for JobCardCreator & Fitment) ---
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
  const q = query(
    jobCardsCollection,
    where('partId', '==', partId),
    where('departmentId', '==', departmentId),
    limit(1)
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
    } else if (currentData.status === 'Paused' && currentData.pausedAt) {
      const pauseDuration = new Date().getTime() - currentData.pausedAt.toDate().getTime();
      dataToUpdate.totalPausedMilliseconds = increment(pauseDuration);
      dataToUpdate.pausedAt = null;
    }
  } else if (newStatus === 'Paused') {
    dataToUpdate.pausedAt = serverTimestamp();
  } else if (newStatus === 'Awaiting QC') {
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
      dataToUpdate.completedAt = serverTimestamp();
      let materialCost = 0;
      let laborCost = 0;
      if (currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) {
        for (const consumable of currentJobData.processedConsumables) {
          const inventoryItem = inventoryMap.get(consumable.id);
          if (inventoryItem && inventoryItem.price !== undefined) {
            materialCost += (inventoryItem.price * consumable.quantity);
          } else if (consumable.price !== undefined) {
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
    if (isApproved && currentJobData.processedConsumables && currentJobData.processedConsumables.length > 0) {
      for (const consumable of currentJobData.processedConsumables) {
        const inventoryItem = inventoryMap.get(consumable.id);
        if (!inventoryItem) continue;
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
export const getCompletedJobsForEmployee = async (employeeId) => {
  if (!employeeId) return [];
  const q = query(
    jobCardsCollection,
    where('employeeId', '==', employeeId),
    where('status', 'in', ['Complete', 'Issue', 'Archived - Issue'])
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===================================================================
// NEW: UNIFIED PRODUCT CATALOG API v3
// ===================================================================
const productsCollection = collection(db, 'products');
const productCategoriesCollection = collection(db, 'productCategories');
const fitmentCollection = collection(db, 'fitment');
const productRecipeLinksCollection = collection(db, 'productRecipeLinks');

// --- Product Categories ---
export const getProductCategories = async () => {
    const snapshot = await getDocs(query(productCategoriesCollection, orderBy('name')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addProductCategory = (categoryName) => {
    return addDoc(productCategoriesCollection, { name: categoryName });
};
export const deleteProductCategory = async (categoryId) => {
    return deleteDoc(doc(db, 'productCategories', categoryId));
};

// --- Products (with duplicate part number check) ---
export const getProducts = async () => {
    const snapshot = await getDocs(query(productsCollection, orderBy('name')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addProduct = async (productData) => {
    const q = query(productsCollection, where("partNumber", "==", productData.partNumber));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        throw new Error(`A product with Part Number "${productData.partNumber}" already exists.`);
    }
    return addDoc(productsCollection, {
        ...productData,
        sellingPrice: Number(productData.sellingPrice) || 0,
        createdAt: serverTimestamp()
    });
};
export const updateProduct = (productId, updatedData) => {
    const productDoc = doc(db, 'products', productId);
    return updateDoc(productDoc, updatedData);
};
export const deleteProduct = async (productId) => {
    const batch = writeBatch(db);
    const productDoc = doc(db, 'products', productId);
    batch.delete(productDoc);
    const fitmentQuery = query(fitmentCollection, where('productId', '==', productId));
    const fitmentSnapshot = await getDocs(fitmentQuery);
    fitmentSnapshot.forEach(doc => batch.delete(doc.ref));
    const recipeLinkQuery = query(productRecipeLinksCollection, where('productId', '==', productId));
    const recipeLinkSnapshot = await getDocs(recipeLinkQuery);
    recipeLinkSnapshot.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
};

// --- Fitment (Linking Products to Models) ---
export const getFitmentForProduct = async (productId) => {
    const q = query(fitmentCollection, where('productId', '==', productId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const addFitment = (productId, modelId, modelName, makeName, manufacturerName) => {
    return addDoc(fitmentCollection, { 
        productId, 
        modelId,
        modelName,
        makeName,
        manufacturerName
    });
};
export const removeFitment = (fitmentId) => {
    const fitmentDoc = doc(db, 'fitment', fitmentId);
    return deleteDoc(fitmentDoc);
};

// --- Recipe Links (Linking Recipes to Products) ---
export const getLinkedRecipesForProduct = async (productId) => {
    const q = query(productRecipeLinksCollection, where('productId', '==', productId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
export const linkRecipeToProduct = (linkData) => {
    return addDoc(productRecipeLinksCollection, linkData);
};
export const unlinkRecipeFromProduct = (linkId) => {
    const linkDoc = doc(db, 'productRecipeLinks', linkId);
    return deleteDoc(linkDoc);
};
