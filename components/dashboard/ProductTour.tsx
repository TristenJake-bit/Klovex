'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'

const TOUR_KEY = 'klovex_tour_v2'

export default function ProductTour() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const tourData = localStorage.getItem(TOUR_KEY)
      const tour = tourData ? JSON.parse(tourData) : null
      if (tour?.done) return

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as any
      const isAdmin = profile?.role === 'admin'

      const PAGE_ORDER = isAdmin
        ? ['/dashboard', '/dashboard/transactions', '/dashboard/documents', '/dashboard/billing', '/dashboard/clients']
        : ['/dashboard', '/dashboard/transactions', '/dashboard/documents', '/dashboard/billing']

      const PAGE_STEPS: Record<string, any[]> = {
        '/dashboard': [
          {
            element: '[data-tour="dashboard"]',
            popover: {
              title: '🏠 Dashboard',
              description: 'This is your home base. Every morning you will see exactly what needs attention — overdue tasks, deadlines this week, and deals closing soon.',
              side: 'right', align: 'start',
            }
          },
          {
            element: '[data-tour="stats"]',
            popover: {
              title: '📊 At-a-glance stats',
              description: 'See your active deals, how many are closing within 14 days, overdue tasks, and your revenue this month — all in one row.',
              side: 'bottom', align: 'start',
            }
          },
          {
            element: '[data-tour="overdue"]',
            popover: {
              title: '🔴 Overdue tasks',
              description: 'Any checklist task that has passed its due date appears here in red. Click any task to go directly to that transaction and resolve it.',
              side: 'right', align: 'start',
            }
          },
          {
            element: '[data-tour="due-this-week"]',
            popover: {
              title: '📅 Due this week',
              description: 'Tasks due in the next 7 days across all your active transactions. Stay ahead of deadlines before they become overdue.',
              side: 'left', align: 'start',
            }
          },
          {
            element: '[data-tour="new-transaction"]',
            popover: {
              title: '➕ Start a new deal',
              description: 'Ready to add a transaction? Click here. Fill in the property details, pay the $299 coordination fee, and Klovex handles everything automatically.',
              side: 'bottom', align: 'start',
            }
          },
        ],
        '/dashboard/transactions': [
          {
            element: '[data-tour="transactions"]',
            popover: {
              title: '📋 Transactions',
              description: 'Every deal you are coordinating lives here. Each card shows the property address, closing date, and current status.',
              side: 'right', align: 'start',
            }
          },
          {
            element: '[data-tour="transaction-list"]',
            popover: {
              title: '🏡 Your active deals',
              description: 'Click any transaction to open it. Inside you will find the full checklist, uploaded documents, AI analysis, and a complete timeline of everything that has happened.',
              side: 'top', align: 'start',
            }
          },
        ],
        '/dashboard/documents': [
          {
            element: '[data-tour="documents"]',
            popover: {
              title: '📄 Documents',
              description: 'Every document you have uploaded across all your transactions appears here. No hunting through individual deals.',
              side: 'right', align: 'start',
            }
          },
          {
            element: '[data-tour="document-list"]',
            popover: {
              title: '🤖 AI-analyzed documents',
              description: 'Each document has been read by AI. It extracted the parties, key dates, purchase price, contingencies, and risks automatically the moment it was uploaded.',
              side: 'top', align: 'start',
            }
          },
        ],
        '/dashboard/billing': [
          {
            element: '[data-tour="billing"]',
            popover: {
              title: '💳 Billing',
              description: 'Every payment is tracked here. Each transaction generates a $299 invoice that is marked paid automatically when checkout completes.',
              side: 'right', align: 'start',
            }
          },
          {
            element: '[data-tour="billing-stats"]',
            popover: {
              title: '💰 Revenue tracking',
              description: 'See your total invoiced, collected, and outstanding at a glance. Great for end-of-month reporting.',
              side: 'bottom', align: 'start',
            }
          },
        ],
        '/dashboard/clients': [
          {
            element: '[data-tour="clients"]',
            popover: {
              title: '👥 Clients — Admin only',
              description: 'Only you as the admin can see this page. Every agent or buyer who signs up to Klovex appears here with their transaction count. Use this to monitor your customers and jump to any of their deals.',
              side: 'right', align: 'start',
            }
          },
        ],
      }

      const steps = PAGE_STEPS[pathname]
      if (!steps) return

      const expectedPage = tour?.nextPage || '/dashboard'
      if (pathname !== expectedPage) return

      await new Promise(r => setTimeout(r, 600))

      const { driver } = await import('driver.js')

      const currentPageIndex = PAGE_ORDER.indexOf(pathname)
      const nextPage = PAGE_ORDER[currentPageIndex + 1] || null

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayOpacity: 0.55,
        smoothScroll: true,
        allowClose: true,
        onDestroyStarted: () => {
          if (nextPage) {
            localStorage.setItem(TOUR_KEY, JSON.stringify({ nextPage, done: false }))
            driverObj.destroy()
            router.push(nextPage)
          } else {
            localStorage.setItem(TOUR_KEY, JSON.stringify({ done: true }))
            driverObj.destroy()
          }
        },
        steps,
      })

      driverObj.drive()
    })
  }, [pathname])

  return null
}
