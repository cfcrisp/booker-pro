import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMultipleUsersFreeBusy, findCommonAvailability } from '@/lib/google-calendar';
import { z } from 'zod';

const findTimesSchema = z.object({
  participant_emails: z.array(z.string().email()).min(1),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
});

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { participant_emails, start_date, end_date, duration } = findTimesSchema.parse(body);
    
    // Find users by emails
    const participants = await db.users.findByEmails(participant_emails);
    
    if (participants.length !== participant_emails.length) {
      const foundEmails = participants.map((p) => p.email);
      const missingEmails = participant_emails.filter((e) => !foundEmails.includes(e));
      
      return NextResponse.json(
        { 
          error: 'Some participants not found',
          missingEmails 
        },
        { status: 404 }
      );
    }
    
    // Check permissions and calendar connections for all participants
    const participantStatuses = await Promise.all(
      participants.map(async (participant) => {
        // Check if participant has Google Calendar connected
        const token = await db.oauthTokens.findByUserId(participant.id, 'google');
        if (!token) {
          return {
            ...participant,
            status: 'no_calendar',
            hasPermission: false,
          };
        }
        
        // Check if requester has permission to view this participant's calendar
        const hasPermission = await db.permissions.hasPermission(
          participant.id,
          userPayload.userId
        );
        
        if (hasPermission) {
          return {
            ...participant,
            status: 'ready',
            hasPermission: true,
          };
        }
        
        // Check if there's already a pending request
        const pendingRequest = await db.permissionRequests.findByRequesterAndRecipient(
          userPayload.userId,
          participant.id
        );
        
        if (pendingRequest) {
          return {
            ...participant,
            status: 'pending_approval',
            hasPermission: false,
            requestId: pendingRequest.id,
          };
        }
        
        // Need to request permission
        return {
          ...participant,
          status: 'needs_permission',
          hasPermission: false,
        };
      })
    );
    
    // Get list of participants who need permission requests
    const needsPermission = participantStatuses.filter((p) => p.status === 'needs_permission');
    
    // Auto-send permission requests for those who need it
    if (needsPermission.length > 0) {
      const requester = await db.users.findById(userPayload.userId);
      
      for (const participant of needsPermission) {
        const request = await db.permissionRequests.create(
          userPayload.userId,
          participant.id
        );
        
        await db.notifications.create(
          participant.id,
          'permission_request',
          `${requester?.name} wants to see your calendar`,
          `${requester?.name} (${requester?.email}) has requested access to view your calendar availability.`,
          `/permissions/approve/${request.id}`
        );
        
        // Update status
        participant.status = 'pending_approval';
        participant.requestId = request.id;
      }
    }
    
    // Filter participants who have granted permission
    const authorizedParticipants = participantStatuses.filter((p) => p.hasPermission);
    
    // If no one has granted permission yet, return the status
    if (authorizedParticipants.length === 0) {
      return NextResponse.json({
        message: 'Permission requests sent. Waiting for approvals.',
        participants: participantStatuses.map((p) => ({
          id: p.id,
          email: p.email,
          name: p.name,
          status: p.status,
        })),
        availableSlots: [],
      });
    }
    
    // Get free/busy data only for authorized participants
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const authorizedIds = authorizedParticipants.map((p) => p.id);
    
    const freeBusyData = await getMultipleUsersFreeBusy(
      authorizedIds,
      startDate,
      endDate
    );
    
    // Find common available slots among authorized participants
    const availableSlots = findCommonAvailability(
      freeBusyData,
      startDate,
      endDate,
      duration
    );
    
    return NextResponse.json({
      availableSlots,
      participants: participantStatuses.map((p) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        status: p.status,
      })),
      message: authorizedParticipants.length < participants.length 
        ? `Showing availability for ${authorizedParticipants.length} of ${participants.length} participants. Waiting for permission from others.`
        : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Find meeting times error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

