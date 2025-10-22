import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const blockedTimeSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const blockedTimes = await db.blockedTimes.findByUserId(userPayload.userId);
  return NextResponse.json({ blockedTimes });
}

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { start_time, end_time, reason } = blockedTimeSchema.parse(body);
    
    const blockedTime = await db.blockedTimes.create(
      userPayload.userId,
      new Date(start_time),
      new Date(end_time),
      reason || null
    );
    
    return NextResponse.json({ blockedTime });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Create blocked time error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  
  await db.blockedTimes.delete(parseInt(id), userPayload.userId);
  
  return NextResponse.json({ success: true });
}

