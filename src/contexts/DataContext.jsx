import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../api/firebase';
// --- REMOVED enableIndexedDbPersistence from this import ---
import { collection, query, getDocs, onSnapshot, orderBy, limit, startAfter } from 'firebase/firestore';
import { 
    getEmployees, 
    getTools, 
    getOverheadCategories, 
    getOverheadExpenses, 
    getJobStepDetails, 
    getRoles, 
    getProductCategories,
    getAllInventoryItems,
    getProducts,
    listenToJobCards
} from '../api/firestore';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [tools, setTools] = useState([]);
  const [overheadCategories, setOverheadCategories] = useState([]);
  const [overheadExpenses, setOverheadExpenses] = useState([]);
  const [jobStepDetails, setJobStepDetails] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [lastVisibleJob, setLastVisibleJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // --- REMOVED: The enableIndexedDbPersistence call was here and has been moved ---

    // Offline detection
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Fetch static data with caching
    const fetchData = async () => {
      try {
        const [emps, tls, ovhCats, recipes, inv, prods, rls, cats] = await Promise.all([
           getEmployees(),
          getTools(),
          getOverheadCategories(),
          getJobStepDetails(),
          getAllInventoryItems(),
          getProducts(),
          getRoles(),
          getProductCategories()
        ]);
        setEmployees(emps);
        setTools(tls);
        setOverheadCategories(ovhCats);
        setJobStepDetails(recipes);
        setInventoryItems(inv);
        setProducts(prods);
        setRoles(rls);
        setProductCategories(cats);

        const expensePromises = ovhCats.map(cat => getOverheadExpenses(cat.id));
        const expenseResults = await Promise.all(expensePromises);
        setOverheadExpenses(expenseResults.flat());

        // Paginated jobs listener with offline fallback
        const unsubscribe = listenToJobCards(({ jobs: fetchedJobs, lastVisible }) => {
          setJobs(fetchedJobs);
          setLastVisibleJob(lastVisible);
        }, { limit: 20 });

        return unsubscribe;
      } catch (err) {
        setError('Failed to load data. Using cache if available.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const loadMoreJobs = () => {
    if (lastVisibleJob) {
      listenToJobCards(({ jobs: moreJobs }) => {
        setJobs(prev => [...prev, ...moreJobs]);
      }, { limit: 20, startAfter: lastVisibleJob });
    }
  };

  return (
    <DataContext.Provider value={{
      employees, tools, overheadCategories, overheadExpenses, jobStepDetails, inventoryItems, products, roles, productCategories, jobs,
      loading, offline, error, loadMoreJobs
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);