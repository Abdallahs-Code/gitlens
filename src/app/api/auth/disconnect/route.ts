import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/lib/services/supabase';
import { decryptToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let user_id: number;

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      user_id = payload.user_id as number;
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ERR_JWT_EXPIRED') {
        const response = NextResponse.json({ message: 'Session expired, disconnected' });
        return response;
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('github_token_encrypted')
      .eq('id', user_id)
      .single();

    if (user) {
      const githubToken = decryptToken(user.github_token_encrypted);

      await fetch(`https://api.github.com/applications/${process.env.GITHUB_CLIENT_ID}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`).toString('base64')}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ access_token: githubToken }),
      });

      await supabase
        .from('users')
        .update({ github_token_encrypted: null })
        .eq('id', user_id);
    }

    const response = NextResponse.json({ message: 'Disconnected successfully' });
    response.cookies.delete('session_token');
    return response;

  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}