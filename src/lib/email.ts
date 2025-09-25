import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required')
}

export interface InviteEmailData {
  inviteeEmail: string
  inviterEmail: string
  pairId: string
  token: string
  connectionCode: string
  approvedTextPreview: string
}

export interface TurnNotificationData {
  recipientEmail: string
  roundNumber: number
  appreciationMessage?: string
}

export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  const { inviteeEmail, inviterEmail, token, connectionCode, approvedTextPreview } = data

  const inviteUrl = `${process.env.APP_URL}/signup?invite=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SafeTalk Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5;">SafeTalk</h1>
        </div>

        <h2>You're invited to co-parent with ${inviterEmail}</h2>

        <p>Your co-parent has started creating a SafeTalk plan and wants to include you in building something positive for your children together.</p>

        <div style="background: #F3F4F6; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
          <p><strong>Here's what they appreciated about you:</strong></p>
          <em>"${approvedTextPreview}"</em>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}"
             style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Join SafeTalk
          </a>
        </div>

        <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p><strong>Connection Code:</strong> ${connectionCode}</p>
          <small>You can also use this code to connect manually if needed.</small>
        </div>

        <hr style="margin: 30px 0; border: none; height: 1px; background: #E5E7EB;">

        <p style="font-size: 14px; color: #6B7280;">
          SafeTalk helps co-parents build positive communication by sharing appreciations.
          <br>
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </body>
    </html>
  `

  const text = `
SafeTalk Invitation

You're invited to co-parent with ${inviterEmail}

Your co-parent has started creating a SafeTalk plan and wants to include you in building something positive for your children together.

Here's what they appreciated about you:
"${approvedTextPreview}"

Join SafeTalk: ${inviteUrl}

Connection Code: ${connectionCode}
You can also use this code to connect manually if needed.

SafeTalk helps co-parents build positive communication by sharing appreciations.
If you didn't expect this invitation, you can safely ignore this email.
  `

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: inviteeEmail,
      subject: `SafeTalk invitation from ${inviterEmail}`,
      html,
      text
    })
  } catch (error) {
    console.error('Failed to send invite email:', error)
    throw new Error('Failed to send invitation email')
  }
}

export async function sendTurnEmail(data: TurnNotificationData): Promise<void> {
  const { recipientEmail, roundNumber, appreciationMessage } = data

  const dashboardUrl = `${process.env.APP_URL}/dashboard`

  // Create the appreciation section if message is provided
  const appreciationSection = appreciationMessage ? `
        <div style="background: #F3F4F6; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
          <p><strong>Here's what your co-parent appreciated about you:</strong></p>
          <em>"${appreciationMessage}"</em>
        </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your Turn - SafeTalk</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5;">SafeTalk</h1>
        </div>

        <h2>It's your turn! 🌟</h2>

        <p>Your co-parent has shared their appreciation for Round ${roundNumber}. Now it's your turn to share what you appreciate about them.</p>

        ${appreciationSection}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}"
             style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Continue SafeTalk
          </a>
        </div>

        <p>Building positive co-parenting relationships takes time, but every appreciation you share makes a difference.</p>

        <hr style="margin: 30px 0; border: none; height: 1px; background: #E5E7EB;">

        <p style="font-size: 14px; color: #6B7280;">
          You're receiving this because you're participating in SafeTalk co-parenting communication.
        </p>
      </body>
    </html>
  `

  // Create the text appreciation section if message is provided
  const appreciationTextSection = appreciationMessage ? `

Here's what your co-parent appreciated about you:
"${appreciationMessage}"
` : ''

  const text = `
SafeTalk - It's your turn!

Your co-parent has shared their appreciation for Round ${roundNumber}. Now it's your turn to share what you appreciate about them.
${appreciationTextSection}
Continue SafeTalk: ${dashboardUrl}

Building positive co-parenting relationships takes time, but every appreciation you share makes a difference.

You're receiving this because you're participating in SafeTalk co-parenting communication.
  `

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: recipientEmail,
      subject: `SafeTalk - Your turn for Round ${roundNumber}`,
      html,
      text
    })
  } catch (error) {
    console.error('Failed to send turn notification:', error)
    throw new Error('Failed to send turn notification')
  }
}