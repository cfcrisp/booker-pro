import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@booker.app';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface AvailabilityRequestEmailData {
  recipientEmail: string;
  recipientName: string;
  coordinatorName: string;
  title: string;
  description?: string;
  responseToken: string;
  startDate: string;
  endDate: string;
  socialProof?: {
    teamWhitelistedCount?: number;
    teamSize?: number;
    coordinatorDomain?: string;
  };
}

interface UpgradePromptEmailData {
  recipientEmail: string;
  recipientName: string;
}

interface TeamInviteEmailData {
  recipientEmail: string;
  inviterName: string;
  domain: string;
  inviteToken: string;
}

interface BilateralPressureEmailData {
  coordinatorEmail: string;
  coordinatorName: string;
  respondentName: string;
  respondentEmail: string;
  responseTimeSeconds: number;
  meetingTitle: string;
  bilateralStats: {
    teamWhitelistedCount: number;
    teamNotWhitelistedCount: number;
    hasWhitelistedYou: boolean;
    respondentDomain: string;
  };
}

export async function sendAvailabilityRequestEmail(data: AvailabilityRequestEmailData): Promise<void> {
  const responseUrl = `${APP_URL}/respond/${data.responseToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background: #5568d3; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .time-estimate { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; font-weight: 600; color: #4b5563; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">📅 Availability Request</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            
            <p><strong>${data.coordinatorName}</strong> is trying to schedule a meeting and needs your availability:</p>
            
            <h2 style="color: #111827; margin-top: 20px;">${data.title}</h2>
            ${data.description ? `<p style="color: #6b7280;">${data.description}</p>` : ''}
            
            <p><strong>Date Range:</strong> ${data.startDate} to ${data.endDate}</p>
            
            <div class="time-estimate">
              ⏱️ Takes only 30 seconds to respond
            </div>
            
            <p style="text-align: center;">
              <a href="${responseUrl}" class="button">Mark Your Availability</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              No account needed! Just click and drag on the times you're available.
            </p>

            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-top: 20px; color: white;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px;">⚡ Or Save Time: Connect Your Calendar</h3>
              <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
                Instead of manually clicking, connect your Google Calendar once and we'll automatically show your available times in 3 seconds.
              </p>
              <ul style="margin: 0 0 15px 0; padding-left: 20px; font-size: 14px;">
                <li>✓ Auto-fill availability from your calendar</li>
                <li>✓ Respond in 3 seconds instead of 20 seconds</li>
                <li>✓ Never miss a scheduling conflict</li>
                <li>✓ Create your own scheduling links</li>
              </ul>
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">
                Works with Google Calendar • Takes 30 seconds to set up • Free to start
              </p>
            </div>

            ${data.socialProof && data.socialProof.teamWhitelistedCount && data.socialProof.teamWhitelistedCount > 0 ? `
              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 20px;">
                <strong style="color: #1e40af;">⚡ ${data.socialProof.teamWhitelistedCount} ${data.socialProof.teamWhitelistedCount === 1 ? 'person' : 'people'} at your company already auto-share with ${data.coordinatorName}</strong>
                <p style="color: #6b7280; margin-top: 5px; font-size: 14px;">
                  ${data.socialProof.teamSize && data.socialProof.teamSize > data.socialProof.teamWhitelistedCount 
                    ? `${data.socialProof.teamSize - data.socialProof.teamWhitelistedCount} ${data.socialProof.teamSize - data.socialProof.teamWhitelistedCount === 1 ? 'person' : 'people'} still respond manually. Be a lightning responder!` 
                    : 'Join them for instant scheduling!'}
                </p>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Sent via Booker - Smart Scheduling Made Simple</p>
            <p style="font-size: 12px; color: #9ca3af;">
              If you have trouble with the button, copy this link: ${responseUrl}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Hi ${data.recipientName},

${data.coordinatorName} is trying to schedule a meeting and needs your availability:

${data.title}
${data.description ? data.description : ''}

Date Range: ${data.startDate} to ${data.endDate}

Mark your availability here (takes only 30 seconds):
${responseUrl}

No account needed! Just click and drag on the times you're available.

---
Sent via Booker - Smart Scheduling Made Simple
  `;

  const msg = {
    to: data.recipientEmail,
    from: FROM_EMAIL,
    subject: `${data.coordinatorName} needs your availability for: ${data.title}`,
    text: textContent,
    html: htmlContent,
  };

  if (SENDGRID_API_KEY) {
    await sgMail.send(msg);
  } else {
    console.log('SendGrid not configured. Email would be sent to:', data.recipientEmail);
    console.log('Response URL:', responseUrl);
  }
}

export async function sendUpgradePromptEmail(data: UpgradePromptEmailData): Promise<void> {
  const signupUrl = `${APP_URL}/register`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .benefit { background: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">⚡ Save Time on Your Next Request</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName},</p>
            
            <p>You just spent 30 seconds marking your availability manually. <strong>Next time, we can do it in 5 seconds</strong> by connecting your calendar!</p>
            
            <div class="benefit">
              <strong>✅ Auto-fill availability</strong><br>
              Future requests are filled automatically from your Google Calendar
            </div>
            
            <div class="benefit">
              <strong>⚡ One-click responses</strong><br>
              Review and confirm instead of manual clicking
            </div>
            
            <div class="benefit">
              <strong>🔔 Conflict alerts</strong><br>
              Get notified if a meeting conflicts with your schedule
            </div>
            
            <div class="benefit">
              <strong>🔗 Your own scheduling links</strong><br>
              Let others book time with you automatically
            </div>
            
            <p style="text-align: center;">
              <a href="${signupUrl}" class="button">Connect Calendar in 30 Seconds</a>
            </p>
            
            <p style="color: #6b7280; text-align: center; font-size: 14px;">
              Works with Google Calendar • Takes 30 seconds • Free to start
            </p>
          </div>
          <div class="footer">
            <p>Booker - Smart Scheduling Made Simple</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Hi ${data.recipientName},

You just spent 30 seconds marking your availability manually. Next time, we can do it in 5 seconds by connecting your calendar!

Benefits of connecting your calendar:

✅ Auto-fill availability - Future requests are filled automatically from your Google Calendar
⚡ One-click responses - Review and confirm instead of manual clicking  
🔔 Conflict alerts - Get notified if a meeting conflicts with your schedule
🔗 Your own scheduling links - Let others book time with you automatically

Connect your calendar in 30 seconds:
${signupUrl}

Works with Google Calendar • Takes 30 seconds • Free to start

---
Booker - Smart Scheduling Made Simple
  `;

  const msg = {
    to: data.recipientEmail,
    from: FROM_EMAIL,
    subject: '⚡ Save 25 seconds on your next availability request',
    text: textContent,
    html: htmlContent,
  };

  if (SENDGRID_API_KEY) {
    await sgMail.send(msg);
  } else {
    console.log('SendGrid not configured. Upgrade email would be sent to:', data.recipientEmail);
  }
}

