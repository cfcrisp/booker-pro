import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get all permissions granted by this user
    const permissions = await db.permissions.findByGrantor(userPayload.userId);
    
    // Enrich with user details
    const enrichedPermissions = await Promise.all(
      permissions.map(async (perm) => {
        let granteeInfo = null;
        
        if (perm.grantee_id) {
          const user = await db.users.findById(perm.grantee_id);
          if (user) {
            granteeInfo = {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          }
        }
        
        return {
          ...perm,
          grantee_info: granteeInfo,
        };
      })
    );
    
    return NextResponse.json({
      permissions: enrichedPermissions,
    });
  } catch (error) {
    console.error('List permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

