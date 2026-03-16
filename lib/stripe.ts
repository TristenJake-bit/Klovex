import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export async function createPaymentIntent(
  amountCents: number,
  metadata: { invoiceId: string; clientId: string; transactionId: string }
) {
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

export async function createStripeCustomer(email: string, name: string) {
  return stripe.customers.create({ email, name })
}
