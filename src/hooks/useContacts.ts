import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Contact, ContactRelationship, Company } from '@/types'

export interface ContactWithCompany extends Contact {
  company: Company | null
}

export function useContacts(companyId?: string) {
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*)
      `)
      .order('name', { ascending: true })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setContacts([])
    } else {
      setContacts(data as ContactWithCompany[])
    }
    setLoading(false)
  }, [companyId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const createContact = async (contact: {
    name: string
    company_id?: string
    role?: string
    email?: string
    phone?: string
    linkedin_url?: string
    relationship?: ContactRelationship
    notes?: string
    warmth?: number
    next_followup_date?: string
  }): Promise<Contact | null> => {
    const { data, error: insertError } = await supabase
      .from('contacts')
      .insert({
        name: contact.name,
        company_id: contact.company_id || null,
        role: contact.role || null,
        email: contact.email || null,
        phone: contact.phone || null,
        linkedin_url: contact.linkedin_url || null,
        relationship: contact.relationship || null,
        notes: contact.notes || null,
        warmth: contact.warmth || null,
        next_followup_date: contact.next_followup_date || null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return null
    }

    await fetchContacts()
    return data as Contact
  }

  const updateContact = async (
    id: string,
    updates: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return false
    }

    await fetchContacts()
    return true
  }

  const deleteContact = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return false
    }

    await fetchContacts()
    return true
  }

  const markContacted = async (id: string): Promise<boolean> => {
    return updateContact(id, { last_contacted_at: new Date().toISOString() })
  }

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    markContacted,
  }
}

// Hook to get contacts needing follow-up
export function useContactsNeedingFollowUp() {
  const [contacts, setContacts] = useState<ContactWithCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const { data, error: fetchError } = await supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*)
      `)
      .lte('next_followup_date', today)
      .order('next_followup_date', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setContacts([])
    } else {
      setContacts(data as ContactWithCompany[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return { contacts, loading, error, refetch: fetchContacts }
}
