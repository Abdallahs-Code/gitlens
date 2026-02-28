import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/lib/services/supabase';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;

  if (!token) {
    return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const user_id = payload.user_id as number;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, avatar_url, bio')
      .eq('id', user_id)
      .single();

    if (error || !user) {
      return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'authenticated',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });
  }
}
