import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Get the user's earliest and latest availability times across all rules
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

    // Get all availability rules for the user
    const rules = await db.availabilityRules.findByUserId(user.userId);

    if (!rules || rules.length === 0) {
      // Default to 8 AM - 6 PM if no rules defined
      return NextResponse.json({
        startHour: 8,
        endHour: 18
      });
    }

    // Parse all start and end times to find earliest and latest
    let earliestHour = 23;
    let latestHour = 0;

    rules.forEach((rule: any) => {
      const [startHourStr] = rule.start_time.split(':');
      const [endHourStr] = rule.end_time.split(':');
      
      const startHour = parseInt(startHourStr);
      const endHour = parseInt(endHourStr);

      if (startHour < earliestHour) {
        earliestHour = startHour;
      }
      if (endHour > latestHour) {
        latestHour = endHour;
      }
    });

    return NextResponse.json({
      startHour: earliestHour,
      endHour: latestHour
    });
  } catch (error) {
    console.error('Error fetching availability range:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability range' },
      { status: 500 }
    );
  }
}

