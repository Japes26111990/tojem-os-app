import React, { createContext, useState, useEffect, useContext } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../api/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        console.log("Firebase Auth User UID:", userAuth.uid);
        let userContextData = {
          uid: userAuth.uid,
          email: userAuth.email,
          role: 'Workshop Employee', // Default role if no specific role found
        };

        try {
          // 1. Fetch user's role from the 'users' collection
          const userRoleDocRef = doc(db, 'users', userAuth.uid);
          const userRoleDoc = await getDoc(userRoleDocRef);

          if (userRoleDoc.exists()) {
            const roleData = userRoleDoc.data();
            if (roleData.role) {
              userContextData.role = roleData.role; // Set role from 'users' collection
              console.log("Assigned Role from 'users' collection:", roleData.role);
            } else {
              console.warn("User document in 'users' collection exists but has no 'role' field. Assigning default role.");
            }
          } else {
            console.warn("No matching user document found in 'users' collection for UID. Assigning default role.");
          }

          // 2. Attempt to fetch employee details from the 'employees' collection
          //    (Assumes employee document ID matches userAuth.uid if they are a login-enabled employee)
          const employeeDocRef = doc(db, 'employees', userAuth.uid);
          const employeeDoc = await getDoc(employeeDocRef);

          if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data();
            // Merge employee-specific data into the user context object
            userContextData = { ...userContextData, ...employeeData };
            console.log("Merged Employee Data:", employeeData);
          } else {
            console.log("No matching employee document found in 'employees' collection for this UID. User details will be basic.");
          }

        } catch (error) {
            console.error("Error during user profile fetching:", error);
            // Fallback: If any error occurs, ensure basic user info with a default role is set.
            userContextData.role = 'Workshop Employee';
            console.log("Assigned Default Role (due to error): Workshop Employee");
        } finally {
            setUser(userContextData);
            setLoading(false);
        }
      } else {
        // User is signed out
        console.log("User signed out.");
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const value = {
    user,
    loading,
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
