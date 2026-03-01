import 'server-only';
import { supabase } from '@/lib/services/supabase';
import { decrypt } from '@/lib/auth';

export class GitHubTokenExpiredError extends Error {}

export async function getGitHubToken(user_id: number): Promise<string | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('github_token_encrypted')
      .eq('id', user_id)
      .single();

    if (error || !user || !user.github_token_encrypted) return null;

    return decrypt(user.github_token_encrypted);
  } catch {
    return null;
  }
}

export async function githubFetch(url: string, user_id: number): Promise<Response> {
  const token = await getGitHubToken(user_id);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    }
  });

  if (response.status === 401) {
    throw new GitHubTokenExpiredError();
  }
  
  return response;
}

export async function getGeminiKey(user_id: number): Promise<string | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('gemini_key_encrypted')
      .eq('id', user_id)
      .single();

    if (error || !user || !user.gemini_key_encrypted) return null;

    return decrypt(user.gemini_key_encrypted);
  } catch {
    return null;
  }
}