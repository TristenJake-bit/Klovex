export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'admin' | 'client'
          company: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          client_id: string
          property_address: string
          transaction_type: 'purchase' | 'sale' | 'refinance'
          status: 'pending' | 'contract' | 'inspection' | 'appraisal' | 'loan_approval' | 'clear_to_close' | 'closing' | 'closed' | 'cancelled'
          closing_date: string | null
          purchase_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      documents: {
        Row: {
          id: string
          transaction_id: string
          file_name: string
          file_url: string
          file_size: number | null
          file_type: string | null
          uploaded_by: string
          category: 'contract' | 'disclosure' | 'inspection' | 'appraisal' | 'title' | 'loan' | 'closing' | 'general'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          transaction_id: string
          client_id: string
          amount_cents: number
          status: 'unpaid' | 'paid' | 'cancelled'
          stripe_payment_intent: string | null
          stripe_invoice_url: string | null
          due_date: string | null
          paid_at: string | null
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      timeline_events: {
        Row: {
          id: string
          transaction_id: string
          author_id: string
          type: 'note' | 'status_change' | 'document' | 'email'
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['timeline_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['timeline_events']['Insert']>
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type TimelineEvent = Database['public']['Tables']['timeline_events']['Row']

export type TransactionWithClient = Transaction & {
  profiles: Profile
}

export type TransactionWithAll = Transaction & {
  profiles: Profile
  documents: Document[]
  invoices: Invoice[]
  timeline_events: TimelineEvent[]
}
