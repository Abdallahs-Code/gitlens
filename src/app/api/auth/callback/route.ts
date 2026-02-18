import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getRedisClient } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabase';
import { encryptToken, decryptToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!state) {
    return NextResponse.json({ error: 'No state parameter' }, { status: 400 });
  }

  const redis = getRedisClient();
  const storedTimestamp = await redis.get(`oauth:state:${state}`);
  
  if (!storedTimestamp) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  if (Date.now() - parseInt(storedTimestamp) > 10 * 60 * 1000) {
    await redis.del(`oauth:state:${state}`);
    return NextResponse.json({ error: 'State expired' }, { status: 400 });
  }

  await redis.del(`oauth:state:${state}`);

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) throw new Error('No access token received');

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
    });
    const githubUser = await userResponse.json();

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, github_token_encrypted')
      .eq('github_id', githubUser.id)
      .single();

    if (existingUser?.github_token_encrypted) {
      const oldToken = decryptToken(existingUser.github_token_encrypted);

      await fetch(`https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64')}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ access_token: oldToken }),
      });
    }

    const encryptedToken = encryptToken(accessToken);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          github_id: githubUser.id,
          username: githubUser.login,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          github_token_encrypted: encryptedToken,
        },
        { onConflict: 'github_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw error;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ user_id: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}