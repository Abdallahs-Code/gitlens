import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  const state = crypto.randomBytes(32).toString('hex');
  
  const redis = getRedisClient();
  await redis.setex(`oauth:state:${state}`, 600, Date.now().toString());
  
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: process.env.GITHUB_REDIRECT_URI!,
    scope: 'read:user',
    state: state,
    prompt: 'consent',
  });
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  
  return NextResponse.redirect(githubAuthUrl);
}