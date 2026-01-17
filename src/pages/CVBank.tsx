import { useState, useRef } from 'react'
import { format } from 'date-fns'
import {
  FileText,
  Upload,
  Trash2,
  Star,
  ExternalLink,
  Edit2,
  Save,
  X,
  Plus,
} from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import type { CVDocument, DocLanguage } from '@/types'
import { DOC_LANGUAGE_LABELS } from '@/types'

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CVBank() {
  const { documents, loading, error, uploadDocument, updateDocument, deleteDocument, setDefaultDocument, getSignedUrl } = useDocuments('cv')

  // View document handler
  const handleViewDocument = async (filePath: string) => {
    const url = await getSignedUrl(filePath)
    if (url) {
      window.open(url, '_blank')
    }
  }

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadLanguage, setUploadLanguage] = useState<DocLanguage>('en')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLanguage, setEditLanguage] = useState<DocLanguage>('en')

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!uploadName) {
        // Auto-fill name from filename (without extension)
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setUploadName(nameWithoutExt)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) return

    setUploading(true)
    await uploadDocument(selectedFile, uploadName.trim(), uploadDescription.trim() || undefined, 'cv', uploadLanguage)
    setUploading(false)

    // Reset form
    setSelectedFile(null)
    setUploadName('')
    setUploadDescription('')
    setUploadLanguage('en')
    setShowUploadForm(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEdit = (doc: CVDocument) => {
    setEditingId(doc.id)
    setEditName(doc.name)
    setEditDescription(doc.description || '')
    setEditLanguage(doc.language)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    await updateDocument(editingId, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      language: editLanguage,
    })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteDocument(id)
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Bank</h1>
          <p className="text-gray-600">Manage your CVs and resumes for job applications</p>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Upload CV
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload New CV</h2>
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File *
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" />
                  Choose File
                </button>
                {selectedFile && (
                  <span className="text-sm text-gray-600">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Accepted formats: PDF, DOC, DOCX</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., Software Engineer CV 2024"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional notes about this CV version..."
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={uploadLanguage}
                onChange={(e) => setUploadLanguage(e.target.value as DocLanguage)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {(Object.keys(DOC_LANGUAGE_LABELS) as DocLanguage[]).map((lang) => (
                  <option key={lang} value={lang}>
                    {DOC_LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !uploadName.trim() || uploading}
                className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowUploadForm(false)
                  setSelectedFile(null)
                  setUploadName('')
                  setUploadDescription('')
                  setUploadLanguage('en')
                }}
                className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV List */}
      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No CVs yet</h3>
          <p className="mt-2 text-gray-500">Upload your first CV to get started</p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            <Upload className="h-4 w-4" />
            Upload CV
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`relative rounded-lg border p-4 ${
                doc.is_default ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Default Badge */}
              {doc.is_default && (
                <span className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                  <Star className="h-3 w-3" />
                  Default
                </span>
              )}

              {/* Delete Confirmation */}
              {deletingId === doc.id && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/95">
                  <p className="mb-3 text-sm font-medium text-gray-900">Delete this CV?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Mode */}
              {editingId === doc.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Name"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    rows={2}
                    placeholder="Description"
                  />
                  <select
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value as DocLanguage)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    {(Object.keys(DOC_LANGUAGE_LABELS) as DocLanguage[]).map((lang) => (
                      <option key={lang} value={lang}>
                        {DOC_LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editName.trim()}
                      className="flex items-center gap-1 rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Content */}
                  <div className="mb-3 flex items-start gap-3">
                    <FileText className="mt-0.5 h-8 w-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                      {doc.description && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{doc.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mb-3 text-xs text-gray-500">
                    <p>Uploaded {format(new Date(doc.created_at), 'MMM d, yyyy')}</p>
                    <p>{formatFileSize(doc.file_size)} • {doc.file_type?.split('/')[1]?.toUpperCase() || 'File'} • {DOC_LANGUAGE_LABELS[doc.language]}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewDocument(doc.file_path)}
                      className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(doc)}
                      className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    {!doc.is_default && (
                      <button
                        onClick={() => setDefaultDocument(doc.id)}
                        className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Star className="h-3 w-3" />
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingId(doc.id)}
                      className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
