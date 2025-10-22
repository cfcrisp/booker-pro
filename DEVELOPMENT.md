# Booker - Development Guide

Internal documentation for setup and development.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Google Cloud account

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

Create database:
```bash
createdb booker
```

Configure `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/booker
JWT_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run migrations:
```bash
npm run db:migrate
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project and enable APIs:
   - Google Calendar API
   - Google+ API (for user info)
3. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
4. Configure OAuth consent screen:
   - User type: External
   - Required scopes:
     - `https://www.googleapis.com/auth/calendar.events` (or `calendar.readonly` for read-only)
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Testing

Create test users:
1. Sign in with different Google accounts
2. Test permission requests between users
3. Test domain-level permissions with same-domain emails

## Database Schema

**Users & Auth**
- `users` - User accounts (Google Sign-In only)
- `oauth_tokens` - Google OAuth tokens with auto-refresh

**Permissions**
- `calendar_permissions` - Granted access (once/user/domain)
- `permission_requests` - Pending approval requests
- `notifications` - In-app notifications

**Scheduling**
- `availability_rules` - Weekly availability patterns
- `blocked_times` - Specific unavailable periods
- `meetings` - Scheduled meetings
- `meeting_participants` - Meeting attendees

## API Routes

### Authentication
- `GET /api/auth/google-signin` - Initiate Google Sign-In
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - Sign out

### Permissions
- `POST /api/permissions/request` - Request calendar access
- `POST /api/permissions/approve` - Approve with permission level
- `POST /api/permissions/deny` - Deny request
- `POST /api/permissions/revoke` - Revoke permission
- `GET /api/permissions/list` - List granted permissions
- `GET /api/permissions/requests` - Pending requests

### Meetings
- `POST /api/meetings/find-times` - Find available slots (checks permissions)
- `POST /api/meetings` - Create meeting
- `GET /api/meetings` - List meetings

### Availability
- `GET/POST/DELETE /api/availability/rules` - Manage weekly rules
- `GET/POST/DELETE /api/availability/blocked` - Manage blocked times

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Mark as read

## Permission System Flow

1. **Request**: Coordinator searches for availability
2. **Check**: System checks if coordinator has permission for each participant
3. **Auto-send**: Sends requests to participants without permission
4. **Approve**: Participant chooses: Allow Once, Trust User, or Trust Domain
5. **Query**: System queries calendars only for authorized participants
6. **Partial Results**: Shows availability for approved participants while waiting for others

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `NEXT_PUBLIC_APP_URL` - App base URL

## Deployment

1. Set up production PostgreSQL database
2. Run migrations: `npm run db:migrate`
3. Configure production environment variables
4. Update Google OAuth redirect URI for production domain
5. Build: `npm run build`
6. Start: `npm start`

## Troubleshooting

**Database connection failed**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format
- Ensure database exists: `psql -l | grep booker`

**OAuth errors**
- Verify redirect URI matches exactly in Google Console
- Check Calendar API is enabled
- Ensure required scopes are configured
- Add test users to OAuth consent screen (for development)

**Permission denied errors**
- Run migration to create permission tables
- Check database user has proper permissions

## Future Enhancements

- [ ] Email notifications for permission requests
- [ ] Calendar event creation (write to calendars, not just read)
- [ ] Availability rules integration with freebusy logic
- [ ] Multi-timezone display
- [ ] Recurring meeting patterns
- [ ] Bulk permission management
- [ ] Analytics dashboard

