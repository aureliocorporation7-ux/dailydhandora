const admin = require('firebase-admin');

let serviceAccount;

try {
  const serviceKey = process.env.FIREBASE_SERVICE_KEY;
  
  if (!serviceKey) {
    throw new Error('FIREBASE_SERVICE_KEY not found');
  }

  let jsonString = serviceKey;
  
  // Only try base64 decode if it looks like base64
  if (!serviceKey.startsWith('{')) {
    try {
      jsonString = Buffer.from(serviceKey, 'base64').toString('utf-8');
      console.log('✅ Decoded from base64');
    } catch (e) {
      console.log('⚠️  Not base64, using as-is');
    }
  } else {
    console.log('✅ Using plain JSON');
  }

  serviceAccount = JSON.parse(jsonString);
  console.log('✅ Firebase key parsed successfully');

} catch (error) {
  console.error('❌ Firebase error:', error.message);
  throw error;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase initialized');
}

const db = admin.firestore();
module.exports = { admin, db };
