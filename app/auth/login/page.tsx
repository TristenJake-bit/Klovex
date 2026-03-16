'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-2xl">Klovex<span className="text-brand-500">.</span></Link>
          <p className="text-gray-500 text-sm mt-2">Sign in to your account</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="label">Email</label><input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><label className="label">Password</label><input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            {error && <div className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">Don't have an account? <Link href="/auth/signup" className="text-brand-500 font-medium hover:underline">Get started</Link></p>
      </div>
    </div>
  )
}
