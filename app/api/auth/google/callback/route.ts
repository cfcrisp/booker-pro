import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserInfo } from '@/lib/google-calendar';
import { db, createDefaultAvailabilityRules } from '@/lib/db';
import { generateToken, createAuthCookie } from '@/lib/auth';
import { updateDomainStats, incrementCalendarConnection } from '@/lib/domain-stats';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=missing_params`
    );
  }
  
  try {
    const stateData = JSON.parse(state);
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }
    
    // Check if this is a sign-in flow or calendar connection flow
    if (stateData.type === 'signin') {
      // Google Sign-In flow
      const userInfo = await getUserInfo(tokens.access_token);
      
      // Check if user already exists
      let user = await db.users.findByGoogleId(userInfo.id);
      
      if (!user) {
        // Check if user exists with same email
        user = await db.users.findByEmail(userInfo.email);
        
        if (user) {
          // Link Google account to existing user
          await db.query(
            'UPDATE users SET google_id = $1 WHERE id = $2',
            [userInfo.id, user.id]
          );
        } else {
          // Create new user with Google - detect timezone
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
          user = await db.users.createWithGoogle(
            userInfo.email,
            userInfo.name,
            userInfo.id,
            timezone
          );
          
          // Create default availability rules (Mon-Fri 9am-5pm)
          await createDefaultAvailabilityRules(user.id, timezone);
          
          // Update domain stats (new user with calendar connected)
          await updateDomainStats(userInfo.email, true);
          
          // Check for any pending permission requests sent to this email before signup
          const pendingRequests = await db.query(
            `UPDATE permission_requests 
             SET recipient_id = $1, recipient_email = NULL
             WHERE recipient_email = $2 
             AND recipient_id IS NULL
             AND status = 'pending'
             RETURNING *`,
            [user.id, userInfo.email]
          );
          
          // Create notifications for any pending requests
          if (pendingRequests.rows.length > 0) {
            for (const request of pendingRequests.rows) {
              const requester = await db.users.findById(request.requester_id);
              if (requester) {
                await db.notifications.create(
                  user.id,
                  'permission_request',
                  'Permission Request Waiting',
                  `${requester.name} requested access to your calendar before you signed up`,
                  '/permissions/requests'
                );
              }
            }
          }
        }
      }
      
      // Store OAuth tokens
      await db.oauthTokens.upsert(
        user.id,
        'google',
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null
      );
      
      // Generate JWT and set cookie
      const jwtToken = generateToken({ userId: user.id, email: user.email });
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=signed_in`
      );
      response.headers.set('Set-Cookie', createAuthCookie(jwtToken));
      
      return response;
    } else {
      // Calendar connection flow (existing user)
      const { userId } = stateData;
      
      // Check if this is first time connecting calendar
      const existingToken = await db.query(
        'SELECT id FROM oauth_tokens WHERE user_id = $1 AND provider = $2',
        [userId, 'google']
      );
      
      await db.oauthTokens.upsert(
        userId,
        'google',
        tokens.access_token,
        tokens.refresh_token || null,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null
      );
      
      // If first time connecting, update domain stats
      if (existingToken.rows.length === 0) {
        const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
          await incrementCalendarConnection(userResult.rows[0].email);
        }
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=google_connected`
      );
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_failed`
    );
  }
}

