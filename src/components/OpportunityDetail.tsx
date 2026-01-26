import { useState, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import {
  X,
  Building2,
  MapPin,
  ExternalLink,
  Calendar,
  DollarSign,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Save,
  Edit2,
  Search,
  Linkedin,
  Upload,
  FileText,
} from 'lucide-react'
import { useOpportunityDetail } from '@/hooks/usePipeline'
import { useDocuments } from '@/hooks/useDocuments'
import { supabase } from '@/lib/supabase'
import { CVSelector } from '@/components/CVSelector'
import { ApplyModal } from '@/components/ApplyModal'
import { LinkedInContactPanel } from '@/components/LinkedInContactPanel'
import type { OpportunityStatus, InterviewType, ClosedReason } from '@/types'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  INTERVIEW_TYPE_LABELS,
  CLOSED_REASON_LABELS,
  NEXT_ACTIONS,
} from '@/types'

const ALL_STATUSES: OpportunityStatus[] = [
  'identified',
  'researching',
  'preparing',
  'applied',
  'interviewing',
  'offer',
  'closed_won',
  'closed_lost',
]

const ALL_CLOSED_REASONS: ClosedReason[] = [
  'rejected',
  'withdrew',
  'ghosted',
  'offer_declined',
  'role_cancelled',
  'not_a_fit',
]

const ALL_INTERVIEW_TYPES: InterviewType[] = [
  'recruiter_screen',
  'hiring_manager',
  'technical',
  'behavioral',
  'system_design',
  'case_study',
  'panel',
  'presentation',
  'culture_fit',
  'executive',
]

interface OpportunityDetailProps {
  opportunityId: string
  onClose: () => void
  onUpdate: () => void
}

