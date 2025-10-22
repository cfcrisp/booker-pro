import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { request_id, permission_type, domain } = await request.json();
    
    // Validate permission type
    if (!['once', 'user', 'domain'].includes(permission_type)) {
      return NextResponse.json(
        { error: 'Invalid permission type' },
        { status: 400 }
      );
    }
    
    // Find the permission request
    const permissionRequest = await db.permissionRequests.findById(request_id);
    
    if (!permissionRequest) {
      return NextResponse.json(
        { error: 'Permission request not found' },
        { status: 404 }
      );
    }
    
    // Verify the user is the recipient
    if (permissionRequest.recipient_id !== userPayload.userId) {
      return NextResponse.json(
        { error: 'Not authorized to approve this request' },
        { status: 403 }
      );
    }
    
    // Grant the appropriate permission
    let permission;
    
    if (permission_type === 'once') {
      // Expires after 7 days (enough time to schedule the meeting)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      permission = await db.permissions.grantOncePermission(
        userPayload.userId,
        permissionRequest.requester_id,
        expiresAt
      );
    } else if (permission_type === 'user') {
      permission = await db.permissions.grantUserPermission(
        userPayload.userId,
        permissionRequest.requester_id
      );
    } else if (permission_type === 'domain') {
      if (!domain) {
        return NextResponse.json(
          { error: 'Domain required for domain permission' },
          { status: 400 }
        );
      }
      permission = await db.permissions.grantDomainPermission(
        userPayload.userId,
        domain
      );
    }
    
    // Update request status
    await db.permissionRequests.updateStatus(request_id, 'approved');
    
    // Notify the requester
    const recipient = await db.users.findById(userPayload.userId);
    await db.notifications.create(
      permissionRequest.requester_id,
      'permission_granted',
      `${recipient?.name} granted you calendar access`,
      `You can now view ${recipient?.name}'s calendar availability.`,
      '/find-meeting'
    );
    
    return NextResponse.json({
      message: 'Permission granted',
      permission,
    });
  } catch (error) {
    console.error('Permission approval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