export async function sendTeamInviteEmail(data: TeamInviteEmailData): Promise<void> {
  const inviteUrl = `${APP_URL}/join/${data.inviteToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; padding: 14px 28px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 Join Your Team on Booker</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join ${data.domain} on Booker!</p>
            
            <p>Your team is already using Booker to simplify scheduling. Connect your calendar to:</p>
            
            <ul>
              <li>Respond to availability requests in seconds</li>
              <li>Auto-fill your availability from Google Calendar</li>
              <li>Create your own scheduling links</li>
              <li>Never miss a scheduling conflict</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${inviteUrl}" class="button">Join Your Team</a>
            </p>
          </div>
          <div class="footer">
            <p>Booker - Smart Scheduling Made Simple</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Hi there,

${data.inviterName} has invited you to join ${data.domain} on Booker!

Your team is already using Booker to simplify scheduling. Connect your calendar to:

- Respond to availability requests in seconds
- Auto-fill your availability from Google Calendar
- Create your own scheduling links
- Never miss a scheduling conflict

Join your team here:
${inviteUrl}

---
Booker - Smart Scheduling Made Simple
  `;

  const msg = {
    to: data.recipientEmail,
    from: FROM_EMAIL,
    subject: `${data.inviterName} invited you to join ${data.domain} on Booker`,
    text: textContent,
    html: htmlContent,
  };

  if (SENDGRID_API_KEY) {
    await sgMail.send(msg);
  } else {
    console.log('SendGrid not configured. Team invite would be sent to:', data.recipientEmail);
  }
}

