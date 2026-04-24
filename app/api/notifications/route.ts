import { NextRequest, NextResponse } from 'next/server'
import { createServerClient2 } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

// GET — fetch user's notifications
export async function GET() {
  const authClient = await createServerClient2()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: notifications } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const unreadCount = (notifications || []).filter((n: any) => !n.read).length

  return NextResponse.json({ notifications: notifications || [], unreadCount })
}

// PATCH — mark notifications as read
export async function PATCH(req: NextRequest) {
  const authClient2 = await createServerClient2()
  const { data: { user } } = await authClient2.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { ids, all } = await req.json()

  if (all) {
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  } else if (ids && ids.length > 0) {
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .in('id', ids)
  }

  return NextResponse.json({ success: true })
}
