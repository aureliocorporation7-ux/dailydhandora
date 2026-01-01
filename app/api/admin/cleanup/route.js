import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

// 🛡️ IN-MEMORY RATE LIMITER (The Watchdog)
// Tracks failed attempts: { 'IP_ADDRESS': { count: 0, blockedUntil: null } }
const ipTracker = new Map();

const BLOCK_DURATION = 30 * 60 * 1000; // 30 Minutes
const MAX_ATTEMPTS = 5;

export async function POST(request) {
  try {
    // 1. GET CLIENT IP
    // On Render/Vercel, real IP is in 'x-forwarded-for'
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown-ip';

    // 2. CHECK IF BLOCKED
    const tracker = ipTracker.get(ip) || { count: 0, blockedUntil: null };
    
    if (tracker.blockedUntil && Date.now() < tracker.blockedUntil) {
      const remainingMinutes = Math.ceil((tracker.blockedUntil - Date.now()) / 60000);
      console.warn(`⛔ [Security] Blocked IP ${ip} tried to access cleanup. Remaining: ${remainingMinutes}m`);
      return NextResponse.json(
        { error: `🚫 Security Alert: Too many failed attempts. Your IP is blocked for ${remainingMinutes} minutes.` }, 
        { status: 429 }
      );
    }

    // Clear old blocks if time passed
    if (tracker.blockedUntil && Date.now() > tracker.blockedUntil) {
      ipTracker.delete(ip);
    }

    const { category, masterKey } = await request.json();

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // 3. SECURE MASTER KEY VALIDATION
    const VALID_MASTER_KEY = process.env.MASTER_KEY;
    
    if (!VALID_MASTER_KEY) {
      console.error('❌ [Security] MASTER_KEY is not set in env!');
      return NextResponse.json({ error: 'Server Config Error: Security Key Missing.' }, { status: 500 });
    }

    // Use Crypto Safe Compare (Prevents Timing Attacks)
    const isValid = safeCompare(masterKey || '', VALID_MASTER_KEY);

    if (!isValid) {
      // 🚨 INCREMENT FAILED ATTEMPTS
      tracker.count += 1;
      
      if (tracker.count >= MAX_ATTEMPTS) {
        tracker.blockedUntil = Date.now() + BLOCK_DURATION;
        console.error(`🚨 [Security] BRUTE FORCE DETECTED! Blocking IP ${ip} for 30 mins.`);
      } else {
        console.warn(`⚠️ [Security] Failed attempt ${tracker.count}/${MAX_ATTEMPTS} from IP ${ip}`);
      }
      
      ipTracker.set(ip, tracker); // Save state

      return NextResponse.json(
        { error: `⛔ Access Denied. Invalid Password. (${MAX_ATTEMPTS - tracker.count} attempts remaining)` }, 
        { status: 401 }
      );
    }

    // ✅ SUCCESS: RESET TRACKER FOR THIS IP
    ipTracker.delete(ip);

    console.log(`🔥 [Admin] Authorized Cleanup for category: ${category} by IP: ${ip}`);

    // --- ACTUAL CLEANUP LOGIC ---
    const snapshot = await db.collection('articles')
      .where('category', '==', category)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No articles found in this category', count: 0 });
    }

    const batchSize = 500;
    const batches = [];
    let currentBatch = db.batch();
    let count = 0;

    snapshot.docs.forEach((doc, index) => {
      currentBatch.delete(doc.ref);
      count++;
      if ((index + 1) % batchSize === 0) {
        batches.push(currentBatch);
        currentBatch = db.batch();
      }
    });

    if (count % batchSize !== 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map(batch => batch.commit()));

    console.log(`✅ [Admin] Deleted ${count} articles from '${category}'`);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${count} articles from '${category}'`,
      count: count
    });

  } catch (error) {
    console.error('Cleanup Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔐 Helper: Constant Time Comparison
function safeCompare(a, b) {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB) && bufA.length === bufB.length;
  } catch (e) {
    return false; // Length mismatch throws error in strict mode, treat as false
  }
}
