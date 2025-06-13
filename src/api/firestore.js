import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy, updateDoc, where, getDoc } from 'firebase/firestore';

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

// --- WORKSHOP SUPPLIES API (Formerly Consumables) ---
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
// ... all existing API code up to Workshop Supplies ...

// --- COMPONENTS API (Newly Added) ---
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

// --- RAW MATERIALS API (Newly Added) ---
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
  return deleteDoc(materialDoc);
};

// ... other existing API code ...


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


// --- JOB CARDS API ---
const jobCardsCollection = collection(db, 'createdJobCards');

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

export const updateJobStatus = (docId, newStatus) => {
  const jobDocRef = doc(db, 'createdJobCards', docId);
  return updateDoc(jobDocRef, { status: newStatus });
};

export const updateJobRejection = (docId, reason) => {
  const jobDocRef = doc(db, 'createdJobCards', docId);
  return updateDoc(jobDocRef, { status: 'Issue', issueReason: reason });
};