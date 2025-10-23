import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getUserFreeBusy } from '@/lib/google-calendar';

/**
 * Get busy/free slots for the authenticated user's calendar
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Missing start or end date' },
        { status: 400 }
      );
    }

    const busySlots = await getUserFreeBusy(
      user.userId,
      new Date(start),
      new Date(end)
    );

    return NextResponse.json({ busy: busySlots });
  } catch (error) {
    console.error('Error fetching busy slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

