import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Get frequently contacted users based on:
 * - Permission grants (people who can see my calendar)
 * - Permission requests I've made
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get emails from granted permissions (people who can see my calendar)
    const permissionsGranted = await db.query(
      `SELECT DISTINCT u.email, u.name, MAX(cp.created_at) as last_interaction
       FROM calendar_permissions cp
       JOIN users u ON cp.grantee_id = u.id
       WHERE cp.grantor_id = $1 AND cp.status = 'active'
       GROUP BY u.email, u.name`,
      [user.userId]
    );

    // Get emails from permission requests I've made
    const permissionsRequested = await db.query(
      `SELECT DISTINCT u.email, u.name, MAX(pr.created_at) as last_interaction
       FROM permission_requests pr
       JOIN users u ON pr.recipient_id = u.id
       WHERE pr.requester_id = $1
       GROUP BY u.email, u.name`,
      [user.userId]
    );

    // Combine and deduplicate
    const contactsMap = new Map<string, { email: string; name: string; lastInteraction: Date }>();

    [...permissionsGranted.rows, ...permissionsRequested.rows].forEach((row) => {
      const email = row.email.toLowerCase();
      const existing = contactsMap.get(email);
      
      if (!existing || new Date(row.last_interaction) > existing.lastInteraction) {
        contactsMap.set(email, {
          email: row.email,
          name: row.name || row.email,
          lastInteraction: new Date(row.last_interaction),
        });
      }
    });

    // Convert to array and sort by most recent interaction
    const contacts = Array.from(contactsMap.values())
      .sort((a, b) => b.lastInteraction.getTime() - a.lastInteraction.getTime())
      .slice(0, 20) // Top 20 most frequent contacts
      .map(({ email, name }) => ({ email, name }));

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching frequent contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

