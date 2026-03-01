import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;

  if (!token) {
    console.log("Redirecting to home page")
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(request.headers);

    requestHeaders.set('user_id', payload.user_id as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/api/ai/:path*',
    '/api/key/:path*',
    '/api/thoughts/:path*',
    '/api/user/:path*',
    '/user/:path*',
  ],
};