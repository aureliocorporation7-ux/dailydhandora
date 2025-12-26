import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { password } = await request.json();
    // Simple environment variable check
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (password === correctPassword) {
      const cookieStore = await cookies();
      // Set a simple session cookie
      cookieStore.set('admin_session', 'authenticated', {
        httpOnly: true, // Secure, JavaScript can't read it
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
