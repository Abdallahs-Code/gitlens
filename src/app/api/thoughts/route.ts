import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const repoName = searchParams.get('repo');

  let query = supabaseAdmin
    .from('thoughts')
    .select(`
      content,
      created_at,
      repo_name,
      users:user_id (
        username,
        avatar_url
      )
    `)
    .eq('username', username);
    
  if (repoName) query = query.eq('repo_name', repoName);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ thoughts: data });
}

export async function POST(req: NextRequest) {
  try {
    const user_id = req.headers.get('user_id');
    const body = await req.json();
    const { username, repo_name, content } = body;

    const { data, error } = await supabaseAdmin
      .from("thoughts")
      .insert([{ 
        username, 
        repo_name, 
        content,
        user_id: user_id
      }])
      .select(`
        content,
        created_at,
        repo_name,
        users:user_id (
          username,
          avatar_url
        )
      `); 

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ thought: data[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}