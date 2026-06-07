'use client'
import { useState, useEffect, useMemo } from 'react'
import { X, Mail, Send, ChevronDown, Loader2, Check, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'
import { resolveMergeFields, getAvailableMergeFields, DEFAULT_TEMPLATES, MergeContext } from '@/lib/email-merge'

interface SendEmailPanelProps {
  transaction: any
  contacts: any[]
  agentName: string
  onClose: () => void
  onSent: () => void
}

export default function SendEmailPanel({ transaction, contacts, agentName, onClose, onSent }: SendEmailPanelProps) {
  const [step, setStep] = useState<'pick' | 'compose' | 'manage'>('pick')
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [customTemplates, setCustomTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', body: '' })
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Load user's custom templates
  useEffect(() => {
    fetch('/api/email-templates')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCustomTemplates(data) })
      .catch(() => {})
      .finally(() => setLoadingTemplates(false))
  }, [])

  const allTemplates = useMemo(() => [...DEFAULT_TEMPLATES, ...customTemplates.map(t => ({ ...t, builtin: false }))], [customTemplates])

  const mergeContext: MergeContext = useMemo(() => ({
    transaction,
    contacts,
    agentName,
    tcName: agentName,
  }), [transaction, contacts, agentName])

  const contactsWithEmail = contacts.filter(c => c.email)

  // Preview with merge fields resolved
  const previewSubject = useMemo(() => {
    if (!subject) return ''
    return resolveMergeFields(subject, mergeContext, 'preview').result
  }, [subject, mergeContext])

  const previewBody = useMemo(() => {
    if (!body) return ''
    return resolveMergeFields(body, mergeContext, 'preview').result
  }, [body, mergeContext])

  const { missing } = useMemo(() => {
    const s = resolveMergeFields(subject, mergeContext, 'send')
    const b = resolveMergeFields(body, mergeContext, 'send')
    return { missing: [...new Set([...s.missing, ...b.missing])] }
  }, [subject, body, mergeContext])

  function selectTemplate(template: any) {
    setSelectedTemplate(template)
    setSubject(template.subject)
    setBody(template.body)
    setStep('compose')
  }

  async function handleSend() {
    if (selectedRecipients.length === 0) {
      setError('Select at least one recipient')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          subject,
          body,
          recipients: selectedRecipients,
          templateName: selectedTemplate?.name || 'Custom',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
      setTimeout(() => { onSent(); onClose() }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function toggleRecipient(email: string) {
    setSelectedRecipients(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    )
  }

  // Template CRUD
  async function saveTemplate() {
    setSavingTemplate(true)
    try {
      const method = editingTemplate?.id ? 'PUT' : 'POST'
      const payload = editingTemplate?.id
        ? { id: editingTemplate.id, ...templateForm }
        : templateForm
      const res = await fetch('/api/email-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (editingTemplate?.id) {
        setCustomTemplates(prev => prev.map(t => t.id === data.id ? data : t))
      } else {
        setCustomTemplates(prev => [data, ...prev])
      }
      setEditingTemplate(null)
      setTemplateForm({ name: '', subject: '', body: '' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  async function deleteTemplate(id: string) {
    try {
      await fetch('/api/email-templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setCustomTemplates(prev => prev.filter(t => t.id !== id))
    } catch {}
  }

  function startEditTemplate(template: any) {
    setEditingTemplate(template)
    setTemplateForm({ name: template.name, subject: template.subject, body: template.body })
  }

  const mergeFields = getAvailableMergeFields()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[5vh] px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-gray-900">
              {step === 'pick' ? 'Choose a Template' : step === 'manage' ? 'Manage Templates' : 'Compose Email'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: Pick template */}
          {step === 'pick' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Select a template to auto-fill with transaction data</p>
                <button onClick={() => setStep('manage')} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Manage Templates
                </button>
              </div>
              <div className="space-y-2">
                {/* Start from scratch */}
                <button onClick={() => { setSelectedTemplate(null); setSubject(''); setBody(''); setStep('compose') }}
                  className="w-full text-left p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Start from scratch</p>
                      <p className="text-xs text-gray-400">Write a custom email with merge fields</p>
                    </div>
                  </div>
                </button>
                {/* Built-in templates */}
                {allTemplates.map((t) => (
                  <button key={t.id} onClick={() => selectTemplate(t)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-700">{t.name}</p>
                          {t.builtin && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Built-in</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{t.subject}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {loadingTemplates && <p className="text-xs text-gray-400 text-center mt-4">Loading your templates...</p>}
            </div>
          )}

          {/* STEP: Manage templates */}
          {step === 'manage' && (
            <div>
              <button onClick={() => setStep('pick')} className="text-sm text-brand-600 hover:text-brand-700 mb-4 flex items-center gap-1">
                ← Back to templates
              </button>

              {/* Template editor form */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {editingTemplate?.id ? 'Edit Template' : 'Create New Template'}
                </h3>
                <div className="space-y-3">
                  <input className="input text-sm" placeholder="Template name" value={templateForm.name}
                    onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
                  <input className="input text-sm" placeholder="Email subject (supports {{merge_fields}})" value={templateForm.subject}
                    onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} />
                  <textarea className="input text-sm min-h-[120px] resize-y" placeholder="Email body (supports {{merge_fields}})" value={templateForm.body}
                    onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))} />
                  <div className="flex items-center gap-2">
                    <button onClick={saveTemplate} disabled={!templateForm.name || !templateForm.subject || !templateForm.body || savingTemplate}
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                      {savingTemplate ? 'Saving...' : editingTemplate?.id ? 'Update' : 'Save Template'}
                    </button>
                    {editingTemplate?.id && (
                      <button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', body: '' }) }}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                    )}
                  </div>
                </div>
                {/* Merge field reference */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-2">Available merge fields (click to copy):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mergeFields.map(f => (
                      <button key={f.key} onClick={() => navigator.clipboard.writeText(`{{${f.key}}}`)}
                        className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded hover:border-brand-300 hover:text-brand-600 transition-colors">
                        {`{{${f.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom templates list */}
              {customTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Your Templates</h3>
                  <div className="space-y-2">
                    {customTemplates.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">{t.name}</p>
                          <p className="text-xs text-gray-400 truncate">{t.subject}</p>
                        </div>
                        <button onClick={() => startEditTemplate(t)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: Compose */}
          {step === 'compose' && (
            <div>
              <button onClick={() => setStep('pick')} className="text-sm text-brand-600 hover:text-brand-700 mb-4 flex items-center gap-1">
                ← Change template
              </button>

              {/* Recipients */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Recipients</label>
                {contactsWithEmail.length === 0 ? (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    No contacts with email addresses. Add contact emails in the Contacts section first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {contactsWithEmail.map((c: any) => {
                      const selected = selectedRecipients.includes(c.email)
                      return (
                        <button key={c.id} onClick={() => toggleRecipient(c.email)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                            selected ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`}>
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs opacity-60">{c.role}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                <input className="input text-sm" value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject line..." />
              </div>

              {/* Body editor */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Body</label>
                  <div className="relative group">
                    <button className="text-xs text-brand-600 flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" /> Insert field
                    </button>
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 hidden group-hover:block z-10 w-56">
                      {mergeFields.map(f => (
                        <button key={f.key} onClick={() => setBody(b => b + `{{${f.key}}}`)}
                          className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 rounded text-gray-600">
                          <span className="font-mono text-brand-600">{`{{${f.key}}}`}</span>
                          <span className="text-gray-400 ml-2">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <textarea className="input text-sm min-h-[200px] resize-y font-mono" value={body}
                  onChange={e => setBody(e.target.value)} placeholder="Write your email body here..." />
              </div>

              {/* Live preview */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Preview</label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700" dangerouslySetInnerHTML={{ __html: previewSubject || '<span class="text-gray-300">Subject line...</span>' }} />
                  </div>
                  <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewBody || '<span class="text-gray-300">Email body will appear here...</span>' }} />
                </div>
              </div>

              {/* Missing fields warning */}
              {missing.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-700">Missing data for {missing.length} field{missing.length > 1 ? 's' : ''}</p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {missing.join(', ')} — add this data to the transaction or contacts, or remove the placeholder.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'compose' && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-gray-400">
              {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''} selected
            </p>
            <button onClick={handleSend} disabled={sending || sent || selectedRecipients.length === 0}
              className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
              {sent ? <><Check className="w-4 h-4" /> Sent!</> :
               sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> :
               <><Send className="w-4 h-4" /> Send Email</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
