import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createPaymentIntent } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient2()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { amountCents, transactionId, clientId } = await req.json()

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const paymentIntent = await createPaymentIntent(amountCents, {
    invoiceId: '',
    clientId,
    transactionId,
  })

  return NextResponse.json({ paymentIntentId: paymentIntent.id })
}
