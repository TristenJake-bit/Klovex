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

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayOpacity: 0.6,
        smoothScroll: true,
        allowClose: true,
        onDestroyStarted: () => {
          localStorage.setItem(key, '1')
          driverObj.destroy()
        },
        steps: [
          {
            element: '[data-tour="dashboard"]',
            popover: {
              title: 'Your Command Center',
              description: 'See overdue tasks, upcoming deadlines, and closings at a glance. This is where your day starts.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="transactions"]',
            popover: {
              title: 'Transactions',
              description: 'Every deal lives here. Click to see all your active transactions, documents, and compliance checklists.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="documents"]',
            popover: {
              title: 'Documents',
              description: 'All documents across all transactions in one place. Upload a contract and AI extracts key dates and risks instantly.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="billing"]',
            popover: {
              title: 'Billing',
              description: 'Track all invoices and payment history. Each transaction is a one-time $299 coordination fee.',
              side: 'right',
              align: 'start',
            }
          },
          {
            element: '[data-tour="new-transaction"]',
            popover: {
              title: 'Start Your First Deal',
              description: 'Click New Transaction to create your first deal. Fill in the property details, pay the fee, and Klovex handles everything automatically.',
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
