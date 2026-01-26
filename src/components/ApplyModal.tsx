import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { CVSelector } from './CVSelector'
import type { OpportunitySource } from '@/types'
import { SOURCE_LABELS } from '@/types'

interface ApplyModalProps {
  opportunityId: string
  companyName?: string | null
  roleName?: string | null
  onClose: () => void
  onApply: (
    id: string,
    details: {
      resume_url?: string
      cover_letter_url?: string
      source?: string
      source_detail?: string
    }
  ) => Promise<void>
}

const APPLICATION_METHODS: { value: OpportunitySource; label: string }[] = [
  { value: 'company_website', label: SOURCE_LABELS.company_website },
  { value: 'job_board', label: SOURCE_LABELS.job_board },
  { value: 'referral', label: SOURCE_LABELS.referral },
  { value: 'recruiter_outreach', label: SOURCE_LABELS.recruiter_outreach },
  { value: 'networking', label: SOURCE_LABELS.networking },
  { value: 'cold_outreach', label: SOURCE_LABELS.cold_outreach },
]

export function ApplyModal({
  opportunityId,
  companyName,
  roleName,
  onClose,
  onApply,
}: ApplyModalProps) {
  const [resumeUrl, setResumeUrl] = useState('')
  const [coverLetterUrl, setCoverLetterUrl] = useState('')
  const [source, setSource] = useState<OpportunitySource>('company_website')
  const [sourceDetail, setSourceDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await onApply(opportunityId, {
        resume_url: resumeUrl || undefined,
        cover_letter_url: coverLetterUrl || undefined,
        source,
        source_detail: sourceDetail || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Failed to mark as applied:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const title = roleName
    ? `Apply to ${roleName}${companyName ? ` at ${companyName}` : ''}`
    : companyName
    ? `Apply to ${companyName}`
    : 'Mark as Applied'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Application Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Where did you apply?
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as OpportunitySource)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              {APPLICATION_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Detail (e.g., "LinkedIn", "Indeed", specific person name for referral) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {source === 'job_board'
                ? 'Which job board?'
                : source === 'referral'
                ? 'Who referred you?'
                : source === 'recruiter_outreach'
                ? 'Recruiter name/company'
                : 'Details (optional)'}
            </label>
            <input
              type="text"
              value={sourceDetail}
              onChange={(e) => setSourceDetail(e.target.value)}
              placeholder={
                source === 'job_board'
                  ? 'e.g., LinkedIn, Indeed, Glassdoor'
                  : source === 'referral'
                  ? 'e.g., John Smith'
                  : source === 'recruiter_outreach'
                  ? 'e.g., Jane Doe at TechRecruit'
                  : 'Additional details...'
              }
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* CV Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CV / Resume used
            </label>
            <CVSelector value={resumeUrl} onChange={setResumeUrl} />
          </div>

          {/* Cover Letter (optional - manual URL for now) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cover Letter URL (optional)
            </label>
            <input
              type="url"
              value={coverLetterUrl}
              onChange={(e) => setCoverLetterUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Mark as Applied'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
