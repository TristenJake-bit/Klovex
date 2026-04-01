import { NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized — log in first' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', session.user.id)
    .single<any>()

  const email = profile?.email || session.user.email
  if (!email) return NextResponse.json({ error: 'No email found on profile' }, { status: 400 })

  try {
    const result = await resend.emails.send({
      from: 'Klovex <noreply@klovex.app>',
      to: email,
      subject: 'Klovex Test Email — It works!',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
          <div style="background:#1a7a52;padding:24px 32px">
            <h1 style="color:white;margin:0;font-size:20px;font-weight:600">Klovex</h1>
          </div>
          <div style="padding:32px">
            <h2 style="color:#111827;font-size:20px;margin:0 0 16px">Email is working!</h2>
            <p style="color:#374151;font-size:15px;line-height:1.6">Hi ${profile?.full_name || 'there'},</p>
            <p style="color:#374151;font-size:15px;line-height:1.6">This is a test email from Klovex confirming that your Resend integration is working correctly.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">Sent to: ${email}<br>Sent at: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true, sentTo: email, resendId: result.data?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
