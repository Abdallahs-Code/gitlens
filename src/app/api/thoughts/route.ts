import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/services/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const repoName = searchParams.get('repo');
  const profileOnly = searchParams.get('profileOnly') === 'true';
  const cursor = searchParams.get('cursor');
  const direction = searchParams.get('direction');
  const limit = 10;

  let query = supabase
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

  let countQuery = supabase
    .from('thoughts')
    .select('*', { count: 'exact', head: true })
    .eq('username', username);

  if (repoName) {
    query = query.eq('repo_name', repoName);
    countQuery = countQuery.eq('repo_name', repoName);
  } else if (profileOnly) {
    query = query.is('repo_name', null);
    countQuery = countQuery.is('repo_name', null);
  }

  if (!cursor) {
    query = query.order('created_at', { ascending: false }).limit(limit);
  } else if (direction === 'older') {
    query = query.lt('created_at', cursor).order('created_at', { ascending: false }).limit(limit);
  } else {
    query = query.gt('created_at', cursor).order('created_at', { ascending: true }).limit(limit);
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([query, countQuery]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
  return NextResponse.json({ thoughts: data, total: count });
}

export async function POST(req: NextRequest) {
  try {
    const user_id = req.headers.get('user_id');
    const body = await req.json();
    const { username, repo_name, content } = body;

    const { data, error } = await supabase
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