export function OpportunityDetail({ opportunityId, onClose, onUpdate }: OpportunityDetailProps) {
  const { data, loading, error, refetch } = useOpportunityDetail(opportunityId)
  const { documents } = useDocuments('cv')
  const [updating, setUpdating] = useState(false)

  // Find CV name from URL
  const matchedCVName = useMemo(() => {
    if (!data?.resume_url || documents.length === 0) return null
    const matchedDoc = documents.find(doc => data.resume_url?.includes(doc.file_path))
    return matchedDoc?.name || null
  }, [data?.resume_url, documents])

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')

  // Application details editing
  const [editingApplication, setEditingApplication] = useState(false)
  const [applicationDetails, setApplicationDetails] = useState({
    resume_url: '',
    cover_letter_url: '',
    applied_date: '',
    source_detail: '',
  })
  const [uploadingCoverLetter, setUploadingCoverLetter] = useState(false)
  const coverLetterInputRef = useRef<HTMLInputElement>(null)

  // Add interview form
  const [showAddInterview, setShowAddInterview] = useState(false)
  const [newInterview, setNewInterview] = useState({
    scheduled_at: '',
    interview_type: 'recruiter_screen' as InterviewType,
    location: '',
    prep_notes: '',
  })

  // Closed reason picker
  const [showClosedReasonPicker, setShowClosedReasonPicker] = useState(false)

  // Apply modal
  const [showApplyModal, setShowApplyModal] = useState(false)

  // Job posting URLs editing
  const [editingUrls, setEditingUrls] = useState(false)
  const [urlDetails, setUrlDetails] = useState({
    url: '',
    company_url: '',
  })

  const handleStatusChange = async (newStatus: OpportunityStatus) => {
    // If changing to closed_lost, show reason picker first
    if (newStatus === 'closed_lost') {
      setShowClosedReasonPicker(true)
      return
    }

    // If changing to applied, show apply modal first
    if (newStatus === 'applied') {
      setShowApplyModal(true)
      return
    }

    setUpdating(true)

    // Set closed_at for closed_won, clear it for other statuses
    const updates: Record<string, unknown> = {
      status: newStatus,
      closed_reason: null,
      closed_at: newStatus === 'closed_won' ? new Date().toISOString() : null,
    }

    const { error } = await supabase
      .from('opportunities')
      .update(updates)
      .eq('id', opportunityId)

    if (!error) {
      await refetch()
      onUpdate()
    }
    setUpdating(false)
  }

  const handleApplyWithDetails = async (
    _id: string,
    details: {
      resume_url?: string
      cover_letter_url?: string
      source?: string
      source_detail?: string
    }
  ) => {
    setUpdating(true)
    const { error } = await supabase
      .from('opportunities')
      .update({
        status: 'applied' as OpportunityStatus,
        target_apply_date: new Date().toISOString().split('T')[0],
        ...details,
      })
      .eq('id', opportunityId)

    if (!error) {
      await refetch()
      onUpdate()
      setShowApplyModal(false)
    }
    setUpdating(false)
  }

  const handleClosedWithReason = async (reason: ClosedReason) => {
    setUpdating(true)
    setShowClosedReasonPicker(false)

    const { error } = await supabase
      .from('opportunities')
      .update({
        status: 'closed_lost',
        closed_reason: reason,
        closed_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)

    if (!error) {
      await refetch()
      onUpdate()
    }
    setUpdating(false)
  }

  const handleSaveNotes = async () => {
    setUpdating(true)
    const { error } = await supabase
      .from('opportunities')
      .update({ notes })
      .eq('id', opportunityId)

    if (!error) {
      await refetch()
      setEditingNotes(false)
    }
    setUpdating(false)
  }

  const handleSaveApplicationDetails = async () => {
    setUpdating(true)
    const { error } = await supabase
      .from('opportunities')
      .update({
        resume_url: applicationDetails.resume_url || null,
        cover_letter_url: applicationDetails.cover_letter_url || null,
        target_apply_date: applicationDetails.applied_date || null,
        source_detail: applicationDetails.source_detail || null,
      })
      .eq('id', opportunityId)

    if (!error) {
      await refetch()
      setEditingApplication(false)
    }
    setUpdating(false)
  }

  const handleCoverLetterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCoverLetter(true)

    // Create a unique file path for this application's cover letter
    const fileExt = file.name.split('.').pop()
    const fileName = `cover-letters/${opportunityId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploadingCoverLetter(false)
      return
    }

    // Get the signed URL
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year

    if (urlData?.signedUrl) {
      setApplicationDetails({ ...applicationDetails, cover_letter_url: urlData.signedUrl })
    }

    setUploadingCoverLetter(false)
    if (coverLetterInputRef.current) {
      coverLetterInputRef.current.value = ''
    }
  }

  const handleSaveUrls = async () => {
    if (!data?.job_posting?.id) return

    setUpdating(true)
    const { error } = await supabase
      .from('job_postings')
      .update({
        url: urlDetails.url || null,
        company_url: urlDetails.company_url || null,
      })
      .eq('id', data.job_posting.id)

    if (!error) {
      await refetch()
      setEditingUrls(false)
    }
    setUpdating(false)
  }

  const handleAddInterview = async () => {
    if (!newInterview.scheduled_at) return

    setUpdating(true)

    // First, ensure we have an interview process
    let processId = data?.interview_process?.id

    if (!processId) {
      // Create interview process
      const { data: processData, error: processError } = await supabase
        .from('interview_processes')
        .insert({
          opportunity_id: opportunityId,
          stage: 'screening',
          outcome: 'in_progress',
        })
        .select()
        .single()

      if (processError) {
        console.error('Failed to create interview process:', processError)
        setUpdating(false)
        return
      }
      processId = processData.id
    }

    // Create interview
    const { error } = await supabase
      .from('interviews')
      .insert({
        process_id: processId,
        scheduled_at: newInterview.scheduled_at,
        interview_type: newInterview.interview_type,
        location: newInterview.location || null,
        prep_notes: newInterview.prep_notes || null,
        round: (data?.interviews.length || 0) + 1,
      })

    if (!error) {
      // Update opportunity status to interviewing if not already
      if (data?.status === 'applied' || data?.status === 'identified' || data?.status === 'preparing') {
        await supabase
          .from('opportunities')
          .update({ status: 'interviewing' })
          .eq('id', opportunityId)
      }

      await refetch()
      onUpdate()
      setShowAddInterview(false)
      setNewInterview({
        scheduled_at: '',
        interview_type: 'recruiter_screen',
        location: '',
        prep_notes: '',
      })
    }
    setUpdating(false)
  }

  const handleToggleInterviewComplete = async (interviewId: string, completed: boolean) => {
    setUpdating(true)
    await supabase
      .from('interviews')
      .update({ completed: !completed })
      .eq('id', interviewId)
    await refetch()
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-8">
          <p className="text-red-600 dark:text-red-400">Failed to load opportunity details</p>
          <button onClick={onClose} className="mt-4 text-primary-600 hover:underline">
            Close
          </button>
        </div>
      </div>
    )
  }

  const posting = data.job_posting
  const company = data.company

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <div className="relative w-full max-w-3xl rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 p-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {posting?.role || data.title || 'Untitled Opportunity'}
                </h2>
                <select
                  value={data.status}
                  onChange={(e) => handleStatusChange(e.target.value as OpportunityStatus)}
                  disabled={updating}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[data.status]} ${updating ? 'opacity-50' : ''}`}
                >
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                {data.status === 'closed_lost' && data.closed_reason && (
                  <span className="text-xs text-red-600">
                    ({CLOSED_REASON_LABELS[data.closed_reason]})
                  </span>
                )}
                {(data.status === 'closed_won' || data.status === 'closed_lost') && data.closed_at && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    on {format(new Date(data.closed_at), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              {company && (
                <div className="mt-1 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{company.name}</span>
                  {company.industry && <span className="text-gray-400">({company.industry})</span>}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Contextual Action Bar - Right after header */}
          {NEXT_ACTIONS[data.status]?.length > 0 && (
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-900">
              {NEXT_ACTIONS[data.status].map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (action.status) {
                      handleStatusChange(action.status)
                    } else if (action.action === 'close') {
                      setShowClosedReasonPicker(true)
                    }
                  }}
                  disabled={updating}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : action.variant === 'danger'
                      ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {action.label}
                </button>
              ))}

              {/* Quick links for pre-apply stages */}
              {['identified', 'researching', 'preparing'].includes(data.status) && (
                <>
                  <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                  {(posting?.company_url || posting?.url) && (
                    <a
                      href={(posting.company_url || posting.url) ?? ''}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 whitespace-nowrap"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Posting
                    </a>
                  )}
                  {company && (
                    <a
                      href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.name)}&origin=GLOBAL_SEARCH_HEADER`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      Contacts
                    </a>
                  )}
                  {company && (
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(company.name + ' company culture reviews')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 whitespace-nowrap"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Research
                    </a>
                  )}
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
              {posting?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{posting.location}</span>
                </div>
              )}
              {posting?.salary_range && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>{posting.salary_range}</span>
                </div>
              )}
              {posting?.posted_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Posted {format(new Date(posting.posted_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {posting?.url && (
                <a
                  href={posting.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Posting</span>
                </a>
              )}
            </div>

            {/* Job Links Section */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Job Links</h3>
                {!editingUrls && (
                  <button
                    onClick={() => {
                      setUrlDetails({
                        url: posting?.url || '',
                        company_url: posting?.company_url || '',
                      })
                      setEditingUrls(true)
                    }}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    {posting?.url || posting?.company_url ? 'Edit' : 'Add Links'}
                  </button>
                )}
              </div>

              {editingUrls ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Posting URL
                    </label>
                    <input
                      type="url"
                      value={urlDetails.url}
                      onChange={(e) => setUrlDetails({ ...urlDetails, url: e.target.value })}
                      placeholder="https://linkedin.com/jobs/..."
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Career Page URL
                    </label>
                    <input
                      type="url"
                      value={urlDetails.company_url}
                      onChange={(e) => setUrlDetails({ ...urlDetails, company_url: e.target.value })}
                      placeholder="https://company.com/careers/..."
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveUrls}
                      disabled={updating}
                      className="flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingUrls(false)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-32">Job Posting:</span>
                    {posting?.url ? (
                      <a
                        href={posting.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline truncate flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{posting.url}</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Not set</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 w-32">Company Page:</span>
                    {posting?.company_url ? (
                      <a
                        href={posting.company_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline truncate flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{posting.company_url}</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Not set</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn Contacts */}
            {company && (
              <LinkedInContactPanel
                companyId={company.id}
                companyName={company.name}
                roleName={posting?.role || data.title || undefined}
              />
            )}

            {/* TL;DR */}
            {posting?.tldr && (
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 font-semibold text-blue-900">Summary</h3>
                <p className="text-blue-800">{posting.tldr}</p>
              </div>
            )}

            {/* Application Details - Show for applied status and beyond */}
            {['applied', 'interviewing', 'offer', 'closed_won', 'closed_lost'].includes(data.status) && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-300">Application Details</h3>
                  {!editingApplication && (
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0]
                        setApplicationDetails({
                          resume_url: data.resume_url || '',
                          cover_letter_url: data.cover_letter_url || '',
                          applied_date: data.target_apply_date || today,
                          source_detail: data.source_detail || '',
                        })
                        setEditingApplication(true)
                      }}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      <Edit2 className="h-4 w-4" />
                      {data.resume_url || data.cover_letter_url || data.target_apply_date || data.source_detail ? 'Edit' : 'Add Details'}
                    </button>
                  )}
                </div>

                {editingApplication ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                        Application Date
                      </label>
                      <input
                        type="date"
                        value={applicationDetails.applied_date}
                        onChange={(e) => setApplicationDetails({ ...applicationDetails, applied_date: e.target.value })}
                        className="w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                        How did you apply?
                      </label>
                      <input
                        type="text"
                        value={applicationDetails.source_detail}
                        onChange={(e) => setApplicationDetails({ ...applicationDetails, source_detail: e.target.value })}
                        placeholder="LinkedIn Easy Apply, Company website, Email, Referral..."
                        className="w-full rounded-md border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                        CV/Resume Used
                      </label>
                      <CVSelector
                        value={applicationDetails.resume_url}
                        onChange={(url) => setApplicationDetails({ ...applicationDetails, resume_url: url })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                        Cover Letter (Optional)
                      </label>
                      <input
                        ref={coverLetterInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCoverLetterUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        {applicationDetails.cover_letter_url ? (
                          <div className="flex-1 flex items-center gap-2 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-gray-700 dark:text-white">
                            <FileText className="h-4 w-4 text-purple-500" />
                            <a
                              href={applicationDetails.cover_letter_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 dark:text-purple-400 hover:underline truncate"
                            >
                              Cover Letter Uploaded
                            </a>
                            <button
                              type="button"
                              onClick={() => setApplicationDetails({ ...applicationDetails, cover_letter_url: '' })}
                              className="ml-auto text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => coverLetterInputRef.current?.click()}
                            disabled={uploadingCoverLetter}
                            className="flex items-center gap-2 rounded-md border border-purple-300 bg-white px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:bg-gray-700 dark:text-purple-300 dark:hover:bg-gray-600"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingCoverLetter ? 'Uploading...' : 'Upload Cover Letter'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveApplicationDetails}
                        disabled={updating}
                        className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingApplication(false)}
                        className="rounded-md border border-purple-300 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">Applied:</span>{' '}
                      <span className="text-purple-900 dark:text-purple-200 font-medium">
                        {data.target_apply_date
                          ? format(new Date(data.target_apply_date), 'MMM d, yyyy')
                          : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">Method:</span>{' '}
                      <span className="text-purple-900 dark:text-purple-200 font-medium">
                        {data.source_detail || 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">CV:</span>{' '}
                      {data.resume_url ? (
                        data.resume_url.startsWith('http') ? (
                          <a
                            href={data.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-700 dark:text-purple-300 underline hover:text-purple-900 dark:hover:text-purple-100"
                          >
                            {matchedCVName || 'View CV'}
                          </a>
                        ) : (
                          <span className="text-purple-900 dark:text-purple-200 font-medium">{data.resume_url}</span>
                        )
                      ) : (
                        <span className="text-purple-900 dark:text-purple-200 font-medium">Not set</span>
                      )}
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">Cover Letter:</span>{' '}
                      {data.cover_letter_url ? (
                        <a
                          href={data.cover_letter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 dark:text-purple-300 underline hover:text-purple-900 dark:hover:text-purple-100"
                        >
                          View Cover Letter
                        </a>
                      ) : (
                        <span className="text-purple-900 dark:text-purple-200 font-medium">Not set</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interviews Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Interviews {data.interviews.length > 0 && `(${data.interviews.length})`}
                </h3>
                <button
                  onClick={() => {
                    // Default to today at 9:00 AM
                    const now = new Date()
                    now.setHours(9, 0, 0, 0)
                    const defaultDateTime = now.toISOString().slice(0, 16)
                    setNewInterview({
                      scheduled_at: defaultDateTime,
                      interview_type: 'recruiter_screen',
                      location: '',
                      prep_notes: '',
                    })
                    setShowAddInterview(true)
                  }}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Interview
                </button>
              </div>

              {/* Add Interview Form */}
              {showAddInterview && (
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30 p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Schedule New Interview</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={newInterview.scheduled_at}
                        onChange={(e) => setNewInterview({ ...newInterview, scheduled_at: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Interview Type
                      </label>
                      <select
                        value={newInterview.interview_type}
                        onChange={(e) => setNewInterview({ ...newInterview, interview_type: e.target.value as InterviewType })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                      >
                        {ALL_INTERVIEW_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {INTERVIEW_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location / Link
                      </label>
                      <input
                        type="text"
                        value={newInterview.location}
                        onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })}
                        placeholder="Zoom, Phone, Office..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Prep Notes
                      </label>
                      <textarea
                        value={newInterview.prep_notes}
                        onChange={(e) => setNewInterview({ ...newInterview, prep_notes: e.target.value })}
                        placeholder="Topics to review, questions to ask..."
                        rows={2}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleAddInterview}
                      disabled={!newInterview.scheduled_at || updating}
                      className="flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Save Interview
                    </button>
                    <button
                      onClick={() => setShowAddInterview(false)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Interview List */}
              {data.interviews.length > 0 ? (
                <div className="space-y-2">
                  {data.interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleInterviewComplete(interview.id, interview.completed)}
                            className="hover:scale-110 transition-transform"
                          >
                            {interview.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                          <div>
                            <div className="font-medium">
                              {interview.interview_type
                                ? INTERVIEW_TYPE_LABELS[interview.interview_type]
                                : `Round ${interview.round || '?'}`}
                            </div>
                            {interview.scheduled_at && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(interview.scheduled_at), 'MMM d, yyyy h:mm a')}
                                {interview.location && ` · ${interview.location}`}
                              </div>
                            )}
                          </div>
                        </div>
                        {interview.went_well !== null && (
                          <span className={interview.went_well ? 'text-green-600' : 'text-red-600'}>
                            {interview.went_well ? 'Went well' : 'Needs improvement'}
                          </span>
                        )}
                      </div>
                      {interview.prep_notes && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2">
                          <span className="font-medium">Prep:</span> {interview.prep_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No interviews scheduled yet.</p>
              )}
            </div>

            {/* Key Skills */}
            {posting?.key_skills && posting.key_skills.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Key Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {posting.key_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flags */}
            {posting?.red_flags && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-semibold">Red Flags</h3>
                </div>
                <p className="mt-2 text-red-700">{posting.red_flags}</p>
              </div>
            )}

            {/* Company Info */}
            {company?.description && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">About {company.name}</h3>
                <p className="text-gray-600 dark:text-gray-400">{company.description}</p>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notes</h3>
                {!editingNotes && (
                  <button
                    onClick={() => {
                      setNotes(data.notes || '')
                      setEditingNotes(true)
                    }}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    {data.notes ? 'Edit' : 'Add Notes'}
                  </button>
                )}
              </div>

              {editingNotes ? (
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Add your notes about this opportunity..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      disabled={updating}
                      className="flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : data.notes ? (
                <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">{data.notes}</p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
              )}
            </div>

            {/* Communications */}
            {data.communications.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                  Communications ({data.communications.length})
                </h3>
                <div className="space-y-2">
                  {data.communications.slice(0, 5).map((comm) => (
                    <div
                      key={comm.id}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                    >
                      <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {comm.comm_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(comm.occurred_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{comm.subject}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Closed Reason Picker Modal */}
        {showClosedReasonPicker && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/60" onClick={() => setShowClosedReasonPicker(false)} />
            <div className="relative rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Why are you closing this?</h3>
              <div className="space-y-2">
                {ALL_CLOSED_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleClosedWithReason(reason)}
                    disabled={updating}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
                  >
                    {CLOSED_REASON_LABELS[reason]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowClosedReasonPicker(false)}
                className="mt-4 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Apply Modal */}
        {showApplyModal && (
          <ApplyModal
            opportunityId={opportunityId}
            companyName={company?.name}
            roleName={posting?.role || data.title}
            onClose={() => setShowApplyModal(false)}
            onApply={handleApplyWithDetails}
          />
        )}
      </div>
    </div>
  )
}
