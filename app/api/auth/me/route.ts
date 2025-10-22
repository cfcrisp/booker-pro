import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.users.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has Google Calendar connected
    const googleToken = await db.oauthTokens.findByUserId(payload.userId, 'google');
    const hasGoogleCalendar = !!googleToken;

    // Don't send password hash to client
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      user: { 
        ...userWithoutPassword, 
        hasGoogleCalendar 
      } 
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = getUserFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timezone } = body;

    if (!timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 });
    }

    const user = await db.users.updateTimezone(payload.userId, timezone);
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Update timezone error:', error);
    return NextResponse.json({ error: 'Failed to update timezone' }, { status: 500 });
  }
}
