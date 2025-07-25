// src/api/firestore.test.js

/**
 * @jest-environment node
 */
import * as firebaseTesting from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const { initializeTestEnvironment } = firebaseTesting;

// Correctly locate the firestore.rules file relative to the project root
const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');

// Mock implementation of the function to be tested
const updateStockByWeight_logic = async (db, itemId, grossWeight) => {
    const itemRef = doc(db, 'inventoryItems', itemId);
    const itemDoc = await getDoc(itemRef);

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

    await setDoc(itemRef, { currentStock: newQuantity }, { merge: true });
    return { newQuantity };
};

describe('Firestore API Tests', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'tojem-os-test-environment',
      firestore: {
        rules: firestoreRules, // Load the actual security rules
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('updateStockByWeight', () => {
    it('should correctly calculate and update the stock quantity from weight for an authorized user', async () => {
      // Use an authenticated context that should have permission to write
      const managerDb = testEnv.authenticatedContext('manager_user_id', { role: 'Manager' }).firestore();
      
      const testItemId = 'test-item-123';
      const itemRef = doc(managerDb, 'inventoryItems', testItemId);
      
      // Setup: Create a mock inventory item in the test database
      await setDoc(itemRef, {
        name: 'Test Bolt',
        unitWeight: 2.5,
        tareWeight: 50,
        currentStock: 100
      });

      // Action: Run the function
      const grossWeight = 550; // (550g - 50g tare) / 2.5g/unit = 200 units
      const result = await updateStockByWeight_logic(managerDb, testItemId, grossWeight);

      // Assertion: Verify the result and the database state
      expect(result.newQuantity).toBe(200);
      const updatedItemDoc = await getDoc(itemRef);
      expect(updatedItemDoc.exists()).toBe(true);
      expect(updatedItemDoc.data().currentStock).toBe(200);
    });

    it('should throw an error if the item does not exist', async () => {
      const managerDb = testEnv.authenticatedContext('manager_user_id').firestore();
      await expect(updateStockByWeight_logic(managerDb, 'non-existent-item', 100))
        .rejects.toThrow("Inventory item not found.");
    });
  });
});
