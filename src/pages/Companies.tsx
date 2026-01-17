import { useState, useEffect } from 'react'
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Globe,
  Linkedin,
  MapPin,
  Users,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Company } from '@/types'

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch companies
  const fetchCompanies = async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setCompanies([])
    } else {
      setCompanies(data as Company[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addWebsite, setAddWebsite] = useState('')
  const [addLinkedin, setAddLinkedin] = useState('')
  const [addIndustry, setAddIndustry] = useState('')
  const [addSize, setAddSize] = useState('')
  const [addHeadquarters, setAddHeadquarters] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editIndustry, setEditIndustry] = useState('')
  const [editSize, setEditSize] = useState('')
  const [editHeadquarters, setEditHeadquarters] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const resetAddForm = () => {
    setAddName('')
    setAddWebsite('')
    setAddLinkedin('')
    setAddIndustry('')
    setAddSize('')
    setAddHeadquarters('')
    setAddDescription('')
    setAddNotes('')
    setShowAddForm(false)
  }

  const handleAdd = async () => {
    if (!addName.trim()) return

    setAdding(true)
    const { error: insertError } = await supabase.from('companies').insert({
      name: addName.trim(),
      website: addWebsite.trim() || null,
      linkedin_url: addLinkedin.trim() || null,
      industry: addIndustry.trim() || null,
      company_size: addSize.trim() || null,
      headquarters: addHeadquarters.trim() || null,
      description: addDescription.trim() || null,
      notes: addNotes.trim() || null,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      await fetchCompanies()
      resetAddForm()
    }
    setAdding(false)
  }

  const handleEdit = (company: Company) => {
    setEditingId(company.id)
    setEditName(company.name)
    setEditWebsite(company.website || '')
    setEditLinkedin(company.linkedin_url || '')
    setEditIndustry(company.industry || '')
    setEditSize(company.company_size || '')
    setEditHeadquarters(company.headquarters || '')
    setEditDescription(company.description || '')
    setEditNotes(company.notes || '')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        name: editName.trim(),
        website: editWebsite.trim() || null,
        linkedin_url: editLinkedin.trim() || null,
        industry: editIndustry.trim() || null,
        company_size: editSize.trim() || null,
        headquarters: editHeadquarters.trim() || null,
        description: editDescription.trim() || null,
        notes: editNotes.trim() || null,
      })
      .eq('id', editingId)

    if (updateError) {
      setError(updateError.message)
    } else {
      await fetchCompanies()
      setEditingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase.from('companies').delete().eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      await fetchCompanies()
      setDeletingId(null)
    }
  }

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      company.name.toLowerCase().includes(query) ||
      company.industry?.toLowerCase().includes(query) ||
      company.headquarters?.toLowerCase().includes(query)
    )
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600">Track companies you're interested in</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Add Company
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, industry, location..."
          className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2"
        />
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add New Company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Company name"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                value={addIndustry}
                onChange={(e) => setAddIndustry(e.target.value)}
                placeholder="Tech, Finance, etc."
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={addWebsite}
                onChange={(e) => setAddWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
              <input
                type="url"
                value={addLinkedin}
                onChange={(e) => setAddLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headquarters</label>
              <input
                type="text"
                value={addHeadquarters}
                onChange={(e) => setAddHeadquarters(e.target.value)}
                placeholder="City, Country"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
              <input
                type="text"
                value={addSize}
                onChange={(e) => setAddSize(e.target.value)}
                placeholder="50-200, 1000+, etc."
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="What the company does..."
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Your research notes..."
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
                  Add Company
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

      {/* Company List */}
      {filteredCompanies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery ? 'No companies found' : 'No companies yet'}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Add companies to track your target employers'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Company
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="relative rounded-lg border border-gray-200 bg-white p-4">
              {/* Delete Confirmation */}
              {deletingId === company.id && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/95 z-10">
                  <p className="mb-3 text-sm font-medium text-gray-900">Delete this company?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(company.id)}
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
              {editingId === company.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-medium"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Industry"
                  />
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Website"
                  />
                  <input
                    type="url"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="LinkedIn URL"
                  />
                  <input
                    type="text"
                    value={editHeadquarters}
                    onChange={(e) => setEditHeadquarters(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Headquarters"
                  />
                  <input
                    type="text"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Company size"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    rows={2}
                    placeholder="Description"
                  />
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
                  {/* Header */}
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    {company.industry && (
                      <p className="text-sm text-gray-500">{company.industry}</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="space-y-1 text-xs text-gray-500">
                    {company.headquarters && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{company.headquarters}</span>
                      </div>
                    )}
                    {company.company_size && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{company.company_size} employees</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {company.description && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">{company.description}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}
                    {company.linkedin_url && (
                      <a
                        href={company.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(company)}
                      className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(company.id)}
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
