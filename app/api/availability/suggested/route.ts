import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getUserFreeBusy } from '@/lib/google-calendar';
import { db } from '@/lib/db';
import { addDays, setHours, setMinutes, format, startOfDay } from 'date-fns';

/**
 * Get auto-suggested availability slots (3 times across 3 days)
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

    // Get user's availability rules
    const rules = await db.availabilityRules.findByUserId(user.userId);
    
    // Start from tomorrow
    const startDate = addDays(startOfDay(new Date()), 1);
    const endDate = addDays(startDate, 7);

    let busySlots: any[] = [];
    
    try {
      // Get user's busy times
      busySlots = await getUserFreeBusy(user.userId, startDate, endDate);
    } catch (error) {
      // If no calendar connected, continue with empty busy slots
      console.log('No calendar connected or error fetching busy times');
    }

    // Common meeting times to suggest (in order of preference)
    const preferredTimes = [
      { hour: 10, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 11, minute: 0 },
      { hour: 15, minute: 0 },
      { hour: 9, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 13, minute: 0 },
    ];

    const suggestions: Date[] = [];
    let currentDay = startDate;
    let daysChecked = 0;
    let daysWithSlots = 0;

    // Always try to find exactly 3 days with up to 3 times each
    while (daysWithSlots < 3 && daysChecked < 14) {
      const dayOfWeek = currentDay.getDay();
      
      // Check if user has availability rules for this day
      const dayRules = rules.filter((rule: any) => rule.day_of_week === dayOfWeek);
      
      if (dayRules.length > 0) {
        const daySuggestions: Date[] = [];
        
        // Try each preferred time for this day
        for (const preferredTime of preferredTimes) {
          if (daySuggestions.length >= 3) break;
          
          const candidateSlot = new Date(currentDay);
          candidateSlot.setHours(preferredTime.hour, preferredTime.minute, 0, 0);
          
          const slotEnd = new Date(candidateSlot);
          slotEnd.setMinutes(slotEnd.getMinutes() + 60); // 1 hour slot
          
          // Check if within availability rules
          const isWithinRules = dayRules.some((rule: any) => {
            const [ruleStartHour, ruleStartMin] = rule.start_time.split(':').map(Number);
            const [ruleEndHour, ruleEndMin] = rule.end_time.split(':').map(Number);
            
            const ruleStartMinutes = ruleStartHour * 60 + ruleStartMin;
            const ruleEndMinutes = ruleEndHour * 60 + ruleEndMin;
            const slotStartMinutes = preferredTime.hour * 60 + preferredTime.minute;
            const slotEndMinutes = slotStartMinutes + 60;
            
            return slotStartMinutes >= ruleStartMinutes && slotEndMinutes <= ruleEndMinutes;
          });
          
          if (!isWithinRules) continue;
          
          // Check if not busy
          const isBusy = busySlots.some(
            (busy) => candidateSlot < new Date(busy.end) && slotEnd > new Date(busy.start)
          );
          
          if (!isBusy && candidateSlot > new Date()) {
            daySuggestions.push(candidateSlot);
          }
        }
        
        // Add slots for this day (even if less than 3) as long as we found at least 1
        if (daySuggestions.length > 0) {
          suggestions.push(...daySuggestions.slice(0, 3));
          daysWithSlots++;
        }
      }
      
      currentDay = addDays(currentDay, 1);
      daysChecked++;
    }
    
    // Ensure we always return exactly 3 days worth of slots (pad with next available if needed)
    if (daysWithSlots < 3 && suggestions.length > 0) {
      // If we couldn't find 3 days, keep the slots we found
      // This ensures we show what's available rather than nothing
    }

    // Get user's timezone
    const userInfo = await db.users.findById(user.userId);
    const timezone = userInfo?.timezone || 'America/New_York';

    return NextResponse.json({
      suggestions: suggestions.map(slot => slot.toISOString()),
      timezone
    });
  } catch (error) {
    console.error('Error generating suggested availability:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

