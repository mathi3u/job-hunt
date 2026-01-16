import { useState, useRef, useEffect } from 'react'
import { FileText, ChevronDown, Star, Upload, ExternalLink } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'

interface CVSelectorProps {
  value: string
  onChange: (url: string) => void
  className?: string
}

export function CVSelector({ value, onChange, className = '' }: CVSelectorProps) {
  const { documents, loading, getPublicUrl, uploadDocument, getDefaultDocument } = useDocuments('cv')
  const [isOpen, setIsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-select default CV if no value set
  useEffect(() => {
    if (!value && documents.length > 0) {
      const defaultDoc = getDefaultDocument('cv')
      if (defaultDoc) {
        onChange(getPublicUrl(defaultDoc.file_path))
      }
    }
  }, [documents, value, getDefaultDocument, getPublicUrl, onChange])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const name = file.name.replace(/\.[^/.]+$/, '') // Remove extension
    const doc = await uploadDocument(file, name, undefined, 'cv')

    if (doc) {
      onChange(getPublicUrl(doc.file_path))
    }

    setUploading(false)
    setIsOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const selectedDoc = documents.find(doc => {
    const docUrl = getPublicUrl(doc.file_path)
    return docUrl === value
  })

  if (loading) {
    return (
      <div className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 ${className}`}>
        Loading CVs...
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-purple-300 bg-white px-3 py-2 text-left text-sm hover:bg-purple-50"
      >
        <div className="flex items-center gap-2 truncate">
          <FileText className="h-4 w-4 text-purple-500" />
          {uploading ? (
            <span className="text-gray-500">Uploading...</span>
          ) : selectedDoc ? (
            <span className="truncate">
              {selectedDoc.name}
              {selectedDoc.is_default && (
                <Star className="ml-1 inline h-3 w-3 text-yellow-500" />
              )}
            </span>
          ) : value ? (
            <span className="text-gray-600 truncate">{value}</span>
          ) : (
            <span className="text-gray-400">Select a CV...</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="max-h-60 overflow-auto py-1">
            {documents.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No CVs uploaded yet
              </div>
            ) : (
              documents.map((doc) => {
                const docUrl = getPublicUrl(doc.file_path)
                const isSelected = docUrl === value
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onChange(docUrl)
                      setIsOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-purple-50 ${
                      isSelected ? 'bg-purple-100' : ''
                    }`}
                  >
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="flex-1 truncate">{doc.name}</span>
                    {doc.is_default && (
                      <span className="flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                        <Star className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </button>
                )
              })
            )}

            {/* Divider */}
            <div className="my-1 border-t border-gray-200" />

            {/* Upload Option */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50"
            >
              <Upload className="h-4 w-4" />
              Upload new CV...
            </button>

            {/* Manual URL Option */}
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter CV URL:', value || '')
                if (url !== null) {
                  onChange(url)
                  setIsOpen(false)
                }
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
            >
              <ExternalLink className="h-4 w-4" />
              Enter URL manually...
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
