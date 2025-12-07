require('dotenv').config({ path: '.env.local' });
const firebase = require('../lib/firebase');

async function clearArticles() {
  console.log('🔥 Deleting all articles from the Firestore database...');

  try {
    const db = firebase.db;
    const articlesRef = db.collection('articles');
    const snapshot = await articlesRef.limit(500).get(); // Get up to 500 docs at a time

    if (snapshot.empty) {
      console.log('✅ Database is already empty. Nothing to delete.');
      return;
    }

    console.log(`Found ${snapshot.size} articles to delete...`);

    // Create a batch to delete all documents
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();

    console.log(`✅ Successfully deleted ${snapshot.size} articles.`);
    
    // Recurse if there are more documents to delete
    if (snapshot.size === 500) {
      console.log('⚠️ More articles detected, running delete again...');
      await clearArticles();
    }

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearArticles().catch(console.error);
