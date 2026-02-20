import 'server-only';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/auth';

async function getGitHubToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const user_id = payload.user_id as number;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('github_token_encrypted')
      .eq('id', user_id)
      .single();

    if (error || !user) return null;

    return decryptToken(user.github_token_encrypted);
  } catch {
    return null;
  }
}

export async function githubFetch(url: string): Promise<Response> {
  const token = await getGitHubToken();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    }
  });
  
  return response;
}