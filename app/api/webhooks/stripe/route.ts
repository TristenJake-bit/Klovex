import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const { userId, transactionData } = session.metadata

    console.log('Webhook received:', { userId, transactionData: !!transactionData })

    if (userId && transactionData) {
      // Use service role to bypass RLS
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const tx = JSON.parse(transactionData)
      console.log('Creating transaction:', tx)

      const { data: newTx, error: txError } = await supabase.from('transactions').insert({
        ...tx,
        client_id: userId,
        status: tx.status || 'pending',
      }).select().single()

      if (txError) {
        console.error('Transaction insert error:', txError)
        return NextResponse.json({ error: txError.message }, { status: 500 })
      }

      console.log('Transaction created:', newTx.id)

      await supabase.from('invoices').insert({
        transaction_id: newTx.id,
        client_id: userId,
        amount_cents: session.amount_total,
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent,
      })

      await supabase.from('timeline_events').insert({
        transaction_id: newTx.id,
        author_id: userId,
        type: 'note',
        content: '💳 Payment received — transaction coordination activated',
      })

      // Send welcome email
      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
      if (profile?.email) {
        sendWelcomeEmail({
          agentEmail: profile.email,
          agentName: (profile as any).full_name || 'there',
          transaction: newTx,
        }).catch(err => console.error('Welcome email failed:', err))
      }
    }
  }

  return NextResponse.json({ received: true })
}
