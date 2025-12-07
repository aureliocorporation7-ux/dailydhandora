import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Revalidate home page
    revalidatePath('/');
    
    return NextResponse.json({ 
      revalidated: true, 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ 
      revalidated: false, 
      message: err.message 
    }, { status: 500 });
  }
}
