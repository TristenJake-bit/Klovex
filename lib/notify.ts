import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createNotification({
  userId,
  transactionId,
  type,
  title,
  body,
}: {
  userId: string
  transactionId?: string
  type: string
  title: string
  body?: string
}) {
  await (supabase as any).from('notifications').insert({
    user_id: userId,
    transaction_id: transactionId || null,
    type,
    title,
    body: body || null,
  })
}
