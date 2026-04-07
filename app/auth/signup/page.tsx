'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', company: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, company: form.company } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/welcome')
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl">Klovex<span className="text-brand-500">.</span></Link>
          <p className="text-gray-500 text-sm mt-2">Create your account</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            <div><label className="label">Full name</label><input type="text" className="input" placeholder="Jane Smith" value={form.fullName} onChange={set('fullName')} required /></div>
            <div><label className="label">Email</label><input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={set('email')} required /></div>
            <div><label className="label">Company <span className="text-gray-400 font-normal">(optional)</span></label><input type="text" className="input" placeholder="Keller Williams" value={form.company} onChange={set('company')} /></div>
            <div><label className="label">Password</label><input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required minLength={8} /></div>
            {error && <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
            <p className="text-xs text-gray-400 text-center mt-3">By creating an account you agree to our <Link href="/terms" className="text-brand-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-brand-500 hover:underline">Privacy Policy</Link>.</p>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link href="/auth/login" className="text-brand-500 font-medium hover:underline">Sign in</Link></p>
      </div>
    </div>
  )
}
