import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { permission_id } = await request.json();
    
    // Revoke the permission
    await db.permissions.revoke(permission_id, userPayload.userId);
    
    return NextResponse.json({
      message: 'Permission revoked',
    });
  } catch (error) {
    console.error('Permission revocation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

