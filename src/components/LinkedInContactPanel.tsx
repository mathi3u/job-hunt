import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Linkedin,
  Search,
  UserPlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  MessageSquare,
  Check,
} from 'lucide-react'
import { useContacts, type ContactWithCompany } from '@/hooks/useContacts'
import type { ContactRelationship } from '@/types'
import { RELATIONSHIP_LABELS, RELATIONSHIP_COLORS } from '@/types'

interface LinkedInContactPanelProps {
  companyId: string | null
  companyName: string
  roleName?: string
}

interface SearchLink {
  label: string
  query: string
  description: string
}

function generateSearchLinks(companyName: string, roleName?: string): SearchLink[] {
  const links: SearchLink[] = [
    {
      label: 'Recruiters',
      query: `${companyName} recruiter OR "talent acquisition"`,
      description: 'Find recruiters and talent acquisition',
    },
    {
      label: 'Hiring Managers',
      query: `${companyName} "hiring manager" OR "engineering manager" OR "team lead"`,
      description: 'Find potential hiring managers',
    },
  ]

  if (roleName) {
    // Extract key terms from role name
    const roleTerms = roleName
      .replace(/senior|junior|lead|staff|principal|sr\.|jr\./gi, '')
      .trim()

    links.push({
      label: 'Team Members',
      query: `${companyName} ${roleTerms}`,
      description: `Find people with similar roles`,
    })
  }

  links.push({
    label: 'All Employees',
    query: companyName,
    description: 'Browse all employees',
  })

  return links
}

function ContactCard({
  contact,
  onMarkContacted,
}: {
  contact: ContactWithCompany
  onMarkContacted: (id: string) => void
}) {
  const relationshipColor = contact.relationship
    ? RELATIONSHIP_COLORS[contact.relationship]
    : 'bg-gray-100 text-gray-600'

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {contact.name}
          </span>
          {contact.relationship && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${relationshipColor}`}>
              {RELATIONSHIP_LABELS[contact.relationship]}
            </span>
          )}
        </div>
        {contact.role && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.role}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <Linkedin className="h-3 w-3" />
              Profile
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 flex items-center gap-0.5"
            >
              <Mail className="h-3 w-3" />
              Email
            </a>
          )}
          {contact.last_contacted_at && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Contacted {formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onMarkContacted(contact.id)}
        className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30 transition-colors"
        title="Mark as contacted"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
    </div>
  )
}

function QuickAddContactForm({
  companyId,
  onAdd,
  onCancel,
}: {
  companyId: string | null
  onAdd: (contact: {
    name: string
    role?: string
    linkedin_url?: string
    relationship?: ContactRelationship
    company_id?: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [relationship, setRelationship] = useState<ContactRelationship>('employee')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    await onAdd({
      name: name.trim(),
      role: role.trim() || undefined,
      linkedin_url: linkedinUrl.trim() || undefined,
      relationship,
      company_id: companyId || undefined,
    })
    setSaving(false)
    setName('')
    setRole('')
    setLinkedinUrl('')
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name *"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          autoFocus
        />
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="LinkedIn URL"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as ContactRelationship)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="recruiter">Recruiter</option>
          <option value="hiring_manager">Hiring Manager</option>
          <option value="employee">Employee</option>
          <option value="referral">Referral</option>
          <option value="former_colleague">Former Colleague</option>
          <option value="alumni">Alumni</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? 'Adding...' : 'Add Contact'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function LinkedInContactPanel({ companyId, companyName, roleName }: LinkedInContactPanelProps) {
  const { contacts, loading, createContact, markContacted } = useContacts(companyId || undefined)
  const [expanded, setExpanded] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAllSearches, setShowAllSearches] = useState(false)

  const searchLinks = generateSearchLinks(companyName, roleName)
  const visibleSearchLinks = showAllSearches ? searchLinks : searchLinks.slice(0, 2)

  const handleAddContact = async (contact: {
    name: string
    role?: string
    linkedin_url?: string
    relationship?: ContactRelationship
    company_id?: string
  }) => {
    await createContact({
      name: contact.name,
      role: contact.role,
      linkedin_url: contact.linkedin_url,
      relationship: contact.relationship,
      company_id: contact.company_id,
      source: 'linkedin',
    })
  }

  const handleMarkContacted = async (id: string) => {
    await markContacted(id)
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">LinkedIn Contacts</h3>
          {contacts.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {contacts.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Search Links */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Find People at {companyName}
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleSearchLinks.map((link, i) => (
                <a
                  key={i}
                  href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(link.query)}&origin=GLOBAL_SEARCH_HEADER`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                  title={link.description}
                >
                  <Search className="h-3.5 w-3.5" />
                  {link.label}
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              ))}
              {searchLinks.length > 2 && (
                <button
                  onClick={() => setShowAllSearches(!showAllSearches)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showAllSearches ? 'Show less' : `+${searchLinks.length - 2} more`}
                </button>
              )}
            </div>
          </div>

          {/* Contacts List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Saved Contacts
              </p>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Contact
                </button>
              )}
            </div>

            {showAddForm && (
              <div className="mb-3">
                <QuickAddContactForm
                  companyId={companyId}
                  onAdd={handleAddContact}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            )}

            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                <User className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No contacts saved yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Use the search links above to find people, then add them here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onMarkContacted={handleMarkContacted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