export async function sendBilateralPressureEmail(data: BilateralPressureEmailData): Promise<void> {
  const responseTime = data.responseTimeSeconds < 60 
    ? `${data.responseTimeSeconds} seconds`
    : data.responseTimeSeconds < 3600
    ? `${Math.round(data.responseTimeSeconds / 60)} minutes`
    : `${Math.round(data.responseTimeSeconds / 3600)} hours`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .stat-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎉 ${data.respondentName} Responded!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.coordinatorName},</p>
            
            <p><strong>${data.respondentName}</strong> just marked their availability for "${data.meetingTitle}" in ${responseTime}.</p>

            ${data.bilateralStats.hasWhitelistedYou ? `
              <div class="stat-box">
                <strong style="color: #047857;">✓ ${data.respondentName} has already whitelisted you!</strong>
                <p style="color: #6b7280; margin-top: 5px; font-size: 14px;">
                  They trust you enough to auto-share their availability. Why not return the favor?
                </p>
              </div>
            ` : ''}

            ${data.bilateralStats.teamWhitelistedCount > 0 ? `
              <div class="stat-box">
                <strong style="color: #047857;">⚡ ${data.bilateralStats.teamWhitelistedCount} ${data.bilateralStats.teamWhitelistedCount === 1 ? 'person' : 'people'} at ${data.bilateralStats.respondentDomain} already auto-share with you</strong>
                <p style="color: #6b7280; margin-top: 5px; font-size: 14px;">
                  Instant scheduling is working! The more people who whitelist, the faster everyone schedules.
                </p>
              </div>
            ` : ''}

            ${data.bilateralStats.teamNotWhitelistedCount > 0 ? `
              <div class="warning-box">
                <strong style="color: #92400e;">🐌 ${data.bilateralStats.teamNotWhitelistedCount} ${data.bilateralStats.teamNotWhitelistedCount === 1 ? 'person' : 'people'} at ${data.bilateralStats.respondentDomain} still respond manually</strong>
                <p style="color: #6b7280; margin-top: 5px; font-size: 14px;">
                  Ask ${data.respondentName} to encourage their team to whitelist @${data.coordinatorEmail.split('@')[1]} for instant scheduling!
                </p>
              </div>
            ` : ''}

            ${!data.bilateralStats.hasWhitelistedYou ? `
              <p style="margin-top: 20px;">
                <strong>Pro tip:</strong> Whitelist ${data.respondentName} back! When both parties whitelist each other, scheduling becomes instant.
              </p>
            ` : ''}
            
            <p style="text-align: center;">
              <a href="${APP_URL}/requests" class="button">View All Responses</a>
            </p>
          </div>
          <div class="footer">
            <p>Booker - The Intelligent Availability Network</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Hi ${data.coordinatorName},

${data.respondentName} just marked their availability for "${data.meetingTitle}" in ${responseTime}.

${data.bilateralStats.hasWhitelistedYou ? `
✓ ${data.respondentName} has already whitelisted you!
They trust you enough to auto-share their availability. Why not return the favor?
` : ''}

${data.bilateralStats.teamWhitelistedCount > 0 ? `
⚡ ${data.bilateralStats.teamWhitelistedCount} ${data.bilateralStats.teamWhitelistedCount === 1 ? 'person' : 'people'} at ${data.bilateralStats.respondentDomain} already auto-share with you
` : ''}

${data.bilateralStats.teamNotWhitelistedCount > 0 ? `
🐌 ${data.bilateralStats.teamNotWhitelistedCount} ${data.bilateralStats.teamNotWhitelistedCount === 1 ? 'person' : 'people'} at ${data.bilateralStats.respondentDomain} still respond manually
` : ''}

View all responses: ${APP_URL}/requests

---
Booker - The Intelligent Availability Network
  `;

  const msg = {
    to: data.coordinatorEmail,
    from: FROM_EMAIL,
    subject: `🎉 ${data.respondentName} responded to "${data.meetingTitle}"`,
    text: textContent,
    html: htmlContent,
  };

  if (SENDGRID_API_KEY) {
    await sgMail.send(msg);
  } else {
    console.log('SendGrid not configured. Bilateral pressure email would be sent to:', data.coordinatorEmail);
  }
}

