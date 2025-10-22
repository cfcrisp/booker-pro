import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get permission requests sent by this user (both existing users and pending signups)
    const result = await db.query(
      `SELECT pr.*, 
              u.id as recipient_user_id,
              u.name as recipient_name, 
              u.email as recipient_user_email
       FROM permission_requests pr
       LEFT JOIN users u ON pr.recipient_id = u.id
       WHERE pr.requester_id = $1 
       AND pr.status = 'pending'
       ORDER BY pr.created_at DESC`,
      [userPayload.userId]
    );
    
    const requests = result.rows.map((row) => ({
      id: row.id,
      requester_id: row.requester_id,
      recipient: row.recipient_user_id ? {
        id: row.recipient_user_id,
        name: row.recipient_name,
        email: row.recipient_user_email,
      } : null,
      recipient_email: row.recipient_email, // For users who haven't signed up yet
      meeting_context: row.meeting_context,
      status: row.status,
      created_at: row.created_at,
      expires_at: row.expires_at,
      pending_signup: !row.recipient_user_id,
    }));
    
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get sent requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

