import { useState, useEffect, useRef } from 'react'
import { format, formatDistanceToNow, isPast, isToday, parse } from 'date-fns'
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Linkedin,
  Mail,
  Phone,
  Calendar,
  Search,
  Upload,
  FileSpreadsheet,
} from 'lucide-react'
import { useContacts, type ContactWithCompany } from '@/hooks/useContacts'
import { supabase } from '@/lib/supabase'
import type { ContactRelationship, ContactType, Company } from '@/types'
import { RELATIONSHIP_LABELS, RELATIONSHIP_COLORS, CONTACT_TYPE_LABELS } from '@/types'

const WARMTH_COLORS = [
  'bg-gray-200',
  'bg-blue-300',
  'bg-green-400',
  'bg-yellow-400',
  'bg-orange-500',
]

// Parse date strings like "Mar 22", "Apr 14", etc.
function parseShortDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined
  try {
    // Try parsing "Mar 22" format (assumes current year)
    const parsed = parse(dateStr.trim(), 'MMM d', new Date())
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
    // Try parsing "Apr 14" with year
    const withYear = parse(dateStr.trim(), 'MMM d yyyy', new Date())
    if (!isNaN(withYear.getTime())) {
      return withYear.toISOString()
    }
  } catch {
    // Ignore parse errors
  }
  return undefined
}

// Map contact type from spreadsheet to our enum
function mapContactType(typeStr: string | undefined): ContactType | undefined {
  if (!typeStr) return undefined
  const lower = typeStr.toLowerCase()
  if (lower.includes('linkedin') && lower.includes('inmail')) return 'linkedin_inmail'
  if (lower.includes('linkedin')) return 'linkedin_message'
  if (lower.includes('email')) return 'email'
  if (lower.includes('phone') || lower.includes('call')) return 'phone'
  if (lower.includes('coffee')) return 'coffee_chat'
  if (lower.includes('video') || lower.includes('skype')) return 'video_call'
  if (lower.includes('person') || lower.includes('meeting')) return 'in_person'
  if (lower.includes('event') || lower.includes('conf')) return 'event'
  if (lower.includes('referral') || lower.includes('intro')) return 'referral_intro'
  return undefined
}

