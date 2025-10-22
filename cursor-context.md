## Booker - AI Context Document

**Product**: Cross-organization calendar availability tool with permission-based access control

### Core Concept
Aggregates Google Calendar free/busy data from multiple participants to find common meeting times. Users must grant permission before their calendar can be queried.

---

## Architecture

**Stack**: Next.js 14 (App Router), TypeScript, PostgreSQL, Google OAuth 2.0  
**Auth**: Google Sign-In only, JWT in httpOnly cookies  
**Database**: PostgreSQL with typed queries via `pg` driver  

### Key Files
- `/lib/db.ts` - All database queries with TypeScript interfaces
- `/lib/auth.ts` - JWT generation, verification, cookie management
- `/lib/google-calendar.ts` - Google Calendar API, OAuth, freebusy queries
- `/database/schema.sql` - Complete database schema (no migrations)
- `/app/api/` - Next.js API routes

---

## Critical Flows

### 1. Authentication (Google Only)
- User clicks "Sign in with Google"
- OAuth flow with scopes: `calendar.events`, `userinfo.email`, `userinfo.profile`
- On callback: Creates user + stores OAuth tokens + sets JWT cookie + **creates default availability rules (Mon-Fri 9am-5pm)**
- State param determines: `{type: 'signin'}` or `{userId: X}` for existing users
- JWT verified in all API routes via `getUserFromRequest()`
- User timezone auto-detected on signup, adjustable in settings

### 2. Permission System
**Coordinator wants to find meeting time:**
1. Enters participant emails
2. System checks `hasPermission(grantorId, granteeId)` for each
3. If no permission: Auto-creates `permission_request` + sends notification
4. Participant receives notification, chooses permission level:
   - **Once**: 7-day expiration, single-use
   - **User**: Permanent trust of specific person
   - **Domain**: Trust everyone from @domain.com
5. On approval: Creates `calendar_permission` record
6. Coordinator can now query that calendar

**Permission Check Logic:**
```typescript
// Checks user-specific OR domain-level permissions
// Validates expiration for "once" type
// Returns boolean for calendar access
await db.permissions.hasPermission(grantorId, granteeId)
```

### 3. Find Meeting Times
1. Check permissions for all participants
2. Send requests to those without permission
3. Query Google Calendar freebusy for authorized participants only
4. Calculate overlapping free slots (30-min increments)
5. Return partial results if some still pending approval

### 4. Token Management
- OAuth tokens stored in `oauth_tokens` table
- Auto-refresh when expired using refresh_token
- New tokens saved back to DB

---

## Database Schema

**Users & Auth**
- `users` - email, google_id, name, timezone (password_hash nullable, unused)
- `oauth_tokens` - access_token, refresh_token, expiry per user/provider

**Permissions** (Core Feature)
- `calendar_permissions` - grantor_id, grantee_id OR grantee_domain, permission_type, status, expires_at
- `permission_requests` - requester_id, recipient_id, status, expires after 7 days
- `notifications` - user_id, type, title, message, link, read status

**Scheduling**
- `availability_rules` - Weekly patterns (day_of_week, start_time, end_time, timezone). Default: Mon-Fri 9am-5pm created on signup.
- `blocked_times` - Specific unavailable periods (start_time, end_time, reason)
- `meetings` - coordinator_id, title, description, start_time, end_time
- `meeting_participants` - Links users to meetings

---

## API Routes

### Auth
- `GET /api/auth/google-signin` → Returns Google OAuth URL
- `GET /api/auth/google/callback` → Handles OAuth, creates user, sets cookie, creates default rules
- `GET /api/auth/me` → Returns current user info
- `PATCH /api/auth/me` → Updates user timezone
- `POST /api/auth/logout` → Clears auth cookie

### Permissions
- `POST /api/permissions/request` → Request calendar access (auto-called by find-times)
- `POST /api/permissions/approve` → Approve with permission_type (once/user/domain)
- `POST /api/permissions/deny` → Deny request
- `POST /api/permissions/revoke` → Revoke existing permission
- `GET /api/permissions/list` → List all permissions user has granted
- `GET /api/permissions/requests` → Pending requests for current user

### Meetings
- `POST /api/meetings/find-times` → Check permissions → Query calendars → Return slots
- `POST /api/meetings` → Create meeting record (doesn't create calendar events yet)
- `GET /api/meetings` → List user's meetings

### Availability
- `GET/POST/DELETE /api/availability/rules` → Manage weekly patterns
- `GET/POST/DELETE /api/availability/blocked` → Manage blocked times

### Notifications
- `GET /api/notifications?unread_only=true` → Get notifications
- `POST /api/notifications` → Mark as read (action: "mark_read")

---

## Pages (Frontend)

- `/` - Landing page, Google Sign-In CTA
- `/login` - Google Sign-In only (no email/password)
- `/register` - Redirects to /login
- `/dashboard` - Main hub, calendar status, navigation, notifications panel, permission request alerts
- `/find-meeting` - Email chip input (Enter to add), inline calendar (7-day default), duration selector
- `/availability` - Timezone selector + weekly rules + blocked times (defaults to Mon-Fri 9am-5pm)
- `/permissions` - View and revoke all granted permissions (user/domain/once)
- `/permissions/requests` - Approve/deny pending requests with 3 permission levels

---

## Google Calendar Integration

**Scopes Used:**
- `https://www.googleapis.com/auth/calendar.events` (create/read events)
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

**Key Functions:**
- `getUserFreeBusy(userId, timeMin, timeMax)` → Returns busy slots array
- `getMultipleUsersFreeBusy(userIds[], timeMin, timeMax)` → Aggregates for multiple users
- `findCommonAvailability(freeBusyData[], start, end, duration)` → Calculates free slots
- `refreshAccessToken(refreshToken)` → Gets new access token when expired

---

## Security

✅ All database queries parameterized (SQL injection protected)  
✅ JWT secret from environment variable  
✅ httpOnly cookies prevent XSS  
✅ OAuth tokens stored encrypted in DB  
✅ Permission checks enforced at API level before calendar access  
✅ Domain validation on domain-level permissions  
✅ User ownership verified for permission revocations  

---

## Deployment Checklist

1. PostgreSQL database provisioned
2. Run: `npm run db:migrate` (executes schema.sql)
3. Environment variables configured (see .env.example)
4. Google OAuth redirect URI updated for production domain
5. Google Calendar API + Google+ API enabled in Cloud Console
6. Build: `npm run build && npm start`

---

## Not Yet Implemented

- Email notifications (currently in-app only)
- Calendar event creation (currently only saves to meetings table)
- Integration of availability_rules/blocked_times with freebusy queries
- Recurring meeting patterns

---

## Debugging Common Issues

**"Column google_id does not exist"**  
→ Run `npm run db:migrate` to create all tables

**"Permission denied" when finding meetings**  
→ Check permission_requests table, ensure approval flow working

**OAuth callback errors**  
→ Verify redirect URI matches exactly in Google Console  
→ Check state parameter JSON parsing

**Token expired errors**  
→ Refresh token logic runs automatically, check oauth_tokens table for refresh_token

---

**Current Status**: Full-stack permission system complete. Users can approve/deny requests, grant user/domain/once permissions, view all permissions, and receive real-time notifications.
