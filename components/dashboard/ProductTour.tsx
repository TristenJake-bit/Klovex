'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProductTour() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const key = `klovex_tour_done_${user.id}`
      if (localStorage.getItem(key)) return

      const { driver } = await import('driver.js')
      await import('driver.js/dist/driver.css')

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayOpacity: 0.6,
        smoothScroll: true,
        allowClose: true,
        doneBtnText: 'Get started!',
        closeBtnText: 'Skip',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        onDestroyStarted: () => {
          localStorage.setItem(key, '1')
          driverObj.destroy()
        },
        steps: [
          {
            element: '[data-tour="dashboard"]',
            popover: {
              title: '👋 Welcome to Klovex',
              description: 'This is your command center. See overdue tasks, upcoming deadlines, and closings at a glance.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="transactions"]',
            popover: {
              title: '📋 Transactions',
              description: 'Every deal lives here. Click to see all your active transactions, documents, and checklists.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="documents"]',
            popover: {
              title: '📄 Documents',
              description: 'All documents across all transactions in one place. Upload a contract and AI extracts key dates and risks instantly.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="billing"]',
            popover: {
              title: '💳 Billing',
              description: 'Track all invoices and payment history. Each transaction coordination is a one-time $299 fee.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="new-transaction"]',
            popover: {
              title: '🚀 Start your first deal',
              description: 'Click "New transaction" to create your first deal. Fill in the property details, pay the coordination fee, and Klovex handles the rest automatically.',
              side: 'bottom',
              align: 'start',
            }
          },
        ]
      })

      driverObj.drive()
    })
  }, [])

  return null
}