export function ContactBank() {
  const { contacts, loading, error, createContact, updateContact, deleteContact, importContacts } = useContacts()
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRelationship, setFilterRelationship] = useState<ContactRelationship | ''>('')

  // Fetch companies for selector
  useEffect(() => {
    async function fetchCompanies() {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true })
      if (data) setCompanies(data)
    }
    fetchCompanies()
  }, [])

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCompanyId, setAddCompanyId] = useState('')
  const [addRole, setAddRole] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addLinkedin, setAddLinkedin] = useState('')
  const [addRelationship, setAddRelationship] = useState<ContactRelationship | ''>('')
  const [addNotes, setAddNotes] = useState('')
  const [addWarmth, setAddWarmth] = useState<number>(3)
  const [addFollowupDate, setAddFollowupDate] = useState('')
  const [addSource, setAddSource] = useState('')
  const [addReferredById, setAddReferredById] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCompanyId, setEditCompanyId] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editRelationship, setEditRelationship] = useState<ContactRelationship | ''>('')
  const [editNotes, setEditNotes] = useState('')
  const [editWarmth, setEditWarmth] = useState<number>(3)
  const [editFollowupDate, setEditFollowupDate] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editReferredById, setEditReferredById] = useState('')

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([])
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const resetAddForm = () => {
    setAddName('')
    setAddCompanyId('')
    setAddRole('')
    setAddEmail('')
    setAddPhone('')
    setAddLinkedin('')
    setAddRelationship('')
    setAddNotes('')
    setAddWarmth(3)
    setAddFollowupDate('')
    setAddSource('')
    setAddReferredById('')
    setShowAddForm(false)
  }

  const handleAdd = async () => {
    if (!addName.trim()) return

    setAdding(true)
    await createContact({
      name: addName.trim(),
      company_id: addCompanyId || undefined,
      role: addRole.trim() || undefined,
      email: addEmail.trim() || undefined,
      phone: addPhone.trim() || undefined,
      linkedin_url: addLinkedin.trim() || undefined,
      relationship: addRelationship || undefined,
      notes: addNotes.trim() || undefined,
      warmth: addWarmth,
      next_followup_date: addFollowupDate || undefined,
      source: addSource.trim() || undefined,
      referred_by_id: addReferredById || undefined,
    })
    setAdding(false)
    resetAddForm()
  }

  const handleEdit = (contact: ContactWithCompany) => {
    setEditingId(contact.id)
    setEditName(contact.name)
    setEditCompanyId(contact.company_id || '')
    setEditRole(contact.role || '')
    setEditEmail(contact.email || '')
    setEditPhone(contact.phone || '')
    setEditLinkedin(contact.linkedin_url || '')
    setEditRelationship(contact.relationship || '')
    setEditNotes(contact.notes || '')
    setEditWarmth(contact.warmth || 3)
    setEditFollowupDate(contact.next_followup_date || '')
    setEditSource(contact.source || '')
    setEditReferredById(contact.referred_by_id || '')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    await updateContact(editingId, {
      name: editName.trim(),
      company_id: editCompanyId || null,
      role: editRole.trim() || null,
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      linkedin_url: editLinkedin.trim() || null,
      relationship: editRelationship || null,
      notes: editNotes.trim() || null,
      warmth: editWarmth,
      next_followup_date: editFollowupDate || null,
      source: editSource.trim() || null,
      referred_by_id: editReferredById || null,
    })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteContact(id)
    setDeletingId(null)
  }

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) return

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

      // Parse rows
      const rows: Array<Record<string, string>> = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })
        if (row['Contact Name']) {
          rows.push(row)
        }
      }

      setImportPreview(rows)
      setShowImport(true)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (importPreview.length === 0) return

    setImporting(true)

    // Map spreadsheet columns to our contact fields
    const contactsToImport = importPreview.map(row => ({
      name: row['Contact Name'] || '',
      email: row['Email'] || undefined,
      phone: row['Phone'] || undefined,
      linkedin_url: row['LkIn Prof'] || undefined,
      notes: row['Notes'] || undefined,
      source: row['Source'] || undefined,
      skype: row['Skype'] || undefined,
      office_address: row['Office'] || undefined,
      angelist_url: row['Angelist'] || undefined,
      last_contacted_at: parseShortDate(row['Last Date']),
      last_contact_type: mapContactType(row['Last Type']),
      next_followup_date: parseShortDate(row['Next Date'])?.split('T')[0],
      next_contact_type: mapContactType(row['Next Type']),
    })).filter(c => c.name)

    const result = await importContacts(contactsToImport)
    setImportResult(result)
    setImporting(false)

    // Reset after showing result
    setTimeout(() => {
      setShowImport(false)
      setImportPreview([])
      setImportResult(null)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }, 3000)
  }

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      searchQuery === '' ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.role?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRelationship =
      filterRelationship === '' || contact.relationship === filterRelationship

    return matchesSearch && matchesRelationship
  })

  const getFollowupStatus = (date: string | null) => {
    if (!date) return null
    const followupDate = new Date(date)
    if (isPast(followupDate) && !isToday(followupDate)) return 'overdue'
    if (isToday(followupDate)) return 'today'
    return 'upcoming'
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
          <h1 className="text-2xl font-bold text-gray-900">Contact Bank</h1>
          <p className="text-gray-600">Manage your professional network and relationships</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvSelect}
            className="hidden"
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-5 w-5" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Import Preview */}
      {showImport && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Import Preview</h2>
          </div>

          {importResult ? (
            <div className="text-center py-4">
              <p className="text-lg font-medium text-green-600">
                Imported {importResult.success} contacts
                {importResult.failed > 0 && (
                  <span className="text-red-600"> ({importResult.failed} failed)</span>
                )}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Found {importPreview.length} contacts to import:
              </p>
              <div className="max-h-48 overflow-auto bg-white rounded border border-gray-200 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Source</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{row['Contact Name']}</td>
                        <td className="px-3 py-2 text-gray-500">{row['Source']}</td>
                        <td className="px-3 py-2 text-gray-500">{row['Email']}</td>
                        <td className="px-3 py-2 text-gray-500">{row['Last Date']}</td>
                      </tr>
                    ))}
                    {importPreview.length > 10 && (
                      <tr className="border-t">
                        <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                          ...and {importPreview.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import {importPreview.length} Contacts
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowImport(false)
                    setImportPreview([])
                    if (csvInputRef.current) csvInputRef.current.value = ''
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, role, email..."
            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2"
          />
        </div>
        <select
          value={filterRelationship}
          onChange={(e) => setFilterRelationship(e.target.value as ContactRelationship | '')}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">All Relationships</option>
          {(Object.keys(RELATIONSHIP_LABELS) as ContactRelationship[]).map((rel) => (
            <option key={rel} value={rel}>
              {RELATIONSHIP_LABELS[rel]}
            </option>
          ))}
        </select>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add New Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={addCompanyId}
                onChange={(e) => setAddCompanyId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select company...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                placeholder="Job title"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <select
                value={addRelationship}
                onChange={(e) => setAddRelationship(e.target.value as ContactRelationship)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select type...</option>
                {(Object.keys(RELATIONSHIP_LABELS) as ContactRelationship[]).map((rel) => (
                  <option key={rel} value={rel}>
                    {RELATIONSHIP_LABELS[rel]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={addLinkedin}
                onChange={(e) => setAddLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={addFollowupDate}
                onChange={(e) => setAddFollowupDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                value={addSource}
                onChange={(e) => setAddSource(e.target.value)}
                placeholder="LinkedIn, Event, etc."
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
              <select
                value={addReferredById}
                onChange={(e) => setAddReferredById(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select contact...</option>
                {contacts.filter(c => c.name !== addName).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warmth ({addWarmth}/5)
              </label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setAddWarmth(level)}
                    className={`h-8 w-8 rounded-full transition-colors ${
                      level <= addWarmth ? WARMTH_COLORS[addWarmth - 1] : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="How you met, topics discussed, etc."
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!addName.trim() || adding}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {adding ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Contact
                </>
              )}
            </button>
            <button
              onClick={resetAddForm}
              className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery || filterRelationship ? 'No contacts found' : 'No contacts yet'}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchQuery || filterRelationship
              ? 'Try adjusting your search or filters'
              : 'Add your first contact to start building your network'}
          </p>
          {!searchQuery && !filterRelationship && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => {
            const followupStatus = getFollowupStatus(contact.next_followup_date)

            return (
              <div
                key={contact.id}
                className={`relative rounded-lg border p-4 ${
                  followupStatus === 'overdue'
                    ? 'border-red-300 bg-red-50'
                    : followupStatus === 'today'
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {/* Delete Confirmation */}
                {deletingId === contact.id && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/95 z-10">
                    <p className="mb-3 text-sm font-medium text-gray-900">Delete this contact?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(contact.id)}
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
                {editingId === contact.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-medium"
                      placeholder="Name"
                    />
                    <select
                      value={editCompanyId}
                      onChange={(e) => setEditCompanyId(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">No company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Role"
                    />
                    <select
                      value={editRelationship}
                      onChange={(e) => setEditRelationship(e.target.value as ContactRelationship)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">Relationship type...</option>
                      {(Object.keys(RELATIONSHIP_LABELS) as ContactRelationship[]).map((rel) => (
                        <option key={rel} value={rel}>
                          {RELATIONSHIP_LABELS[rel]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Phone"
                    />
                    <input
                      type="url"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="LinkedIn URL"
                    />
                    <input
                      type="date"
                      value={editFollowupDate}
                      onChange={(e) => setEditFollowupDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      value={editSource}
                      onChange={(e) => setEditSource(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      placeholder="Source (LinkedIn, Event, etc.)"
                    />
                    <select
                      value={editReferredById}
                      onChange={(e) => setEditReferredById(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">Referred by...</option>
                      {contacts.filter(c => c.id !== editingId).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setEditWarmth(level)}
                          className={`h-6 w-6 rounded-full transition-colors ${
                            level <= editWarmth ? WARMTH_COLORS[editWarmth - 1] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      rows={2}
                      placeholder="Notes"
                    />
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
                    {/* Header with name and warmth */}
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                        {contact.role && contact.company && (
                          <p className="text-sm text-gray-600">
                            {contact.role} at {contact.company.name}
                          </p>
                        )}
                        {contact.role && !contact.company && (
                          <p className="text-sm text-gray-600">{contact.role}</p>
                        )}
                        {!contact.role && contact.company && (
                          <p className="text-sm text-gray-600">{contact.company.name}</p>
                        )}
                      </div>
                      {contact.warmth && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-2 w-2 rounded-full ${
                                level <= contact.warmth! ? WARMTH_COLORS[contact.warmth! - 1] : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1">
                      {contact.relationship && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RELATIONSHIP_COLORS[contact.relationship]}`}
                        >
                          {RELATIONSHIP_LABELS[contact.relationship]}
                        </span>
                      )}
                      {contact.source && !contact.referred_by && (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {contact.source}
                        </span>
                      )}
                      {contact.referred_by && (
                        <button
                          onClick={() => {
                            setSearchQuery(contact.referred_by!.name)
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200"
                        >
                          <Users className="h-3 w-3" />
                          via {contact.referred_by.name}
                        </button>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      {contact.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.last_contacted_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Last: {formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true })}
                            {contact.last_contact_type && ` (${CONTACT_TYPE_LABELS[contact.last_contact_type]})`}
                          </span>
                        </div>
                      )}
                      {contact.next_followup_date && (
                        <div
                          className={`flex items-center gap-1 font-medium ${
                            followupStatus === 'overdue'
                              ? 'text-red-600'
                              : followupStatus === 'today'
                                ? 'text-yellow-600'
                                : 'text-gray-500'
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          <span>
                            Follow-up: {format(new Date(contact.next_followup_date), 'MMM d, yyyy')}
                            {followupStatus === 'overdue' && ' (overdue!)'}
                            {followupStatus === 'today' && ' (today!)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes preview */}
                    {contact.notes && (
                      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{contact.notes}</p>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                        >
                          <Mail className="h-3 w-3" />
                          Email
                        </a>
                      )}
                      <button
                        onClick={() => handleEdit(contact)}
                        className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(contact.id)}
                        className="flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
