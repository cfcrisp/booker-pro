import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get pending permission requests for this user
    const requests = await db.permissionRequests.findPendingByRecipient(
      userPayload.userId
    );
    
    // Enrich with requester details
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        const requester = await db.users.findById(req.requester_id);
        return {
          ...req,
          requester: requester
            ? {
                id: requester.id,
                name: requester.name,
                email: requester.email,
              }
            : null,
        };
      })
    );
    
    return NextResponse.json({
      requests: enrichedRequests,
    });
  } catch (error) {
    console.error('Get permission requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

