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
    picture: data.picture,
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
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    },
  });
  
  const busySlots = response.data.calendars?.primary?.busy || [];
  
  return busySlots.map((slot: { start?: string; end?: string }) => ({
    start: slot.start!,
    end: slot.end!,
  }));
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

export function findCommonAvailability(
  userFreeBusyData: UserFreeBusy[],
  searchStart: Date,
  searchEnd: Date,
  slotDuration: number = 60 // minutes
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const slotDurationMs = slotDuration * 60 * 1000;
  
  // Generate potential time slots
  let currentTime = new Date(searchStart);
  
  while (currentTime < searchEnd) {
    const slotEnd = new Date(currentTime.getTime() + slotDurationMs);
    
    if (slotEnd > searchEnd) break;
    
    // Check if this slot is free for all users
    const isFreeForAll = userFreeBusyData.every((userBusy) => {
      return !userBusy.busy.some((busySlot) => {
        const busyStart = new Date(busySlot.start);
        const busyEnd = new Date(busySlot.end);
        
        // Check if there's any overlap
        return currentTime < busyEnd && slotEnd > busyStart;
      });
    });
    
    if (isFreeForAll) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd),
      });
    }
    
    // Move to next slot (30-minute increments for better granularity)
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
  }
  
  return slots;
}

