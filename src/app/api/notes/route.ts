import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const repoName = searchParams.get('repo');

  let query = supabase.from('notes').select('*').eq('username', username);
  if (repoName) query = query.eq('repo_name', repoName);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, repo_name, content } = body;

    const { data, error } = await supabase
      .from("notes")
      .insert([{ username, repo_name, content }])
      .select(); 

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ note: data[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
