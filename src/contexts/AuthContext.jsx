import React, { createContext, useState, useEffect, useContext } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../api/firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        let userRole = 'Workshop Employee'; // Default role

        // 1. Fetch user's role name from the 'users' collection
        const userRoleDocRef = doc(db, 'users', userAuth.uid);
        const userRoleDoc = await getDoc(userRoleDocRef);

        if (userRoleDoc.exists() && userRoleDoc.data().role) {
          userRole = userRoleDoc.data().role;
        } else {
          console.warn(`User document for ${userAuth.uid} not found in 'users' or has no role. Assigning default role.`);
        }

        // 2. Fetch the permissions for that role from the 'roles' collection
        let permissions = {};
        try {
            const roleDocRef = doc(db, 'roles', userRole);
            const roleDoc = await getDoc(roleDocRef);

            if (roleDoc.exists()) {
                permissions = roleDoc.data().permissions || {};
            } else {
                console.warn(`Permissions document for role "${userRole}" not found. User will have no permissions.`);
                toast.error(`Permissions for role "${userRole}" not found. Please contact an administrator.`, { duration: 6000 });
            }
        } catch (error) {
            console.error("Error fetching role permissions:", error);
        }

        // 3. Combine all user data into a single context object
        const userContextData = {
            uid: userAuth.uid,
            email: userAuth.email,
            role: userRole,
            permissions: permissions,
        };
        
        setUser(userContextData);
      } else {
        setUser(null);
      }
      setLoading(false);
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
