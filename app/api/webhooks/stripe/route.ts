import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient2 } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const { userId, transactionData } = session.metadata

    if (userId && transactionData) {
      const supabase = await createServerClient2()
      const tx = JSON.parse(transactionData)

      const { data: newTx } = await (supabase as any).from('transactions').insert({
        ...tx,
        client_id: userId,
        status: tx.status || 'pending',
      }).select().single()

      if (newTx) {
        await (supabase as any).from('invoices').insert({
          transaction_id: newTx.id,
          client_id: userId,
          amount_cents: session.amount_total,
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent,
        })

        await (supabase as any).from('timeline_events').insert({
          transaction_id: newTx.id,
          author_id: userId,
          type: 'note',
          content: '💳 Payment received — transaction coordination activated',
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
