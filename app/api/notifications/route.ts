import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get('unread_only') === 'true';
  
  try {
    const notifications = await db.notifications.findByUserId(
      userPayload.userId,
      unreadOnly
    );
    
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { action, notification_id } = await request.json();
    
    if (action === 'mark_read' && notification_id) {
      await db.notifications.markAsRead(notification_id, userPayload.userId);
      return NextResponse.json({ message: 'Marked as read' });
    }
    
    if (action === 'mark_all_read') {
      await db.notifications.markAllAsRead(userPayload.userId);
      return NextResponse.json({ message: 'All marked as read' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

