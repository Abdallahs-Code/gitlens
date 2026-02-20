import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;

  if (!token) {
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
  } catch (error) {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/user/:path*',
    '/api/users/:path*',
    '/api/thoughts/:path*',
    '/api/compare/:path*',
    '/api/summarize/:path*',
    '/api/analyze-job/:path*',
  ],
};