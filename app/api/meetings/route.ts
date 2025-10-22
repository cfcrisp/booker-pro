import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createMeetingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  participant_ids: z.array(z.number()).min(1),
});

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const meetings = await db.meetings.findByCoordinatorId(userPayload.userId);
  return NextResponse.json({ meetings });
}

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { title, description, start_time, end_time, participant_ids } = createMeetingSchema.parse(body);
    
    const meeting = await db.meetings.create(
      userPayload.userId,
      title,
      description || null,
      new Date(start_time),
      new Date(end_time)
    );
    
    // Add participants
    for (const participantId of participant_ids) {
      await db.meetingParticipants.addParticipant(meeting.id, participantId);
    }
    
    return NextResponse.json({ meeting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

