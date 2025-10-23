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
    const { timezone, buffer_minutes, show_weekends, calendar_start_today } = body;

    // Update timezone if provided
    if (timezone) {
      await db.users.updateTimezone(payload.userId, timezone);
    }

    // Update buffer minutes if provided
    if (buffer_minutes !== undefined) {
      await db.query(
        'UPDATE users SET buffer_minutes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [buffer_minutes, payload.userId]
      );
    }

    // Update show_weekends if provided
    if (show_weekends !== undefined) {
      await db.query(
        'UPDATE users SET show_weekends = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [show_weekends, payload.userId]
      );
    }

    // Update calendar_start_today if provided
    if (calendar_start_today !== undefined) {
      await db.query(
        'UPDATE users SET calendar_start_today = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [calendar_start_today, payload.userId]
      );
    }

    // Fetch updated user
    const user = await db.users.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Update user settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
