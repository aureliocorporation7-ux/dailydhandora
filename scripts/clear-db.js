require('dotenv').config({ path: '.env.local' });
const firebase = require('../lib/firebase');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

async function clearAllArticles() {
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
      await clearAllArticles();
    }

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

async function clearOldArticles(hours) {
    console.log(`🔥 Deleting articles older than ${hours} hours...`);
  
    try {
      const db = firebase.db;
      const articlesRef = db.collection('articles');
      
      const now = new Date();
      const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
      const snapshot = await articlesRef.where('createdAt', '<', cutoff).limit(500).get();
  
      if (snapshot.empty) {
        console.log(`✅ No articles found older than ${hours} hours.`);
        return;
      }
  
      console.log(`Found ${snapshot.size} old articles to delete...`);
  
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
  
      await batch.commit();
  
      console.log(`✅ Successfully deleted ${snapshot.size} old articles.`);
  
      if (snapshot.size === 500) {
        console.log('⚠️ More old articles detected, running delete again...');
        await clearOldArticles(hours);
      }
  
    } catch (error) {
      console.error('❌ Error deleting old articles:', error);
      process.exit(1);
    }
  }

const argv = yargs(hideBin(process.argv))
  .command('all', 'Delete all articles', () => {}, clearAllArticles)
  .command('old <hours>', 'Delete articles older than a specified number of hours', (yargs) => {
    return yargs.positional('hours', {
      describe: 'Number of hours to go back',
      type: 'number',
    });
  }, (argv) => clearOldArticles(argv.hours))
  .demandCommand(1, 'Please provide a command: all or old <hours>')
  .help()
  .argv;

