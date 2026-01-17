import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { CVDocument, DocType, DocLanguage } from '@/types'

const BUCKET_NAME = 'documents'

export function useDocuments(docType?: DocType) {
  const [documents, setDocuments] = useState<CVDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('documents')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (docType) {
      query = query.eq('doc_type', docType)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setDocuments([])
    } else {
      setDocuments(data as CVDocument[])
    }
    setLoading(false)
  }, [docType])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const getPublicUrl = (filePath: string): string => {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
    return data.publicUrl
  }

  const uploadDocument = async (
    file: File,
    name: string,
    description?: string,
    docType: DocType = 'cv',
    language: DocLanguage = 'en'
  ): Promise<CVDocument | null> => {
    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${docType}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      return null
    }

    // Create database record
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert({
        name,
        description: description || null,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        doc_type: docType,
        language,
        is_default: documents.filter(d => d.doc_type === docType).length === 0, // Default if first of type
      })
      .select()
      .single()

    if (insertError) {
      // Clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([filePath])
      setError(insertError.message)
      return null
    }

    await fetchDocuments()
    return data as CVDocument
  }

  const updateDocument = async (
    id: string,
    updates: { name?: string; description?: string }
  ): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    await fetchDocuments()
    return true
  }

  const deleteDocument = async (id: string): Promise<boolean> => {
    // Get document first to get file path
    const doc = documents.find(d => d.id === id)
    if (!doc) return false

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway to delete DB record
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    await fetchDocuments()
    return true
  }

  const setDefaultDocument = async (id: string): Promise<boolean> => {
    const doc = documents.find(d => d.id === id)
    if (!doc) return false

    // Unset current default of same type
    await supabase
      .from('documents')
      .update({ is_default: false })
      .eq('doc_type', doc.doc_type)
      .eq('is_default', true)

    // Set new default
    const { error: updateError } = await supabase
      .from('documents')
      .update({ is_default: true })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    await fetchDocuments()
    return true
  }

  const getDefaultDocument = (type: DocType = 'cv'): CVDocument | undefined => {
    return documents.find(d => d.doc_type === type && d.is_default)
  }

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    getPublicUrl,
    uploadDocument,
    updateDocument,
    deleteDocument,
    setDefaultDocument,
    getDefaultDocument,
  }
}
