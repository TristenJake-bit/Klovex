'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Home, FileText, Clock, Brain, AlertTriangle, CheckCircle, Calendar, User, DollarSign, TrendingUp, ChevronDown, ChevronUp, Loader2, X, Bell, Users, Phone, Mail, Building2, Plus, Trash2, Pencil, ArrowRight, GitCompare, Share2, Copy, Check, ExternalLink } from 'lucide-react'
const STATUS_COLORS: Record<string,string> = { pending:'bg-yellow-100 text-yellow-700', contract:'bg-blue-100 text-blue-700', inspection:'bg-purple-100 text-purple-700', loan:'bg-indigo-100 text-indigo-700', closing:'bg-teal-100 text-teal-700', closed:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' }
const PRIORITY_COLORS: Record<string,string> = { high:'bg-red-100 text-red-700 border-red-200', medium:'bg-yellow-100 text-yellow-700 border-yellow-200', low:'bg-green-100 text-green-700 border-green-200' }
const CONTACT_ROLES = ['Buyer', 'Seller', "Buyer's Agent", "Seller's Agent", 'Lender', 'Escrow Officer', 'Title Officer', 'Inspector', 'Appraiser', 'HOA']
export default function TransactionDetailPage() {
  const params = useParams(); const id = params.id as string
  const [tx, setTx] = useState<any>(null); const [loading, setLoading] = useState(true)
  const [note, setNote] = useState(''); const [savingNote, setSavingNote] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([]); const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false); const [analyses, setAnalyses] = useState<Record<string,any>>({})
  const [analyzingDoc, setAnalyzingDoc] = useState<string|null>(null); const [expandedAnalysis, setExpandedAnalysis] = useState<string|null>(null)
  const [checklist, setChecklist] = useState<any[]>([])
  const [checklistFilter, setChecklistFilter] = useState('all')
  const [generatingChecklist, setGeneratingChecklist] = useState(false)
  const [findingsAlert, setFindingsAlert] = useState<{ risks: any[]; criticalDates: any[]; actionItems: any[]; completenessIssues: any[]; summary: string; documentType: string; docName: string } | null>(null)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState<any>(null)
  const [contactForm, setContactForm] = useState({ role: 'Buyer', name: '', email: '', phone: '', company: '' })
  const [comparing, setComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'checklist' | 'timeline'>('overview')
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalCopied, setPortalCopied] = useState(false)
  function switchTab(tab: typeof activeTab) {
    setActiveTab(tab)
    window.dispatchEvent(new CustomEvent('help-tab-change', { detail: tab }))
  }
  useEffect(() => {
    const supabase = createClient()
    supabase.from('transactions').select('*').eq('id', id).single().then(({ data }) => { setTx(data); setLoading(false) })
    supabase.from('documents').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => {
      setDocuments(data || []); if (data) (data as any[]).forEach((doc: any) => loadAnalysis(doc.id, doc.name))
    })
    supabase.from('timeline_events').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => { setTimeline(data || []) })
    ;(supabase as any).from('transaction_checklists').select('*').eq('transaction_id', id).order('due_date', { ascending: true }).order('phase', { ascending: true }).then(({ data }: any) => { setChecklist(data || []) })
    ;(supabase as any).from('transaction_contacts').select('*').eq('transaction_id', id).order('created_at', { ascending: true }).then(({ data }: any) => { setContacts(data || []) })
  }, [id])
  async function loadAnalysis(docId: string, docName?: string) {
    const supabase = createClient()
    const { data } = await (supabase as any).from('document_analyses').select('*').eq('document_id', docId).single()
    if (data) {
      setAnalyses(prev => ({ ...prev, [docId]: data.analysis }))
      // Show alert for most recent analysis with findings
      const a = data.analysis
      if (a && ((a.risks && a.risks.length > 0) || (a.criticalDates && a.criticalDates.length > 0) || (a.actionItems && a.actionItems.length > 0) || (a.completenessIssues && a.completenessIssues.length > 0))) {
        setFindingsAlert(prev => prev || {
          risks: a.risks || [],
          criticalDates: a.criticalDates || [],
          actionItems: a.actionItems || [],
          completenessIssues: a.completenessIssues || [],
          summary: a.summary || '',
          documentType: a.documentType || 'Document',
          docName: docName || 'Document',
        })
      }
    }
  }
  async function handleStatusChange(status: string) {
    const supabase = createClient()
    await (supabase as any).from('transactions').update({ status }).eq('id', id)
    setTx((t: any) => ({ ...t, status }))
    // Auto-send closing confirmation email
    if (status === 'closing') {
      fetch('/api/send-template-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: 'closing_confirmation', transactionId: id }) }).catch(() => {})
    }
  }
  async function addNote(e: React.FormEvent) {
    e.preventDefault(); if (!note.trim()) return; setSavingNote(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await (supabase as any).from('timeline_events').insert({ transaction_id: id, author_id: user?.id, type: 'note', content: note }).select().single()
    if (data) setTimeline((t) => [data, ...t]); setNote(''); setSavingNote(false)
  }
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('transactionId', id)
        const res = await fetch('/api/upload-document', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.document) {
          setDocuments((prev) => [data.document, ...prev])
          analyzeDocument(data.document.id, data.document.url, file.name, id)
        } else {
          console.error('Upload error for', file.name, data.error)
        }
      } catch (err) {
        console.error('Failed to upload', file.name, err)
      }
      await new Promise(r => setTimeout(r, 300))
    }
    setUploading(false)
    e.target.value = ''
  }


  async function analyzeDocument(docId: string, docUrl: string, docName: string, txId?: string) {
    setAnalyzingDoc(docId); setExpandedAnalysis(docId)
    try {
      const response = await fetch('/api/analyze-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: docId, documentUrl: docUrl, documentName: docName, transactionId: txId || id }) })
      const data = await response.json()
      if (data.analysis) {
        setAnalyses(prev => ({ ...prev, [docId]: data.analysis }))
        // Show findings alert banner
        const a = data.analysis
        const hasFindings = (a.risks && a.risks.length > 0) || (a.criticalDates && a.criticalDates.length > 0) || (a.actionItems && a.actionItems.length > 0) || (a.completenessIssues && a.completenessIssues.length > 0)
        if (hasFindings) {
          setFindingsAlert({
            risks: a.risks || [],
            criticalDates: a.criticalDates || [],
            actionItems: a.actionItems || [],
            completenessIssues: a.completenessIssues || [],
            summary: a.summary || '',
            documentType: a.documentType || 'Document',
            docName: docName,
          })
          setAlertDismissed(false)
        }
        // Refresh transaction data in case AI auto-updated fields (no page reload needed)
        const supabase = createClient()
        const { data: txData } = await supabase.from('transactions').select('*').eq('id', id).single()
        if (txData) setTx(txData)
        // Refresh timeline to show AI update log entries
        const { data: tlData } = await supabase.from('timeline_events').select('*').eq('transaction_id', id).order('created_at', { ascending: false })
        if (tlData) setTimeline(tlData)
      }
    } catch (err) { console.error('Analysis failed:', err) }
    setAnalyzingDoc(null)
  }
  async function generateChecklist() {
    if (!tx) return
    setGeneratingChecklist(true)
    try {
      const res = await fetch('/api/generate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: id,
          acceptanceDate: tx.created_at,
          closingDate: tx.closing_date,
          propertyAddress: tx.property_address,
          transactionType: tx.transaction_type,
          state: tx.state || 'CA',
          hasHOA: false,
          yearBuilt: null,
          isSeptic: false,
        })
      })
      if (!res.ok) {
        const errText = await res.text()
        console.error('generate-checklist API error:', res.status, errText)
      } else {
        const supabase = createClient()
        const { data, error } = await (supabase as any).from('transaction_checklists').select('*').eq('transaction_id', id).order('due_date', { ascending: true }).order('phase', { ascending: true })
        if (error) console.error('Checklist fetch error:', error)
        setChecklist(data || [])
      }
    } catch(e) { console.error('generateChecklist failed:', e) }
    setGeneratingChecklist(false)
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.name.trim()) return
    const supabase = createClient()
    if (editingContact) {
      const { data } = await (supabase as any).from('transaction_contacts').update({ role: contactForm.role, name: contactForm.name, email: contactForm.email || null, phone: contactForm.phone || null, company: contactForm.company || null }).eq('id', editingContact.id).select().single()
      if (data) setContacts(prev => prev.map(c => c.id === editingContact.id ? data : c))
    } else {
      const { data } = await (supabase as any).from('transaction_contacts').insert({ transaction_id: id, role: contactForm.role, name: contactForm.name, email: contactForm.email || null, phone: contactForm.phone || null, company: contactForm.company || null }).select().single()
      if (data) setContacts(prev => [...prev, data])
    }
    setContactForm({ role: 'Buyer', name: '', email: '', phone: '', company: '' })
    setShowContactForm(false)
    setEditingContact(null)
  }

  function startEditContact(contact: any) {
    setContactForm({ role: contact.role, name: contact.name, email: contact.email || '', phone: contact.phone || '', company: contact.company || '' })
    setEditingContact(contact)
    setShowContactForm(true)
  }

  async function deleteContact(contactId: string) {
    const supabase = createClient()
    await (supabase as any).from('transaction_contacts').delete().eq('id', contactId)
    setContacts(prev => prev.filter(c => c.id !== contactId))
  }

  // Load existing portal token
  useEffect(() => {
    const supabase = createClient()
    ;(supabase as any).from('transaction_tokens').select('token').eq('transaction_id', id).gt('expires_at', new Date().toISOString()).limit(1).then(({ data }: any) => {
      if (data && data.length > 0) setPortalToken(data[0].token)
    })
  }, [id])

  async function generatePortalLink() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: id }) })
      const data = await res.json()
      if (data.token) setPortalToken(data.token)
    } catch (err) { console.error('Failed to generate portal:', err) }
    setPortalLoading(false)
  }

  async function revokePortalLink() {
    await fetch('/api/portal', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: id }) })
    setPortalToken(null)
  }

  function copyPortalLink() {
    const url = `${window.location.origin}/portal/${portalToken}`
    navigator.clipboard.writeText(url)
    setPortalCopied(true)
    setTimeout(() => setPortalCopied(false), 2000)
  }

  async function deleteDocument(docId: string) {
    if (!confirm('Delete this document and its analysis? This cannot be undone.')) return
    try {
      await fetch('/api/delete-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: docId }) })
      setDocuments(prev => prev.filter(d => d.id !== docId))
      setAnalyses(prev => { const next = { ...prev }; delete next[docId]; return next })
      if (expandedAnalysis === docId) setExpandedAnalysis(null)
    } catch (err) { console.error('Failed to delete document:', err) }
  }

  async function replaceDocument(docId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Delete old document
    await fetch('/api/delete-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: docId }) })
    setDocuments(prev => prev.filter(d => d.id !== docId))
    setAnalyses(prev => { const next = { ...prev }; delete next[docId]; return next })
    // Upload new document
    const formData = new FormData()
    formData.append('file', file)
    formData.append('transactionId', id)
    const res = await fetch('/api/upload-document', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.document) {
      setDocuments(prev => [data.document, ...prev])
      analyzeDocument(data.document.id, data.document.url, file.name, id)
    }
    e.target.value = ''
  }

  async function compareDocuments() {
    setComparing(true)
    setComparisonResult(null)
    try {
      const res = await fetch('/api/compare-documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: id }) })
      const data = await res.json()
      if (data.comparison) setComparisonResult(data.comparison)
      else setComparisonResult({ error: data.error || 'Comparison failed' })
    } catch (err) { setComparisonResult({ error: 'Comparison request failed' }) }
    setComparing(false)
  }

  async function toggleTask(taskId: string, completed: boolean) {
    const supabase = createClient()
    await (supabase as any).from('transaction_checklists').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', taskId)
    setChecklist(prev => prev.map(t => t.id === taskId ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t))
  }

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const fmtMoney = (n: number) => n ? `$${n.toLocaleString()}` : '—'
  const fmtSize = (b: number) => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`
  const completedCount = checklist.filter(t => t.completed).length
  const totalCount = checklist.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!tx) return <div className="p-8 text-gray-400">Transaction not found</div>

  const TABS = [
    { id: 'overview' as const, label: 'Overview', icon: Home },
    { id: 'documents' as const, label: 'Documents', icon: FileText, badge: documents.length || undefined },
    { id: 'checklist' as const, label: 'Checklist', icon: CheckCircle, badge: totalCount > 0 ? `${completedCount}/${totalCount}` : undefined },
    { id: 'timeline' as const, label: 'Timeline', icon: Clock, badge: timeline.length || undefined },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-brand-500" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-semibold text-gray-900 leading-tight">{tx.property_address}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[tx.status] || 'bg-gray-100 text-gray-600'}`}>{tx.status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{tx.transaction_type} · Created {fmt(tx.created_at)}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* AI Findings Alert Banner — shows on all tabs */}
      {findingsAlert && !alertDismissed && (
        <div className="mb-4 md:mb-6 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-orange-100/60 border-b border-orange-200">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">AI Findings — {findingsAlert.documentType}</span>
              <span className="text-xs text-orange-600 bg-orange-200/60 px-2 py-0.5 rounded-full">{findingsAlert.docName}</span>
            </div>
            <button onClick={() => setAlertDismissed(true)} className="p-1 hover:bg-orange-200 rounded-lg transition-colors">
              <X className="w-4 h-4 text-orange-500" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {findingsAlert.summary && <p className="text-sm text-gray-700 leading-relaxed">{findingsAlert.summary}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {findingsAlert.risks.filter(r => r.severity === 'high' || r.severity === 'medium').length > 0 && (
                <div className="bg-white/70 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs font-semibold text-red-700 uppercase">Risks</span></div>
                  <div className="space-y-1.5">{findingsAlert.risks.filter(r => r.severity === 'high' || r.severity === 'medium').map((r, i) => (<div key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="flex-shrink-0 mt-0.5">{r.severity === 'high' ? '🔴' : '🟡'}</span><span>{r.issue}</span></div>))}</div>
                </div>
              )}
              {findingsAlert.criticalDates.length > 0 && (
                <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 mb-2"><Calendar className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs font-semibold text-purple-700 uppercase">Critical Dates</span></div>
                  <div className="space-y-1.5">{findingsAlert.criticalDates.map((d, i) => (<div key={i} className="text-xs text-gray-700 flex items-center justify-between"><span>{d.label}</span><span className={`font-medium ${d.daysUntil != null && d.daysUntil <= 7 ? 'text-red-600' : d.daysUntil != null && d.daysUntil <= 14 ? 'text-yellow-600' : 'text-gray-500'}`}>{d.date}{d.daysUntil != null ? ` (${d.daysUntil <= 0 ? 'Today' : d.daysUntil + 'd'})` : ''}</span></div>))}</div>
                </div>
              )}
              {findingsAlert.actionItems.filter(a => a.priority === 'high').length > 0 && (
                <div className="bg-white/70 rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-1.5 mb-2"><TrendingUp className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-semibold text-amber-700 uppercase">Action Items</span></div>
                  <div className="space-y-1.5">{findingsAlert.actionItems.filter(a => a.priority === 'high').map((a, i) => (<div key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="flex-shrink-0 text-red-500 font-bold mt-0.5">!</span><span>{a.task}</span></div>))}</div>
                </div>
              )}
              {findingsAlert.completenessIssues && findingsAlert.completenessIssues.length > 0 && (
                <div className="bg-white/70 rounded-lg p-3 border border-rose-100">
                  <div className="flex items-center gap-1.5 mb-2"><FileText className="w-3.5 h-3.5 text-rose-500" /><span className="text-xs font-semibold text-rose-700 uppercase">Document Issues</span></div>
                  <div className="space-y-1.5">{findingsAlert.completenessIssues.map((issue: any, i: number) => (<div key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="flex-shrink-0 mt-0.5">{issue.severity === 'high' ? '🔴' : '🟡'}</span><span>{issue.description}</span></div>))}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && <>
      {/* Status Auto-Progression Banner */}
      {checklist.length > 0 && tx && (() => {
        const phaseComplete = (phase: string) => {
          const tasks = checklist.filter(t => t.phase === phase)
          return tasks.length > 0 && tasks.every(t => t.completed)
        }
        const taskComplete = (taskName: string) => checklist.some(t => t.task.toLowerCase().includes(taskName.toLowerCase()) && t.completed)

        let suggestion: { message: string; nextStatus: string; nextLabel: string } | null = null

        if (tx.status === 'pending' && phaseComplete('Contract Received')) {
          suggestion = { message: 'All Contract Received tasks are complete.', nextStatus: 'contract', nextLabel: 'Contract' }
        } else if (tx.status === 'contract' && phaseComplete('Disclosures')) {
          suggestion = { message: 'All Disclosures tasks are complete.', nextStatus: 'inspection', nextLabel: 'Inspection' }
        } else if (tx.status === 'inspection' && (taskComplete('inspection contingency removal') || phaseComplete('Inspections'))) {
          suggestion = { message: 'Inspection phase is complete.', nextStatus: 'loan', nextLabel: 'Loan & Appraisal' }
        } else if ((tx.status === 'loan' || tx.status === 'inspection') && (taskComplete('clear to close') || taskComplete('final loan approval'))) {
          suggestion = { message: 'Clear to close received.', nextStatus: 'closing', nextLabel: 'Closing' }
        } else if (tx.status === 'closing' && phaseComplete('Closing')) {
          suggestion = { message: 'All closing tasks are complete.', nextStatus: 'closed', nextLabel: 'Closed' }
        }

        if (!suggestion) return null
        return (
          <div className="mb-4 md:mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">{suggestion.message}</p>
                <p className="text-xs text-green-700 mt-0.5">Ready to advance to <strong>{suggestion.nextLabel}</strong> phase?</p>
              </div>
            </div>
            <button
              onClick={() => handleStatusChange(suggestion!.nextStatus)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
            >
              Advance to {suggestion.nextLabel} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )
      })()}

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="card p-3 md:p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Purchase Price</p><p className="text-lg md:text-2xl font-semibold text-gray-900">{fmtMoney(tx.purchase_price)}</p></div>
        <div className="card p-3 md:p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Close Date</p><p className="text-lg md:text-2xl font-semibold text-gray-900">{fmt(tx.closing_date)}</p></div>
        <div className="card p-3 md:p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Status</p>
          <select className="text-sm font-medium bg-transparent border-0 p-0 text-gray-900 cursor-pointer focus:outline-none w-full" value={tx.status} onChange={e => handleStatusChange(e.target.value)}>
            <option value="pending">Pending</option><option value="contract">Contract</option><option value="inspection">Inspection</option><option value="loan">Loan & Appraisal</option><option value="closing">Closing</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {/* Deadline Dashboard */}
      {checklist.length > 0 && (() => {
        const totalTasks = checklist.length
        const completedTasks = checklist.filter(t => t.completed).length
        const pct = Math.round((completedTasks / totalTasks) * 100)
        const incompleteTasks = checklist.filter(t => !t.completed && t.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        const today = new Date(); today.setHours(0, 0, 0, 0)
        function getDaysUntil(dateStr: string) {
          const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
          return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }
        function getUrgency(days: number) {
          if (days <= 0) return { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', label: days === 0 ? 'Due today' : `${Math.abs(days)}d overdue` }
          if (days <= 3) return { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: `${days}d left` }
          if (days <= 7) return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', label: `${days}d left` }
          return { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', label: `${days}d left` }
        }
        return (
          <div className="card p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-500" /> Deadline Dashboard
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Upcoming deadlines at a glance</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500">{completedTasks}/{totalTasks} tasks</span>
              </div>
            </div>
            {incompleteTasks.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 font-medium">All dated tasks are complete!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {incompleteTasks.slice(0, 10).map((task: any) => {
                  const days = getDaysUntil(task.due_date)
                  const urgency = getUrgency(days)
                  return (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border ${urgency.color} transition-colors`}>
                      <input type="checkbox" checked={false} onChange={() => toggleTask(task.id, true)}
                        className="w-4 h-4 rounded accent-brand-500 flex-shrink-0 cursor-pointer" />
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgency.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.task}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs opacity-75">{task.phase}</span>
                          {task.responsible && <span className="text-xs opacity-75">· {task.responsible}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold">{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-xs font-medium opacity-75">{urgency.label}</p>
                      </div>
                    </div>
                  )
                })}
                {incompleteTasks.length > 10 && (
                  <p className="text-xs text-gray-400 text-center pt-2">+ {incompleteTasks.length - 10} more upcoming deadlines</p>
                )}
              </div>
            )}
          </div>
        )
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card p-4 md:p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-brand-500" /> Property Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="text-gray-900 font-medium">{tx.property_address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="text-gray-900 font-medium capitalize">{tx.transaction_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Purchase price</span><span className="text-gray-900 font-medium">{fmtMoney(tx.purchase_price)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Close date</span><span className="text-gray-900 font-medium">{fmt(tx.closing_date)}</span></div>
          </div>
        </div>
        <div className="card p-4 md:p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-500" /> Quick Stats</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Documents uploaded</span><span className="text-gray-900 font-medium">{documents.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Checklist progress</span><span className="text-gray-900 font-medium">{totalCount > 0 ? `${completedCount}/${totalCount} (${progressPct}%)` : 'Not generated'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Contacts added</span><span className="text-gray-900 font-medium">{contacts.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Timeline events</span><span className="text-gray-900 font-medium">{timeline.length}</span></div>
          </div>
          {documents.length === 0 && (
            <button onClick={() => switchTab('documents')} className="mt-4 w-full text-sm text-brand-600 bg-brand-50 hover:bg-brand-100 py-2.5 rounded-lg transition-colors font-medium">
              Upload your first document to get started
            </button>
          )}
        </div>
      </div>

      {/* Contacts / Parties */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-brand-500" /> Transaction Contacts</h2>
            <p className="text-xs text-gray-400 mt-0.5">All parties involved in this transaction</p>
          </div>
          <button onClick={() => { setEditingContact(null); setContactForm({ role: 'Buyer', name: '', email: '', phone: '', company: '' }); setShowContactForm(!showContactForm) }}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </div>

        {showContactForm && (
          <form onSubmit={saveContact} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <select className="input text-sm" value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))}>
                {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="input text-sm" placeholder="Full name *" required value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input text-sm" placeholder="Company" value={contactForm.company} onChange={e => setContactForm(f => ({ ...f, company: e.target.value }))} />
              <input className="input text-sm" type="email" placeholder="Email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
              <input className="input text-sm" type="tel" placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary px-4 py-2 text-sm">{editingContact ? 'Update' : 'Save'}</button>
              <button type="button" onClick={() => { setShowContactForm(false); setEditingContact(null) }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </form>
        )}

        {contacts.length === 0 && !showContactForm ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No contacts yet</p>
            <p className="text-xs text-gray-300 mt-1">Add buyers, sellers, agents, lenders, and other parties</p>
          </div>
        ) : contacts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-brand-200 transition-colors group">
                <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full flex-shrink-0">{c.role}</span>
                  </div>
                  {c.company && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" />{c.company}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    {c.email && <a href={`mailto:${c.email}`} className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</a>}
                    {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1 flex-shrink-0"><Phone className="w-3 h-3" />{c.phone}</a>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => startEditContact(c)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                  <button onClick={() => deleteContact(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Portal */}
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Share2 className="w-4 h-4 text-brand-500" /> Share Portal</h2>
            <p className="text-xs text-gray-400 mt-0.5">Share a read-only link with buyers, sellers, or other parties</p>
          </div>
        </div>
        {portalToken ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/portal/${portalToken}` : `/portal/${portalToken}`}
              </div>
              <button onClick={copyPortalLink} className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0">
                {portalCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
              </button>
              <a href={`/portal/${portalToken}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Link expires in 30 days. Parties can view status, deadlines, and progress — no login required.</p>
              <button onClick={revokePortalLink} className="text-xs text-red-500 hover:text-red-600 underline underline-offset-2 flex-shrink-0 ml-4">Revoke link</button>
            </div>
          </div>
        ) : (
          <button onClick={generatePortalLink} disabled={portalLoading} className="w-full py-4 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
            {portalLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Share2 className="w-4 h-4" /> Generate shareable portal link</>}
          </button>
        )}
      </div>

      </>}

      {/* ==================== DOCUMENTS TAB ==================== */}
      {activeTab === 'documents' && <>
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-500" /> Documents</h2><p className="text-xs text-gray-400 mt-0.5">Upload documents and AI will analyze them automatically</p></div>
          <div className="flex items-center gap-2">
            {Object.keys(analyses).length >= 2 && (
              <button onClick={compareDocuments} disabled={comparing} className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors font-medium">
                {comparing ? <><Loader2 className="w-3 h-3 animate-spin" /> Comparing...</> : <><GitCompare className="w-3.5 h-3.5" /> Compare Documents</>}
              </button>
            )}
            <label className="btn-primary px-4 py-2 text-sm cursor-pointer flex items-center gap-2">
              {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <>Upload Document</>}
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple disabled={uploading} />
            </label>
          </div>
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Brain className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No documents yet</p>
            <p className="text-xs text-gray-300 mt-1">Upload a document to get instant AI analysis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc: any) => {
              const analysis = analyses[doc.id]; const isAnalyzing = analyzingDoc === doc.id; const isExpanded = expandedAnalysis === doc.id
              return (
                <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-brand-600" /></div>
                      <div><p className="text-sm font-medium text-gray-900">{doc.name}</p><p className="text-xs text-gray-400">{doc.file_size ? fmtSize(doc.file_size) : ''} · {fmt(doc.created_at)}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAnalyzing && <div className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full"><Loader2 className="w-3 h-3 animate-spin" />Analyzing with AI...</div>}
                      {analysis && !isAnalyzing && <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle className="w-3 h-3" />Analysis Ready</div>}
                      {analysis && !isAnalyzing && analysis.completenessIssues && analysis.completenessIssues.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          {analysis.completenessIssues.filter((i: any) => i.severity === 'high').length > 0
                            ? `${analysis.completenessIssues.filter((i: any) => i.severity === 'high').length} Issue${analysis.completenessIssues.filter((i: any) => i.severity === 'high').length > 1 ? 's' : ''}`
                            : `${analysis.completenessIssues.length} Warning${analysis.completenessIssues.length > 1 ? 's' : ''}`}
                        </div>
                      )}
                      <button onClick={() => analyzeDocument(doc.id, doc.url, doc.name, id)} className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors" disabled={isAnalyzing}><Brain className="w-3 h-3" />{analysis ? 'Re-analyze' : 'Analyze'}</button>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-brand-600 px-3 py-1.5 border border-gray-200 rounded-full transition-colors">View</a>
                      <label className="text-xs text-orange-600 hover:text-orange-700 px-3 py-1.5 border border-orange-200 rounded-full transition-colors cursor-pointer bg-orange-50 hover:bg-orange-100 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 rotate-90" />Replace
                        <input type="file" className="hidden" onChange={(e) => replaceDocument(doc.id, e)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                      </label>
                      <button onClick={() => deleteDocument(doc.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" /></button>
                      {analysis && <button onClick={() => setExpandedAnalysis(isExpanded ? null : doc.id)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">{isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}</button>}
                    </div>
                  </div>
                  {isAnalyzing && <div className="p-8 text-center"><div className="inline-flex items-center gap-3 text-sm text-gray-500"><Brain className="w-5 h-5 text-brand-500 animate-pulse" /><span>Claude is reading and analyzing your document...</span></div><p className="text-xs text-gray-400 mt-2">Extracting parties, dates, contingencies, and risks</p></div>}
                  {analysis && isExpanded && (
                    <div className="p-5 space-y-5">
                      <div className="flex gap-4">
                        <div className="flex-1 bg-blue-50 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-blue-600" /><span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">AI Summary</span></div>
                          <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
                          {analysis.changes && analysis.changes.length > 0 && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-1.5 mb-2"><CheckCircle className="w-3.5 h-3.5 text-green-600" /><span className="text-xs font-semibold text-green-700">AUTO-UPDATED TRANSACTION</span></div>
                              {analysis.changes.map((c: any, i: number) => (
                                <div key={i} className="text-xs text-green-700 flex items-center gap-1.5 mt-1">
                                  <span className="font-medium">{c.label}:</span>
                                  <span className="line-through text-gray-400">{c.field === 'purchase_price' ? '$' + Number(c.from || 0).toLocaleString() : String(c.from || 'empty')}</span>
                                  <span>→</span>
                                  <span className="font-semibold">{c.field === 'purchase_price' ? '$' + Number(c.to).toLocaleString() : String(c.to)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2"><span className="text-xs text-gray-500">Document type:</span><span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{analysis.documentType}</span></div>
                        </div>
                        {analysis.completionScore !== undefined && <div className="w-28 bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center"><div className="text-3xl font-bold text-gray-900">{analysis.completionScore}%</div><div className="text-xs text-gray-400 mt-1 text-center">Complete</div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-2"><div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${analysis.completionScore}%` }} /></div></div>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {analysis.parties && Object.values(analysis.parties).some((v: any) => v) && <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center gap-2 mb-3"><User className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Parties</span></div><div className="space-y-1.5">{Object.entries(analysis.parties).map(([key, val]: any) => val && <div key={key} className="flex justify-between text-xs"><span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span><span className="text-gray-700 font-medium text-right max-w-32 truncate">{val}</span></div>)}</div></div>}
                        {analysis.keyTerms && Object.values(analysis.keyTerms).some((v: any) => v) && <div className="bg-gray-50 rounded-xl p-4"><div className="flex items-center gap-2 mb-3"><DollarSign className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Key Terms</span></div><div className="space-y-1.5">{Object.entries(analysis.keyTerms).map(([key, val]: any) => val && <div key={key} className="flex justify-between text-xs"><span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span><span className="text-gray-700 font-medium text-right max-w-32 truncate">{val}</span></div>)}</div></div>}
                      </div>
                      {analysis.actionItems && analysis.actionItems.length > 0 && <div><div className="flex items-center gap-2 mb-3"><TrendingUp className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Action Items</span></div><div className="space-y-2">{analysis.actionItems.map((item: any, i: number) => <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${PRIORITY_COLORS[item.priority] || 'bg-gray-50 border-gray-200'}`}><span className="font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5">{item.priority}</span><span className="flex-1">{item.task}</span><span className="text-gray-400 flex-shrink-0 capitalize">{item.responsible}</span></div>)}</div></div>}
                      <div className="grid grid-cols-2 gap-4">
                        {analysis.criticalDates && analysis.criticalDates.length > 0 && <div><div className="flex items-center gap-2 mb-3"><Calendar className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Critical Dates</span></div><div className="space-y-2">{analysis.criticalDates.map((d: any, i: number) => <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-xs"><span className="text-gray-600">{d.label}</span><div className="text-right"><div className="font-medium text-gray-900">{d.date}</div>{d.daysUntil !== null && d.daysUntil !== undefined && <div className={d.daysUntil < 7 ? 'text-red-500' : d.daysUntil < 14 ? 'text-yellow-500' : 'text-gray-400'}>{d.daysUntil === 0 ? 'Today' : d.daysUntil < 0 ? `${Math.abs(d.daysUntil)}d ago` : `${d.daysUntil}d away`}</div>}</div></div>)}</div></div>}
                        {analysis.contingencies && analysis.contingencies.length > 0 && <div><div className="flex items-center gap-2 mb-3"><CheckCircle className="w-3.5 h-3.5 text-gray-500" /><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contingencies</span></div><div className="space-y-2">{analysis.contingencies.map((c: any, i: number) => <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-xs"><span className="text-gray-600">{c.name}</span><span className={`px-2 py-0.5 rounded-full font-medium capitalize ${c.status === 'satisfied' ? 'bg-green-100 text-green-700' : c.status === 'waived' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span></div>)}</div></div>}
                      </div>
                      {analysis.risks && analysis.risks.length > 0 && <div><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-3.5 h-3.5 text-orange-500" /><span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Risks and Missing Items</span></div><div className="space-y-2">{analysis.risks.map((risk: any, i: number) => <div key={i} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs"><span>{risk.severity === 'high' ? '🔴' : risk.severity === 'medium' ? '🟡' : '🟢'}</span><span className="text-gray-700">{risk.issue}</span></div>)}</div></div>}
                      {analysis.completenessIssues && analysis.completenessIssues.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Document Completeness Issues</span>
                          </div>
                          <div className="space-y-2">
                            {analysis.completenessIssues.map((issue: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 p-3 rounded-lg text-xs border" style={{ background: issue.severity === 'high' ? '#fef2f2' : '#fffbeb', borderColor: issue.severity === 'high' ? '#fecaca' : '#fde68a' }}>
                                <span className="flex-shrink-0">{issue.severity === 'high' ? '🔴' : '🟡'}</span>
                                <div>
                                  <span className="text-gray-700">{issue.description}</span>
                                  <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: issue.type === 'missing_signature' ? '#fee2e2' : issue.type === 'missing_date' ? '#fef3c7' : issue.type === 'blank_field' ? '#e0e7ff' : '#fce7f3', color: issue.type === 'missing_signature' ? '#991b1b' : issue.type === 'missing_date' ? '#92400e' : issue.type === 'blank_field' ? '#3730a3' : '#9d174d' }}>
                                    {issue.type === 'missing_signature' ? 'Missing Signature' : issue.type === 'missing_date' ? 'Missing Date' : issue.type === 'blank_field' ? 'Blank Field' : 'Inconsistency'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Document Comparison Results */}
      {comparisonResult && !comparisonResult.error && (
        <div className="card p-4 md:p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-purple-500" /> Document Comparison
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{comparisonResult.summary}</p>
            </div>
            <button onClick={() => setComparisonResult(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          {comparisonResult.discrepancies && comparisonResult.discrepancies.length > 0 ? (
            <div className="space-y-3">
              {comparisonResult.discrepancies.map((d: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${d.severity === 'high' ? 'bg-red-50 border-red-200' : d.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{d.severity === 'high' ? '🔴' : d.severity === 'medium' ? '🟡' : '🔵'}</span>
                    <span className={`text-sm font-semibold ${d.severity === 'high' ? 'text-red-800' : d.severity === 'medium' ? 'text-yellow-800' : 'text-blue-800'}`}>{d.field}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {d.documents?.map((docName: string, j: number) => (
                      <div key={j} className="text-xs bg-white/80 rounded-lg px-3 py-1.5 border border-gray-200">
                        <span className="text-gray-500">{docName}:</span>{' '}
                        <span className="font-medium text-gray-800">{d.values?.[j] || '—'}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">{d.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-700 font-medium">No discrepancies found</p>
              <p className="text-xs text-green-600 mt-1">All documents are consistent</p>
            </div>
          )}
          {comparisonResult.consistentFields && comparisonResult.consistentFields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Consistent across all documents:</p>
              <div className="flex flex-wrap gap-1.5">
                {comparisonResult.consistentFields.map((field: string, i: number) => (
                  <span key={i} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">{field}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {comparisonResult?.error && (
        <div className="card p-4 mt-6 bg-red-50 border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{comparisonResult.error}</span>
          <button onClick={() => setComparisonResult(null)} className="p-1 hover:bg-red-100 rounded"><X className="w-4 h-4" /></button>
        </div>
      )}

      </>}

      {/* ==================== CHECKLIST TAB ==================== */}
      {activeTab === 'checklist' && <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-brand-500" /> Transaction Checklist
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">California contract-to-close compliance</p>
          </div>
          <div className="flex items-center gap-2">
            {checklist.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {checklist.filter(t => t.completed).length}/{checklist.length} complete
              </div>
            )}
            <button onClick={generateChecklist} disabled={generatingChecklist} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
              {generatingChecklist ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : checklist.length > 0 ? '↺ Regenerate' : '⚡ Generate Checklist'}
            </button>
          </div>
        </div>

        {checklist.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No checklist yet</p>
            <p className="text-xs text-gray-300 mt-1">Click Generate Checklist to create a California-compliant task list</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all','Contract Received','Disclosures','Inspections','Loan & Appraisal','Title','Pre-Closing','Closing','Post-Closing'].map(f => (
                <button key={f} onClick={() => setChecklistFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${checklistFilter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {checklist.filter(t => checklistFilter === 'all' || t.phase === checklistFilter).map((task: any) => (
                <div key={task.id} className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${task.completed ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={task.completed} onChange={e => toggleTask(task.id, e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-brand-500 flex-shrink-0 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.task}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{task.phase}</span>
                      <span className="text-xs font-medium text-brand-600">{task.responsible}</span>
                      {task.due_date && (
                        <span className={`text-xs ${new Date(task.due_date) < new Date() && !task.completed ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {task.category && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{task.category}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </>}

      {/* ==================== TIMELINE TAB ==================== */}
      {activeTab === 'timeline' && <>
      <div className="card p-4 md:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-500" /> Activity Timeline</h2>
        <p className="text-xs text-gray-400 mb-5">Notes, AI events, status changes, and email notifications</p>
        <form onSubmit={addNote} className="flex gap-2 mb-6">
          <input type="text" className="input text-sm flex-1" placeholder="Add a note to the timeline..." value={note} onChange={e => setNote(e.target.value)} />
          <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={savingNote}>{savingNote ? 'Adding...' : 'Add note'}</button>
        </form>
        {timeline.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">No activity yet</p>
            <p className="text-xs text-gray-300 mt-1">Timeline events will appear as you upload documents and manage this transaction</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((event: any) => {
              const isAI = event.type?.startsWith('ai_')
              const isEmail = event.type === 'email'
              const isStatus = event.type === 'status_change'
              const isSystem = event.type === 'system'
              return (
                <div key={event.id} className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isAI ? 'bg-purple-400' : isEmail ? 'bg-blue-400' : isStatus ? 'bg-green-400' : isSystem ? 'bg-orange-400' : 'bg-brand-400'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{event.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">{fmt(event.created_at)}</p>
                      {isAI && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">AI</span>}
                      {isEmail && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Email</span>}
                      {isStatus && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Status</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </>}
    </div>
  )
}