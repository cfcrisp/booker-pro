import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Get list of users/domains who have granted me permission to see their calendar
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

    // Get permissions where I'm the grantee (can see their calendar)
    // Exclude permissions from myself (you always have access to your own calendar)
    const permissions = await db.query(
      `SELECT 
        cp.*,
        u.id as grantor_user_id,
        u.email as grantor_email,
        u.name as grantor_name
       FROM calendar_permissions cp
       JOIN users u ON cp.grantor_id = u.id
       WHERE (cp.grantee_id = $1 OR cp.grantee_domain = $2)
       AND cp.status = 'active'
       AND cp.grantor_id != $1
       ORDER BY cp.created_at DESC`,
      [user.userId, user.email.split('@')[1]]
    );

    return NextResponse.json({
      permissions: permissions.rows.map(row => ({
        id: row.id,
        grantor_id: row.grantor_user_id,
        grantor_email: row.grantor_email,
        grantor_name: row.grantor_name,
        permission_type: row.permission_type,
        status: row.status,
        expires_at: row.expires_at,
        created_at: row.created_at,
      }))
    });
  } catch (error) {
    console.error('Error fetching granted permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

