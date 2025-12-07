const admin = require('firebase-admin');

let serviceAccount;

try {
  const serviceKey = process.env.FIREBASE_SERVICE_KEY;
  
  if (!serviceKey) {
    throw new Error('FIREBASE_SERVICE_KEY not found in environment');
  }

  // Try to decode from base64 first
  let jsonString = serviceKey;
  try {
    // Check if it's base64 encoded
    jsonString = Buffer.from(serviceKey, 'base64').toString('utf-8');
    console.log('✅ Decoded Firebase key from base64');
  } catch (e) {
    // Not base64, use as-is
    console.log('✅ Using Firebase key as plain JSON');
  }

  serviceAccount = JSON.parse(jsonString);
  console.log('✅ Firebase service key parsed successfully');

} catch (error) {
  console.error('❌ Error parsing Firebase key:', error.message);
  throw error;
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }
}

const db = admin.firestore();

module.exports = { admin, db };
