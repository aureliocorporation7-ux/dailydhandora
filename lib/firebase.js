const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_KEY_BASE64, 'base64').toString('utf8'));
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error.message);
    // We don't re-throw the error here to allow the app to build even if Firebase admin fails
    // This is useful for client-side only rendering or build steps that don't depend on Firebase admin
  }
}

const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };

