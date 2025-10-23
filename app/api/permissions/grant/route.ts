import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { db } from '@/lib/db';
import { isPersonalEmailDomain } from '@/lib/email-domains';

export async function POST(request: NextRequest) {
  const userPayload = getUserFromRequest(request);
  
  if (!userPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { type, value } = await request.json();
    
    // Validate type
    if (!['email', 'domain'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "email" or "domain"' },
        { status: 400 }
      );
    }
    
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return NextResponse.json(
        { error: 'Value is required' },
        { status: 400 }
      );
    }
    
    const trimmedValue = value.trim().toLowerCase();
    
    if (type === 'domain') {
      // Remove @ symbol if present and validate domain format
      const domain = trimmedValue.startsWith('@') ? trimmedValue.slice(1) : trimmedValue;
      
      // Basic domain validation
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
        return NextResponse.json(
          { error: 'Invalid domain format' },
          { status: 400 }
        );
      }
      
      // Prevent granting domain-wide permissions to personal email domains
      if (isPersonalEmailDomain(`user@${domain}`)) {
        return NextResponse.json(
          { error: 'Cannot grant domain-wide permissions to personal email providers like Gmail, Yahoo, etc. Please grant individual user permissions instead.' },
          { status: 400 }
        );
      }
      
      // Check if domain permission already exists
      const existingPermissions = await db.permissions.findByGrantor(userPayload.userId);
      const domainExists = existingPermissions.some(
        p => p.permission_type === 'domain' && 
             p.grantee_domain === domain && 
             p.status === 'active'
      );
      
      if (domainExists) {
        return NextResponse.json(
          { error: `You already granted access to @${domain}` },
          { status: 400 }
        );
      }
      
      // Grant domain permission
      const permission = await db.permissions.grantDomainPermission(
        userPayload.userId,
        domain
      );
      
      return NextResponse.json({
        message: `Access granted to everyone at @${domain}`,
        permission,
      });
      
    } else if (type === 'email') {
      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      
      // Find user by email
      const granteeUser = await db.users.findByEmail(trimmedValue);
      
      if (!granteeUser) {
        return NextResponse.json(
          { error: 'User not found. They must have an account before you can grant them access.' },
          { status: 404 }
        );
      }
      
      // Don't allow granting to self
      if (granteeUser.id === userPayload.userId) {
        return NextResponse.json(
          { error: 'You cannot grant access to yourself' },
          { status: 400 }
        );
      }
      
      // Check if user permission already exists
      const existingPermissions = await db.permissions.findByGrantor(userPayload.userId);
      const userPermissionExists = existingPermissions.some(
        p => p.grantee_id === granteeUser.id && 
             p.status === 'active' &&
             (p.permission_type === 'user' || p.permission_type === 'once')
      );
      
      if (userPermissionExists) {
        return NextResponse.json(
          { error: `You already granted access to ${trimmedValue}` },
          { status: 400 }
        );
      }
      
      // Grant user permission
      const permission = await db.permissions.grantUserPermission(
        userPayload.userId,
        granteeUser.id
      );
      
      // Notify the user they've been granted access
      const grantor = await db.users.findById(userPayload.userId);
      await db.notifications.create(
        granteeUser.id,
        'permission_granted',
        `${grantor?.name} granted you calendar access`,
        `You can now view ${grantor?.name}'s calendar availability.`,
        '/dashboard'
      );
      
      return NextResponse.json({
        message: `Access granted to ${trimmedValue}`,
        permission,
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Permission grant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

