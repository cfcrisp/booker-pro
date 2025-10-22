import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  // For Google Sign-In, we use a different state to indicate it's for authentication
  const state = JSON.stringify({ type: 'signin' });
  const authUrl = getAuthUrl(state);
  
  return NextResponse.json({ authUrl });
}

