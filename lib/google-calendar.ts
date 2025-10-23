import { google } from 'googleapis';
import { db } from './db';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export interface FreeBusyTimeSlot {
  start: string;
  end: string;
  summary?: string;
}

export interface UserFreeBusy {
  userId: number;
  email: string;
  busy: FreeBusyTimeSlot[];
}

export function getAuthUrl(state: string): string {
  const stateData = JSON.parse(state);
  const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
  
  // Add profile scopes for Sign in with Google
  if (stateData.type === 'signin') {
    scopes.push(
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    );
  }
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return {
    id: data.id!,
    email: data.email!,
    name: data.name || data.email!,
    picture: data.picture || undefined,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

export async function getUserFreeBusy(
  userId: number,
  timeMin: Date,
  timeMax: Date
): Promise<FreeBusyTimeSlot[]> {
  const token = await db.oauthTokens.findByUserId(userId, 'google');
  
  if (!token) {
    throw new Error('No Google Calendar connected');
  }
  
  // Check if token is expired and refresh if needed
  let accessToken = token.access_token;
  
  if (token.token_expiry && new Date(token.token_expiry) < new Date()) {
    if (!token.refresh_token) {
      throw new Error('Token expired and no refresh token available');
    }
    
    const newTokens = await refreshAccessToken(token.refresh_token);
    
    if (newTokens.access_token) {
      await db.oauthTokens.upsert(
        userId,
        'google',
        newTokens.access_token,
        newTokens.refresh_token || token.refresh_token,
        newTokens.expiry_date ? new Date(newTokens.expiry_date) : null
      );
      accessToken = newTokens.access_token;
    }
  }
  
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  // Fetch events instead of just free/busy to get event titles
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  const events = response.data.items || [];
  
  // Get user's buffer setting (default 30 minutes)
  const user = await db.users.findById(userId);
  const bufferMinutes = (user && 'buffer_minutes' in user) ? (user.buffer_minutes ?? 30) : 30;
  
  return events
    .filter(event => 
      event.start?.dateTime && 
      event.end?.dateTime &&
      event.transparency !== 'transparent' // Skip "free" events
    )
    .map(event => {
      // Add buffer before and after each busy slot
      const startTime = new Date(event.start!.dateTime!);
      const endTime = new Date(event.end!.dateTime!);
      
      startTime.setMinutes(startTime.getMinutes() - bufferMinutes);
      endTime.setMinutes(endTime.getMinutes() + bufferMinutes);
      
      return {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        summary: event.summary || 'Busy',
      };
    });
}

export async function getMultipleUsersFreeBusy(
  userIds: number[],
  timeMin: Date,
  timeMax: Date
): Promise<UserFreeBusy[]> {
  const results: UserFreeBusy[] = [];
  
  for (const userId of userIds) {
    try {
      const user = await db.users.findById(userId);
      if (!user) continue;
      
      const busy = await getUserFreeBusy(userId, timeMin, timeMax);
      results.push({
        userId,
        email: user.email,
        busy,
      });
    } catch (error) {
      console.error(`Failed to get free/busy for user ${userId}:`, error);
      // Continue with other users even if one fails
    }
  }
  
  return results;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
}

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/**
 * Check if a time slot falls within user's weekly availability rules
 */
function isWithinAvailabilityRules(
  slotStart: Date,
  slotEnd: Date,
  rules: AvailabilityRule[]
): boolean {
  if (rules.length === 0) {
    // No rules means user hasn't set restrictions - allow all times
    return true;
  }

  const dayOfWeek = slotStart.getDay();
  const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
  const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();

  // Find rules for this day of week
  const dayRules = rules.filter(r => r.day_of_week === dayOfWeek);
  
  if (dayRules.length === 0) {
    // No rules for this day - user is not available
    return false;
  }

  // Check if slot fits within any of the rules for this day
  return dayRules.some(rule => {
    const [ruleStartHour, ruleStartMin] = rule.start_time.split(':').map(Number);
    const [ruleEndHour, ruleEndMin] = rule.end_time.split(':').map(Number);
    
    const ruleStartMinutes = ruleStartHour * 60 + ruleStartMin;
    const ruleEndMinutes = ruleEndHour * 60 + ruleEndMin;

    // Slot must be completely within the rule's time range
    return slotStartMinutes >= ruleStartMinutes && slotEndMinutes <= ruleEndMinutes;
  });
}

export async function findCommonAvailability(
  userFreeBusyData: UserFreeBusy[],
  searchStart: Date,
  searchEnd: Date,
  slotDuration: number = 60 // minutes
): Promise<AvailableSlot[]> {
  const slots: AvailableSlot[] = [];
  const slotDurationMs = slotDuration * 60 * 1000;
  const now = new Date();
  
  // Fetch availability rules for all users
  const userRules: Map<number, AvailabilityRule[]> = new Map();
  for (const userBusy of userFreeBusyData) {
    try {
      const rules = await db.availabilityRules.findByUserId(userBusy.userId);
      userRules.set(userBusy.userId, rules as AvailabilityRule[]);
    } catch (error) {
      console.error(`Failed to get availability rules for user ${userBusy.userId}:`, error);
      userRules.set(userBusy.userId, []);
    }
  }
  
  // Track slots per day (limit to 5 per day)
  const slotsByDay: Map<string, AvailableSlot[]> = new Map();
  
  // Generate potential time slots, starting from now if searchStart is in the past
  let startTime = new Date(Math.max(searchStart.getTime(), now.getTime()));
  
  // Round up to the next 30-minute mark (:00 or :30)
  const minutes = startTime.getMinutes();
  if (minutes > 0 && minutes <= 30) {
    startTime.setMinutes(30, 0, 0);
  } else if (minutes > 30) {
    startTime.setHours(startTime.getHours() + 1, 0, 0, 0);
  } else {
    startTime.setMinutes(0, 0, 0);
  }
  
  let currentTime = new Date(startTime);
  
  while (currentTime < searchEnd) {
    const slotEnd = new Date(currentTime.getTime() + slotDurationMs);
    
    if (slotEnd > searchEnd) break;
    
    // Skip if slot is in the past
    if (slotEnd <= now) {
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
      continue;
    }
    
    // Check if this slot is free for all users (both calendar-wise and rules-wise)
    const isFreeForAll = userFreeBusyData.every((userBusy) => {
      // Check calendar availability
      const isCalendarFree = !userBusy.busy.some((busySlot) => {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);
        
        // Check if there's any overlap
        return currentTime < busyEnd && slotEnd > busyStart;
      });
      
      // Check weekly availability rules
      const rules = userRules.get(userBusy.userId) || [];
      const isWithinRules = isWithinAvailabilityRules(currentTime, slotEnd, rules);
      
      return isCalendarFree && isWithinRules;
    });
    
    if (isFreeForAll) {
      // Get the date key (YYYY-MM-DD)
      const dateKey = currentTime.toISOString().split('T')[0];
      
      // Initialize array for this day if it doesn't exist
      if (!slotsByDay.has(dateKey)) {
        slotsByDay.set(dateKey, []);
      }
      
      // Only add if we haven't reached the limit for this day
      const daySlotsArray = slotsByDay.get(dateKey)!;
      if (daySlotsArray.length < 5) {
        const slot = {
          start: new Date(currentTime),
          end: new Date(slotEnd),
        };
        daySlotsArray.push(slot);
        slots.push(slot);
      }
    }
    
    // Move to next slot (30-minute increments for better granularity)
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }
  
  return slots;
}

