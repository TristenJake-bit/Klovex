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
  const [checklist, setChecklist] = useState<any[]>([])
  const [checklistFilter, setChecklistFilter] = useState('all')
  const [generatingChecklist, setGeneratingChecklist] = useState(false)
  useEffect(() => {
    const supabase = createClient()
    supabase.from('transactions').select('*').eq('id', id).single().then(({ data }) => { setTx(data); setLoading(false) })
    supabase.from('documents').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => {
      setDocuments(data || []); if (data) data.forEach((doc: any) => loadAnalysis(doc.id))
    })
    supabase.from('timeline_events').select('*').eq('transaction_id', id).order('created_at', { ascending: false }).then(({ data }) => { setTimeline(data || []) })
    ;(supabase as any).from('transaction_checklists').select('*').eq('transaction_id', id).order('due_date', { ascending: true }).order('phase', { ascending: true }).then(({ data }: any) => { setChecklist(data || []) })
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
    const file = e.target.files?.[0]; if (!file) return
    // Prevent accidental duplicate uploads
    const alreadyExists = documents.some(d => d.name === file.name)
    if (alreadyExists) {
      if (!window.confirm(`"${file.name}" is already uploaded. Upload another copy?`)) {
        e.target.value = ''; return
      }
    }
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const filePath = `${id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)
      const { data: docData } = await (supabase as any).from('documents').insert({ transaction_id: id, name: file.name, url: publicUrl, uploaded_by: user?.id, file_type: file.type, file_size: file.size }).select().single()
      if (docData) { setDocuments((prev) => [docData, ...prev]); analyzeDocument(docData.id, publicUrl, file.name, id) }
    }
    setUploading(false); e.target.value = ''
  }
  async function analyzeDocument(docId: string, docUrl: string, docName: string, txId?: string) {
    setAnalyzingDoc(docId); setExpandedAnalysis(docId)
    try {
      const response = await fetch('/api/analyze-document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: docId, documentUrl: docUrl, documentName: docName, transactionId: txId || id }) })
      const data = await response.json()
      if (data.analysis) {
        setAnalyses(prev => ({ ...prev, [docId]: data.analysis }))
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

  async function toggleTask(taskId: string, completed: boolean) {
    const supabase = createClient()
    await (supabase as any).from('transaction_checklists').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', taskId)
    setChecklist(prev => prev.map(t => t.id === taskId ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t))
  }

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const fmtMoney = (n: number) => n ? `$${n.toLocaleString()}` : '—'
  const fmtSize = (b: number) => b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`
  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!tx) return <div className="p-8 text-gray-400">Transaction not found</div>
  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-5 md:mb-8">
        <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4 text-brand-500" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-semibold text-gray-900 leading-tight">{tx.property_address}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[tx.status] || 'bg-gray-100 text-gray-600'}`}>{tx.status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{tx.transaction_type} · Created {fmt(tx.created_at)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="card p-3 md:p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Purchase Price</p><p className="text-lg md:text-2xl font-semibold text-gray-900">{fmtMoney(tx.purchase_price)}</p></div>
        <div className="card p-3 md:p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Close Date</p><p className="text-lg md:text-2xl font-semibold text-gray-900">{fmt(tx.closing_date)}</p></div>
        <div className="card p-3 md:p-5"><p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Status</p>
          <select className="text-sm font-medium bg-transparent border-0 p-0 text-gray-900 cursor-pointer focus:outline-none w-full" value={tx.status} onChange={e => handleStatusChange(e.target.value)}>
            <option value="pending">Pending</option><option value="contract">Contract</option><option value="inspection">Inspection</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
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
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-brand-500" /> Timeline</h2>
          <form onSubmit={addNote} className="flex gap-2 mb-5">
            <input type="text" className="input text-sm flex-1" placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} />
            <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={savingNote}>Add</button>
          </form>
          <div className="space-y-3">
            {timeline.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No timeline events yet</p> : timeline.map((event: any) => (
              <div key={event.id} className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" /><div><p className="text-sm text-gray-700">{event.content}</p><p className="text-xs text-gray-400 mt-0.5">{fmt(event.created_at)}</p></div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-500" /> Documents</h2><p className="text-xs text-gray-400 mt-0.5">AI analysis runs automatically on upload</p></div>
          <label className="btn-primary px-4 py-2 text-sm cursor-pointer flex items-center gap-2">
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <>Upload Document</>}
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={uploading} />
          </label>
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
                      <button onClick={() => analyzeDocument(doc.id, doc.url, doc.name, id)} className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors" disabled={isAnalyzing}><Brain className="w-3 h-3" />{analysis ? 'Re-analyze' : 'Analyze'}</button>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-brand-600 px-3 py-1.5 border border-gray-200 rounded-full transition-colors">View</a>
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* TC CHECKLIST */}
      <div className="card p-6 mt-6">
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
    </div>
  )
}