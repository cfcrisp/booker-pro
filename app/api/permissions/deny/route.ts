import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { request_id } = await request.json();
    
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
        { error: 'Not authorized to deny this request' },
        { status: 403 }
      );
    }
    
    // Update request status
    await db.permissionRequests.updateStatus(request_id, 'denied');
    
    return NextResponse.json({
      message: 'Permission request denied',
    });
  } catch (error) {
    console.error('Permission denial error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

