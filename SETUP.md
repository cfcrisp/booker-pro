# Setup Guide - Booker: The Intelligent Availability Network

## Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

**Run the complete schema (one command):**

```bash
psql $DATABASE_URL -f database/schema.sql
```

This creates all tables needed for:
- ✅ User authentication and OAuth
- ✅ Availability requests and responses
- ✅ Whitelist system (bilateral trust)
- ✅ Responsiveness scoring
- ✅ Team analytics
- ✅ Domain leaderboards

### 3. Environment Variables

Create `.env.local` in the project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication  
JWT_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# SendGrid Email (Optional for development)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. SendGrid Setup (Optional but Recommended)

1. Sign up at [https://signup.sendgrid.com/](https://signup.sendgrid.com/)
2. Create API Key:
   - Settings → API Keys
   - Create API Key
   - Name: "Booker Production"
   - Permissions: "Mail Send" → Full Access
3. Verify sender email:
   - Settings → Sender Authentication
   - Verify a Single Sender
   - Use: `noreply@yourdomain.com`
4. Add to `.env.local`

**Without SendGrid:** Emails won't send, but the app will work. Check console logs for email content.

### 5. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Database Schema Overview

### Core Tables

**Users & Auth:**
- `users` - User accounts
- `oauth_tokens` - Google Calendar tokens
- `availability_rules` - User availability preferences
- `blocked_times` - User blocked time slots

**Availability Requests (No Account Required):**
- `availability_requests` - Request details (title, dates, times)
- `availability_request_recipients` - Individual recipients with unique tokens
- `availability_responses` - Responses with JSONB time slots

**Whitelist Network (The Secret Sauce):**
- `whitelists` - User-to-user and domain-wide trust relationships
- `user_response_metrics` - Responsiveness scores (⚡Lightning, 🟢Quick, 🔴Bottleneck)
- `response_time_log` - Track every response time

**Team Features:**
- `team_onboarding_links` - Shareable team invite links
- `domain_stats` - Company-level analytics and leaderboards

---

## Testing the Complete Flow

### 1. Create Availability Request

```bash
# Visit http://localhost:3000/requests
# Sign in with Google first if needed
```

- Click "New Request"
- Fill in:
  - Title: "Team Lunch Planning"
  - Date Range: Next week
  - Recipients: your-email@example.com
- Click "Create & Send Emails"

### 2. Respond Without Account

- Check console logs for the response URL
- Copy URL like: `/respond/abc123...`
- Open in incognito window
- You'll see:
  - Request details
  - **Green box: "Connect Your Calendar"** ← The key conversion point
  - Interactive grid for manual selection
  - Name field
- Click and drag to select times
- Submit

### 3. See Whitelist Prompt

After submitting, you'll see:

```
✓ Thank You!

You just helped [Name] schedule a meeting.
Next time they need your availability, how should we handle it?

⚡ Auto-share my availability with [Name]
🚀 Auto-share with anyone @company.com
🔒 Ask me each time (stay private)
```

This is the **viral loop engine** - each interaction creates trust relationships.

### 4. View Results

- Go to `/requests`
- Click "View Results"
- See:
  - Aggregated availability
  - **📋 Copy/Paste Available Times** (formatted list)
  - "Perfect Times" when everyone is free
  - Individual recipient status

### 5. Check Team Dashboard

- Visit `/team`
- See:
  - Team member count
  - Calendar adoption rate
  - **Average response time** (vs industry avg)
  - Responsiveness comparison
  - Domain leaderboard

---

## Key Features Implemented

### Phase 1: Zero Friction Entry
✅ No account required for recipients
✅ Email with calendar grid link
✅ Interactive When2Meet-style grid
✅ 15-20 second responses

### Phase 2: Whitelist System
✅ Post-submission whitelist prompt (3 options)
✅ User-to-user whitelisting
✅ Domain-wide whitelisting
✅ Bilateral pressure emails

### Phase 3: Progressive Enhancement
✅ Prominent "Connect Calendar" CTAs in email & app
✅ Responsiveness scoring (Lightning/Quick/Bottleneck)
✅ Response time tracking
✅ Auto-calculated scores

### Phase 4: Team Network Effects
✅ Team dashboard with adoption metrics
✅ Responsiveness comparison (team vs industry)
✅ Domain leaderboard
✅ Copy/pastable time lists

---

## Email Templates

### 1. Availability Request Email

Sent when coordinator creates request:

```
Subject: [Name] needs your availability for: [Title]

[Big Button: Mark Your Availability]

⚡ Or Save Time: Connect Your Calendar
• Auto-fill availability from your calendar
• Respond in 3 seconds instead of 20 seconds
• Never miss a scheduling conflict
```

### 2. Bilateral Pressure Email

Sent to coordinator when someone responds:

```
🎉 [Name] Responded!

[Name] just marked their availability in 30 seconds.

✓ [Name] already whitelisted you! Return the favor?
⚡ 3 people at their company already auto-share with you
🐌 7 people still respond manually
```

### 3. Team Invite Email

Sent when inviting team members:

```
[Name] invited you to join [Company] on Booker!

Your team is already using Booker to simplify scheduling.
[Join Your Team]
```

---

## API Routes

**Availability Requests:**
- `POST /api/availability-requests` - Create request
- `GET /api/availability-requests` - List user's requests
- `GET /api/availability-requests/[token]` - Get request details
- `POST /api/availability-requests/[token]/respond` - Submit response

**Team Management:**
- `GET /api/team/stats` - Team analytics
- `POST /api/team/invite-link` - Create invite link
- `GET /api/team/join/[token]` - Validate invite

**Whitelist (via lib functions):**
- `addUserToWhitelist(userId, whitelistedUserId)`
- `addDomainToWhitelist(userId, domain)`
- `isWhitelisted(grantorId, requestorId, email)`
- `getWhitelistStats(userId, targetEmail)`

**Responsiveness (via lib functions):**
- `recordResponseTime(...)`
- `getUserMetrics(userId)`
- `getScoreDisplay(score)`

---

## Troubleshooting

### "Request not found" error
- Database migration didn't run properly
- Run: `psql $DATABASE_URL -f database/schema.sql`
- Verify tables exist: `\dt` in psql

### Emails not sending
- Check `SENDGRID_API_KEY` in `.env.local`
- Verify sender email in SendGrid dashboard
- Check console logs - emails log even without SendGrid

### Grid not responding
- Check browser console for errors
- Make sure JavaScript is enabled
- Try refreshing the page

### Calendar connection fails
- Verify Google OAuth credentials
- Check redirect URI matches exactly
- Must use `http://localhost:3000` (not 127.0.0.1)

---

## What Makes This Different

### The Viral Loop

```
1. Sarah requests John's availability
2. John responds (15-20 seconds)
3. John sees: "Auto-share with Sarah?" or "Trust @company.com?"
4. John whitelists Sarah
5. Sarah gets email: "John whitelisted you!"
6. Sarah feels reciprocity pressure → whitelists John back
7. Next request = instant (< 5 seconds)
8. Both see ⚡ Lightning status
9. Both encourage teammates
10. Network effects compound
```

### The Psychology

- **Reciprocity:** "They trust me, I should trust them"
- **Social Proof:** "5 people at their company already do this"
- **Peer Pressure:** "I'm the bottleneck"
- **Gamification:** "I want ⚡ Lightning status"

### The Result

**The only scheduling tool that gets exponentially better as more people use it - without mandates.**

---

## Production Deployment

### 1. Database
- Use managed PostgreSQL (AWS RDS, Heroku Postgres, etc.)
- Run schema: `psql $DATABASE_URL -f database/schema.sql`
- Set up backups

### 2. Environment Variables
- Set all production values
- Use strong `JWT_SECRET`
- Configure SendGrid API key
- Set production `NEXT_PUBLIC_APP_URL`

### 3. Deploy
- Vercel (recommended for Next.js)
- Or: AWS, Google Cloud, self-hosted

### 4. Monitor
- Track whitelist adoption rates
- Monitor response time improvements
- Watch domain penetration growth

---

## Documentation

- **[README.md](./README.md)** - Project overview
- **[WHITELIST_NETWORK.md](./WHITELIST_NETWORK.md)** - Network effects guide
- **[INTELLIGENT_NETWORK_SUMMARY.md](./INTELLIGENT_NETWORK_SUMMARY.md)** - Implementation details
- **[QUICK_START.md](./QUICK_START.md)** - Feature walkthrough

---

## Support

Issues? Check:
1. Database migration completed?
2. Environment variables set?
3. SendGrid configured (optional)?
4. Browser console for errors?

---

**Built to eliminate scheduling friction through bilateral trust and network effects.** 🚀

