const admin = require('firebase-admin');

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    let serviceAccount;

    // Prioritize the direct JSON key, as you requested.
    if (process.env.FIREBASE_SERVICE_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_KEY);
      } catch (e) {
        console.error(
          'CRITICAL: Failed to parse FIREBASE_SERVICE_KEY. Make sure it is a valid, single-line JSON string.',
          e
        );
        throw e;
      }
    } 
    // Fallback to Base64 if the direct key isn't provided.
    else if (process.env.FIREBASE_SERVICE_KEY_BASE64) {
      const decodedServiceAccount = Buffer.from(
        process.env.FIREBASE_SERVICE_KEY_BASE64,
        'base64'
      ).toString('utf-8');
      serviceAccount = JSON.parse(decodedServiceAccount);
    } 
    // If neither is available, we cannot proceed.
    else {
      console.error('Firebase Admin initialization failed: No service key found in environment variables (FIREBASE_SERVICE_KEY or FIREBASE_SERVICE_KEY_BASE64).');
      throw new Error('Firebase service account key is not available.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error) {
    console.error('CRITICAL: Firebase Admin SDK initialization failed.', error);
    throw error;
  }
}

initializeFirebaseAdmin();

module.exports = {
  admin,
  db: admin.firestore(),
  auth: admin.auth(),
};