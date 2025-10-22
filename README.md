# Booker

**Cross-organization calendar availability tool**

Instantly find meeting times across teams and organizations by aggregating Google Calendar availability from multiple participants.

## Features

- 🔐 **Google Sign-In** - One-click authentication with automatic calendar connection
- 🌐 **Cross-Organization** - Works across different Google Workspaces
- 🔒 **Privacy-First Permissions** - Granular consent system with three permission levels
- ⚡ **Instant Availability** - Real-time free/busy aggregation
- 🎯 **Smart Scheduling** - Find overlapping free time slots automatically

## Quick Start

1. Sign in with your Google account at [your-booker-url.com]
2. Your calendar is automatically connected
3. Enter participant emails to find meeting times
4. Participants approve access (once, per-user, or per-domain)
5. View common availability and book the meeting

## Permission System

### Three Consent Levels

**Allow Once** - One-time access for a single meeting request
- Expires after 7 days or when meeting is scheduled

**Trust User** - Ongoing access for a specific person
- View your availability anytime for future meetings
- Revoke access in settings

**Trust Domain** - Access for anyone from an organization
- Example: Trust everyone at @partnercorp.com
- Perfect for frequent cross-team collaboration

## How It Works

1. **Coordinator** enters participant emails
2. **System** automatically sends permission requests to new participants
3. **Participants** receive notification and choose permission level
4. **Coordinator** sees availability for approved participants
5. **Book** the meeting at a mutually available time

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes, PostgreSQL
- **Authentication**: Google OAuth 2.0
- **Calendar**: Google Calendar API

## Privacy & Security

✅ Only free/busy information accessed (no event details)  
✅ Explicit user consent required for all calendar access  
✅ Granular permission controls  
✅ Revoke access anytime  
✅ Works without calendar sharing  

## Use Cases

- Sales team + Product team meetings
- Cross-company partner meetings
- Client scheduling
- Distributed team coordination
- External consultant availability

## License

MIT

---

For setup and development instructions, see [DEVELOPMENT.md](DEVELOPMENT.md)
