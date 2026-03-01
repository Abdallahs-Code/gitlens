import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/services/supabase';
import { encrypt } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user_id = Number(request.headers.get('user_id'));

  const { gemini_key } = await request.json();

  if (!gemini_key || typeof gemini_key !== 'string') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const encrypted = encrypt(gemini_key);

  const { error } = await supabase
    .from('users')
    .update({ gemini_key_encrypted: encrypted })
    .eq('id', user_id);

  if (error) {
    return NextResponse.json({ error: 'Failed to store key' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}