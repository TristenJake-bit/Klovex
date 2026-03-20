'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { FileText, Upload, Download, Trash2, FolderOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('documents')
        .select('*, transactions(property_address)')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setDocuments(data || [])
          setLoading(false)
        })
    })
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="text-gray-500 text-sm mt-1">{documents.length} total</p>
        </div>
        <label className="btn-primary flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          Upload Document
          <input type="file" className="hidden" disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No documents yet</p>
          <p className="text-gray-400 text-sm mt-1">Documents uploaded to transactions will appear here</p>
        </div>
      ) : (
        <div data-tour="document-list" className="card divide-y divide-gray-100">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {doc.transactions?.property_address || 'No transaction'} · {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={doc.url} target="_blank" rel="noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
