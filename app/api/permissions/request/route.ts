import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { recipient_email, context } = await request.json();
    
    if (!recipient_email) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }
    
    // Get current user
    const currentUser = await db.users.findById(userPayload.userId);
    
    // Check if requesting from yourself
    if (currentUser?.email === recipient_email) {
      return NextResponse.json(
        { error: 'Cannot request permission from yourself' },
        { status: 400 }
      );
    }
    
    // Find recipient by email
    const recipient = await db.users.findByEmail(recipient_email);
    
    if (recipient) {
      // User exists - check for existing permission
      const hasPermission = await db.permissions.hasPermission(
        recipient.id,
        userPayload.userId
      );
      
      if (hasPermission) {
        return NextResponse.json({
          message: 'Permission already granted',
          has_permission: true,
        });
      }
      
      // Check if request already exists
      const existingRequest = await db.permissionRequests.findByRequesterAndRecipient(
        userPayload.userId,
        recipient.id
      );
      
      if (existingRequest) {
        return NextResponse.json({
          message: 'Request already pending',
          request: existingRequest,
        });
      }
      
      // Create permission request
      const permissionRequest = await db.permissionRequests.create(
        userPayload.userId,
        recipient.id,
        context
      );
      
      // Create notification for recipient
      await db.notifications.create(
        recipient.id,
        'permission_request',
        `${currentUser?.name} wants to see your calendar`,
        `${currentUser?.name} (${currentUser?.email}) has requested access to view your calendar availability.`,
        `/permissions/requests`
      );
      
      return NextResponse.json({
        message: 'Permission request sent',
        request: permissionRequest,
        pending_signup: false,
      });
    } else {
      // User doesn't exist yet - create request with email only for future signup
      // Check if request already exists for this email
      const existingEmailRequest = await db.query(
        `SELECT * FROM permission_requests 
         WHERE requester_id = $1 
         AND recipient_email = $2 
         AND status = 'pending'`,
        [userPayload.userId, recipient_email]
      );
      
      if (existingEmailRequest.rows.length > 0) {
        return NextResponse.json({
          message: 'Request already pending for this email',
          request: existingEmailRequest.rows[0],
        });
      }
      
      // Create request with email instead of user ID (longer expiration for pending signups)
      const result = await db.query(
        `INSERT INTO permission_requests 
         (requester_id, recipient_email, meeting_context, status, expires_at, created_at)
         VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP)
         RETURNING *`,
        [userPayload.userId, recipient_email, context || null]
      );
      
      return NextResponse.json({
        message: 'Request sent (user will receive it when they sign up)',
        request: result.rows[0],
        pending_signup: true,
      });
    }
  } catch (error) {
    console.error('Permission request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
