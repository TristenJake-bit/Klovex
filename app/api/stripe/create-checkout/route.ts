import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { propertyAddress, transactionData } = await req.json()

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: 29900,
        product_data: {
          name: 'Klovex Transaction Coordination',
          description: `AI-powered TC service for ${propertyAddress}`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      userId: session.user.id,
      transactionData: JSON.stringify(transactionData),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://klovex.app'}/dashboard/transactions?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://klovex.app'}/dashboard/transactions/new?payment=cancelled`,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
