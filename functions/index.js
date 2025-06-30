// File: functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

/**
 * Creates a new Firebase user, sets their custom role claim,
 * and creates a corresponding user document in Firestore.
 */
exports.createUserAndSetRole = functions.https.onRequest((req, res) => {
  // Use the cors middleware to handle the preflight request
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        error: "Missing required fields: email, password, and role.",
      });
    }

    try {
      // Create the user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
      });

      // Set the custom role in Firestore (this is the source of truth for the app)
      await admin.firestore().collection("users").doc(userRecord.uid).set({
        email: userRecord.email,
        role: role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(201).json({
        uid: userRecord.uid,
        email: userRecord.email,
        message: `Successfully created user with role: ${role}`,
      });
    } catch (error) {
      console.error("Error creating new user:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});


/**
 * Deletes a user from Firebase Authentication and their corresponding
 * document in the 'users' collection in Firestore.
 */
exports.deleteUserAndRole = functions.https.onRequest((req, res) => {
  // Use the cors middleware
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing required field: userId." });
    }

    try {
      // Delete the user from Firebase Authentication
      await admin.auth().deleteUser(userId);

      // Delete the user document from Firestore
      await admin.firestore().collection("users").doc(userId).delete();

      return res.status(200).json({
        message: `Successfully deleted user ${userId}.`,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});
