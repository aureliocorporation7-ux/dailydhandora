import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  try {
    if (path) {
      // Revalidate a specific path
      revalidatePath(path);
      return NextResponse.json({ 
        revalidated: true, 
        path: path,
        message: `Cache for path '${path}' cleared successfully`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Revalidate all articles
      revalidateTag('collection');
      return NextResponse.json({ 
        revalidated: true, 
        tag: 'collection',
        message: 'Cache for all articles cleared successfully',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    return NextResponse.json({ 
      revalidated: false, 
      message: err.message 
    }, { status: 500 });
  }
}
