import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { admin } from '@/lib/firebase'; // Ensure you have admin exported, or import { FieldValue } from firebase-admin/firestore

export async function POST(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    // Increment 'views' field atomically
    const docRef = db.collection('articles').doc(id);
    await docRef.update({
      views: admin.firestore.FieldValue.increment(1)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing view:', error);
    // Return success anyway to not block the UI, but log error
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
