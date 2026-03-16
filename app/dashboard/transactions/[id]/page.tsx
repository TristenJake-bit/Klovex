'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Home, FileText, Clock, Brain, AlertTriangle, CheckCircle, Calendar, User, DollarSign, TrendingUp, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
const STATUS_COLORS: Record<string,string> = { pending:'bg-yellow-100 text-yellow-700', contract:'bg-blue-100 text-blue-700', inspection:'bg-purple-100 text-purple-700', closed:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' }
const PRIORITY_COLORS: Record<string,string> = { high:'bg-red-100 text-red-700 border-red-200', medium:'bg-yellow-100 text-yellow-700 border-yellow-200', low:'bg-green-100 text-green-700 border-green-200' }
export default function TransactionDetailPage() {
  const params = useParams(); const id = params.id as string
  const [tx, setTx] = useState<any>(null); const [loading, setLoading] = useState(true)
  const [note, setNote] = useState(''); const [savingNote, setSavingNote] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([]); const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false); const [analyses, setAnalyses] = useState<Record<string,any>>({})
  const [analyzingDoc, setAnalyzingDoc] = useState<string|null>(null); const [expandedAnalysis, setExpandedAnalysis] = useState<string|null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.from('transactions').select('*').eq('id', id).single().then(({ data }) => { setTx(data); setLoading(false) })
    supabase.from('documents').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => {
      setDocuments(data || []); if (data) data.forEach((doc: any) => loadAnalysis(doc.id))
    })
    supabase.from('timeline_events').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => { setTimeline(data || []) })
  }, [id])
  async function loadAnalysis(docId: string) {
    const supabase = createClient()
    const { data } = await (supabase as any).from('document_analyses').select('*').eq('document_id', docId).single()
    if (data) setAnalyses(prev => ({ ...prev, [docId]: data.analysis }))
  }
  async function handleStatusChange(status: string) {
    const supabase = createClient()
    await (supabase as any).from('transactions').update({ status }).eq('id', id)
    setTx((t: any) => ({ ...t, status }))
  }
  async function addNote(e: React.FormEvent) {
    e.preventDefault(); if (!note.trim()) return; setSavingNote(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await (supabase as any).from('timeline_events').insert({ transaction_id: id, author_id: user?.id, type: 'note', content: note }).select().single()
    if (data) setTimeline((t) => [data, ...t]); setNote(''); setSavingNote(false)
  }
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const filePath = `${id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)
      const { data: docData } = await (supabase as any).from('documents').insert({ transaction_id: id, name: file.name, url: publicUrl, uploaded_by: user?.id, file_type: file.type, file_size: file.size }).select().single()
      if (docData) { setDocuments((prev) => [docData, ...prev]); analyzeDocument(docData.id, publicUrl, file.name) }
    }
    setUploading(false); e.target.value = ''
  }
  async function analyzeDocument(docId: string, docUrl: string, docName: string) {
    setAnalyzingDoc(docId); setExpandedAnalysis(docId)
    try {
      const response = await fetch('/api/analyze-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: docId, documentUrl: docUrl, documentName: docName }) })
      const data = await response.json()
      if (data.analysis) setAnalyses(prev => ({ ...prev, [docId]: data.analysis }))
    } catch (err) { console.error('Analysis failed:', err) }
    setAnalyzingDoc(null)
  }
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const fmtMoney = (n: number) => n ? `$${n.toLocaleString()}` : '—'
  const fmtSize = (b: number) => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`
  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!tx) return <div className="p-8 text-gray-400">Transaction not found</div>
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-brand-500" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{tx.property_address}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[tx.status] || 'bg-gray-100 text-gray-600'}`}>{tx.status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{tx.transaction_type} · Created {fmt(tx.created_at)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Purchase Price</p><p className="text-2xl font-semibold text-gray-900">{fmtMoney(tx.purchase_price)}</p></div>
        <div className="card p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Close Date</p><p className="text-2xl font-semibold text-gray-900">{fmt(tx.closing_date)}</p></div>
        <div className="card p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Status</p>
          <select className="text-sm font-medium bg-transparent border-0 p-0 text-gray-900 cursor-pointer focus:outline-none w-full" value={tx.status} onChange={e => handleStatusChange(e.target.value)}>
            <option value="pending">Pending</option><option value="contract">Contract</option><option value="inspection">Inspection</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-brand-500" /> Property Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-gray-900 font-medium">{tx.property_address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900 font-medium capitalize">{tx.transaction_type}</span></div>
            ENDOFFILE

