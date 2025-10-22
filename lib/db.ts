import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface User {
  id: number;
  email: string;
  password_hash: string | null;
  name: string;
  google_id: string | null;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthToken {
  id: number;
  user_id: number;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_expiry: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AvailabilityRule {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface BlockedTime {
  id: number;
  user_id: number;
  start_time: Date;
  end_time: Date;
  reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Meeting {
  id: number;
  coordinator_id: number;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  user_id: number;
  status: string;
  created_at: Date;
}

export interface CalendarPermission {
  id: number;
  grantor_id: number;
  grantee_id: number | null;
  grantee_domain: string | null;
  permission_type: 'once' | 'user' | 'domain';
  status: 'active' | 'revoked';
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PermissionRequest {
  id: number;
  requester_id: number;
  recipient_id: number;
  meeting_context: string | null;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  responded_at: Date | null;
  expires_at: Date;
  created_at: Date;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: Date;
}

export const db = {
  query: (text: string, params?: unknown[]) => pool.query(text, params),
  
  // User queries
  users: {
    findByEmail: async (email: string): Promise<User | null> => {
      const result = await pool.query<User>(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    },
    
    findById: async (id: number): Promise<User | null> => {
      const result = await pool.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    },
    
    create: async (email: string, passwordHash: string, name: string): Promise<User> => {
      const result = await pool.query<User>(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
        [email, passwordHash, name]
      );
      return result.rows[0];
    },
    
    findByEmails: async (emails: string[]): Promise<User[]> => {
      const result = await pool.query<User>(
        'SELECT * FROM users WHERE email = ANY($1)',
        [emails]
      );
      return result.rows;
    },
    
    findByGoogleId: async (googleId: string): Promise<User | null> => {
      const result = await pool.query<User>(
        'SELECT * FROM users WHERE google_id = $1',
        [googleId]
      );
      return result.rows[0] || null;
    },
    
    createWithGoogle: async (email: string, name: string, googleId: string, timezone?: string): Promise<User> => {
      const tz = timezone || 'America/New_York';
      const result = await pool.query<User>(
        'INSERT INTO users (email, name, google_id, timezone) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, name, googleId, tz]
      );
      return result.rows[0];
    },
    
    updateTimezone: async (userId: number, timezone: string): Promise<User> => {
      const result = await pool.query<User>(
        'UPDATE users SET timezone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [timezone, userId]
      );
      return result.rows[0];
    },
  },
  
  // OAuth token queries
  oauthTokens: {
    findByUserId: async (userId: number, provider: string): Promise<OAuthToken | null> => {
      const result = await pool.query<OAuthToken>(
        'SELECT * FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
      return result.rows[0] || null;
    },
    
    upsert: async (
      userId: number,
      provider: string,
      accessToken: string,
      refreshToken: string | null,
      tokenExpiry: Date | null
    ): Promise<OAuthToken> => {
      const result = await pool.query<OAuthToken>(
        `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_expiry)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, provider)
         DO UPDATE SET access_token = $3, refresh_token = $4, token_expiry = $5, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, provider, accessToken, refreshToken, tokenExpiry]
      );
      return result.rows[0];
    },
    
    delete: async (userId: number, provider: string): Promise<void> => {
      await pool.query(
        'DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
    },
  },
  
  // Availability rules queries
  availabilityRules: {
    findByUserId: async (userId: number): Promise<AvailabilityRule[]> => {
      const result = await pool.query<AvailabilityRule>(
        'SELECT * FROM availability_rules WHERE user_id = $1 ORDER BY day_of_week, start_time',
        [userId]
      );
      return result.rows;
    },
    
    create: async (
      userId: number,
      dayOfWeek: number,
      startTime: string,
      endTime: string,
      timezone: string
    ): Promise<AvailabilityRule> => {
      const result = await pool.query<AvailabilityRule>(
        'INSERT INTO availability_rules (user_id, day_of_week, start_time, end_time, timezone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, dayOfWeek, startTime, endTime, timezone]
      );
      return result.rows[0];
    },
    
    delete: async (id: number, userId: number): Promise<void> => {
      await pool.query(
        'DELETE FROM availability_rules WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    },
    
    deleteAllByUserId: async (userId: number): Promise<void> => {
      await pool.query('DELETE FROM availability_rules WHERE user_id = $1', [userId]);
    },
  },
  
  // Blocked times queries
  blockedTimes: {
    findByUserId: async (userId: number): Promise<BlockedTime[]> => {
      const result = await pool.query<BlockedTime>(
        'SELECT * FROM blocked_times WHERE user_id = $1 ORDER BY start_time',
        [userId]
      );
      return result.rows;
    },
    
    findByUserIdInRange: async (userId: number, start: Date, end: Date): Promise<BlockedTime[]> => {
      const result = await pool.query<BlockedTime>(
        'SELECT * FROM blocked_times WHERE user_id = $1 AND start_time < $3 AND end_time > $2',
        [userId, start, end]
      );
      return result.rows;
    },
    
    create: async (
      userId: number,
      startTime: Date,
      endTime: Date,
      reason: string | null
    ): Promise<BlockedTime> => {
      const result = await pool.query<BlockedTime>(
        'INSERT INTO blocked_times (user_id, start_time, end_time, reason) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, startTime, endTime, reason]
      );
      return result.rows[0];
    },
    
    delete: async (id: number, userId: number): Promise<void> => {
      await pool.query(
        'DELETE FROM blocked_times WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    },
  },
  
  // Meetings queries
  meetings: {
    findById: async (id: number): Promise<Meeting | null> => {
      const result = await pool.query<Meeting>(
        'SELECT * FROM meetings WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    },
    
    findByCoordinatorId: async (coordinatorId: number): Promise<Meeting[]> => {
      const result = await pool.query<Meeting>(
        'SELECT * FROM meetings WHERE coordinator_id = $1 ORDER BY start_time DESC',
        [coordinatorId]
      );
      return result.rows;
    },
    
    create: async (
      coordinatorId: number,
      title: string,
      description: string | null,
      startTime: Date,
      endTime: Date
    ): Promise<Meeting> => {
      const result = await pool.query<Meeting>(
        'INSERT INTO meetings (coordinator_id, title, description, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [coordinatorId, title, description, startTime, endTime]
      );
      return result.rows[0];
    },
  },
  
  // Meeting participants queries
  meetingParticipants: {
    addParticipant: async (meetingId: number, userId: number): Promise<MeetingParticipant> => {
      const result = await pool.query<MeetingParticipant>(
        'INSERT INTO meeting_participants (meeting_id, user_id) VALUES ($1, $2) RETURNING *',
        [meetingId, userId]
      );
      return result.rows[0];
    },
    
    findByMeetingId: async (meetingId: number): Promise<MeetingParticipant[]> => {
      const result = await pool.query<MeetingParticipant>(
        'SELECT * FROM meeting_participants WHERE meeting_id = $1',
        [meetingId]
      );
      return result.rows;
    },
  },
  
  // Calendar permissions queries
  permissions: {
    hasPermission: async (grantorId: number, granteeId: number): Promise<boolean> => {
      const user = await pool.query<User>('SELECT email FROM users WHERE id = $1', [granteeId]);
      const granteeDomain = user.rows[0]?.email.split('@')[1];
      
      const result = await pool.query<CalendarPermission>(
        `SELECT * FROM calendar_permissions 
         WHERE grantor_id = $1 
         AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (
           grantee_id = $2 OR 
           grantee_domain = $3
         )
         LIMIT 1`,
        [grantorId, granteeId, granteeDomain]
      );
      return result.rows.length > 0;
    },
    
    grantUserPermission: async (grantorId: number, granteeId: number): Promise<CalendarPermission> => {
      const result = await pool.query<CalendarPermission>(
        'INSERT INTO calendar_permissions (grantor_id, grantee_id, permission_type) VALUES ($1, $2, $3) RETURNING *',
        [grantorId, granteeId, 'user']
      );
      return result.rows[0];
    },
    
    grantDomainPermission: async (grantorId: number, domain: string): Promise<CalendarPermission> => {
      const result = await pool.query<CalendarPermission>(
        'INSERT INTO calendar_permissions (grantor_id, grantee_domain, permission_type) VALUES ($1, $2, $3) RETURNING *',
        [grantorId, domain, 'domain']
      );
      return result.rows[0];
    },
    
    grantOncePermission: async (grantorId: number, granteeId: number, expiresAt: Date): Promise<CalendarPermission> => {
      const result = await pool.query<CalendarPermission>(
        'INSERT INTO calendar_permissions (grantor_id, grantee_id, permission_type, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [grantorId, granteeId, 'once', expiresAt]
      );
      return result.rows[0];
    },
    
    findByGrantor: async (grantorId: number): Promise<CalendarPermission[]> => {
      const result = await pool.query<CalendarPermission>(
        'SELECT * FROM calendar_permissions WHERE grantor_id = $1 AND status = $2 ORDER BY created_at DESC',
        [grantorId, 'active']
      );
      return result.rows;
    },
    
    revoke: async (id: number, grantorId: number): Promise<void> => {
      await pool.query(
        'UPDATE calendar_permissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND grantor_id = $3',
        ['revoked', id, grantorId]
      );
    },
  },
  
  // Permission requests queries
  permissionRequests: {
    create: async (requesterId: number, recipientId: number | null, recipientEmail: string | null, context?: string): Promise<PermissionRequest> => {
      const result = await pool.query<PermissionRequest>(
        `INSERT INTO permission_requests (requester_id, recipient_id, recipient_email, meeting_context)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [requesterId, recipientId, recipientEmail, context || null]
      );
      return result.rows[0];
    },
    
    findPendingByRecipient: async (recipientId: number): Promise<PermissionRequest[]> => {
      const result = await pool.query<PermissionRequest>(
        'SELECT * FROM permission_requests WHERE recipient_id = $1 AND status = $2 ORDER BY created_at DESC',
        [recipientId, 'pending']
      );
      return result.rows;
    },
    
    findById: async (id: number): Promise<PermissionRequest | null> => {
      const result = await pool.query<PermissionRequest>(
        'SELECT * FROM permission_requests WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    },
    
    updateStatus: async (id: number, status: 'approved' | 'denied'): Promise<void> => {
      await pool.query(
        'UPDATE permission_requests SET status = $1, responded_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id]
      );
    },
    
    findByRequesterAndRecipient: async (requesterId: number, recipientId: number): Promise<PermissionRequest | null> => {
      const result = await pool.query<PermissionRequest>(
        'SELECT * FROM permission_requests WHERE requester_id = $1 AND recipient_id = $2 AND status = $3',
        [requesterId, recipientId, 'pending']
      );
      return result.rows[0] || null;
    },
  },
  
  // Notifications queries
  notifications: {
    create: async (
      userId: number,
      type: string,
      title: string,
      message: string,
      link?: string
    ): Promise<Notification> => {
      const result = await pool.query<Notification>(
        'INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, type, title, message, link || null]
      );
      return result.rows[0];
    },
    
    findByUserId: async (userId: number, unreadOnly = false): Promise<Notification[]> => {
      const query = unreadOnly
        ? 'SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC'
        : 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50';
      const result = await pool.query<Notification>(query, [userId]);
      return result.rows;
    },
    
    markAsRead: async (id: number, userId: number): Promise<void> => {
      await pool.query(
        'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    },
    
    markAllAsRead: async (userId: number): Promise<void> => {
      await pool.query(
        'UPDATE notifications SET read = true WHERE user_id = $1',
        [userId]
      );
    },
  },
};

// Helper function to create default availability rules (Mon-Fri 9am-5pm)
export async function createDefaultAvailabilityRules(userId: number, timezone: string): Promise<void> {
  const weekdays = [1, 2, 3, 4, 5]; // Monday through Friday
  const startTime = '09:00:00';
  const endTime = '17:00:00';
  
  for (const dayOfWeek of weekdays) {
    await db.availabilityRules.create(userId, dayOfWeek, startTime, endTime, timezone);
  }
}

export default db;

