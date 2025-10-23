import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

interface AttendeeStatus {
  email: string;
  status: 'has_permission' | 'request_sent' | 'request_pending' | 'self' | 'not_registered' | 'error';
  message: string;
}

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { attendee_emails, context } = await request.json();
    
    if (!attendee_emails || !Array.isArray(attendee_emails) || attendee_emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one attendee email is required' },
        { status: 400 }
      );
    }
    
    // Get current user
    const currentUser = await db.users.findById(userPayload.userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const results: AttendeeStatus[] = [];
    
    // Process each attendee
    for (const email of attendee_emails) {
      const trimmedEmail = email.trim().toLowerCase();
      
      // Skip if it's the current user
      if (trimmedEmail === currentUser.email.toLowerCase()) {
        results.push({
          email: trimmedEmail,
          status: 'self',
          message: 'This is your email',
        });
        continue;
      }
      
      try {
        // Find attendee by email
        const attendee = await db.users.findByEmail(trimmedEmail);
        
        if (!attendee) {
          // User doesn't exist - create request for when they sign up
          const permissionRequest = await db.permissionRequests.create(
            userPayload.userId,
            null,
            trimmedEmail,
            context || 'Meeting invitation'
          );
          
          results.push({
            email: trimmedEmail,
            status: 'not_registered',
            message: 'User not registered yet. Request will be sent when they sign up.',
          });
          continue;
        }
        
        // Check if we already have permission
        const hasPermission = await db.permissions.hasPermission(
          attendee.id,
          userPayload.userId
        );
        
        if (hasPermission) {
          results.push({
            email: trimmedEmail,
            status: 'has_permission',
            message: 'Already have access',
          });
          continue;
        }
        
        // Check if request already exists
        const existingRequest = await db.permissionRequests.findByRequesterAndRecipient(
          userPayload.userId,
          attendee.id
        );
        
        if (existingRequest) {
          results.push({
            email: trimmedEmail,
            status: 'request_pending',
            message: 'Request already pending',
          });
          continue;
        }
        
        // Create new permission request
        const permissionRequest = await db.permissionRequests.create(
          userPayload.userId,
          attendee.id,
          null,
          context || 'Meeting invitation'
        );
        
        // Create notification for the attendee
        await db.notifications.create(
          attendee.id,
          'permission_request',
          `${currentUser.name} wants to see your calendar`,
          `${currentUser.name} (${currentUser.email}) has requested access to view your calendar availability for scheduling a meeting.`,
          '/permissions/requests'
        );
        
        results.push({
          email: trimmedEmail,
          status: 'request_sent',
          message: 'Permission request sent',
        });
        
      } catch (error) {
        console.error(`Error processing ${trimmedEmail}:`, error);
        results.push({
          email: trimmedEmail,
          status: 'error',
          message: 'Failed to process request',
        });
      }
    }
    
    // Calculate summary
    const summary = {
      total: results.length,
      has_permission: results.filter(r => r.status === 'has_permission').length,
      request_sent: results.filter(r => r.status === 'request_sent').length,
      request_pending: results.filter(r => r.status === 'request_pending').length,
      not_registered: results.filter(r => r.status === 'not_registered').length,
      errors: results.filter(r => r.status === 'error').length,
    };
    
    return NextResponse.json({
      message: 'Permission requests processed',
      results,
      summary,
    });
    
  } catch (error) {
    console.error('Bulk permission request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

