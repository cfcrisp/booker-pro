import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAuthUrl } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const state = JSON.stringify({ userId: userPayload.userId });
  const authUrl = getAuthUrl(state);
  
  return NextResponse.json({ authUrl });
}

