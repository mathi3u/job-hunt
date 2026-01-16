import { useState } from 'react'
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
} from 'lucide-react'
import { useOpportunityDetail } from '@/hooks/usePipeline'
import { supabase } from '@/lib/supabase'
import { CVSelector } from '@/components/CVSelector'
import type { OpportunityStatus, InterviewType } from '@/types'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  INTERVIEW_TYPE_LABELS,
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
  'on_hold',
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
  const [updating, setUpdating] = useState(false)

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')

  // Application details editing
  const [editingApplication, setEditingApplication] = useState(false)
  const [applicationDetails, setApplicationDetails] = useState({
    resume_url: '',
    applied_date: '',
    source_detail: '',
  })

  // Add interview form
  const [showAddInterview, setShowAddInterview] = useState(false)
  const [newInterview, setNewInterview] = useState({
    scheduled_at: '',
    interview_type: 'recruiter_screen' as InterviewType,
    location: '',
    prep_notes: '',
  })

  const handleStatusChange = async (newStatus: OpportunityStatus) => {
    setUpdating(true)
    const { error } = await supabase
      .from('opportunities')
      .update({ status: newStatus })
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-8">
          <p className="text-red-600">Failed to load opportunity details</p>
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
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b p-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">
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
              </div>
              {company && (
                <div className="mt-1 flex items-center gap-2 text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{company.name}</span>
                  {company.industry && <span className="text-gray-400">({company.industry})</span>}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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

            {/* TL;DR */}
            {posting?.tldr && (
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="mb-2 font-semibold text-blue-900">Summary</h3>
                <p className="text-blue-800">{posting.tldr}</p>
              </div>
            )}

            {/* Application Details - Show for applied status and beyond */}
            {['applied', 'interviewing', 'offer', 'closed_won', 'closed_lost'].includes(data.status) && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900">Application Details</h3>
                  {!editingApplication && (
                    <button
                      onClick={() => {
                        setApplicationDetails({
                          resume_url: data.resume_url || '',
                          applied_date: data.target_apply_date || '',
                          source_detail: data.source_detail || '',
                        })
                        setEditingApplication(true)
                      }}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                    >
                      <Edit2 className="h-4 w-4" />
                      {data.resume_url || data.target_apply_date || data.source_detail ? 'Edit' : 'Add Details'}
                    </button>
                  )}
                </div>

                {editingApplication ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">
                        Application Date
                      </label>
                      <input
                        type="date"
                        value={applicationDetails.applied_date}
                        onChange={(e) => setApplicationDetails({ ...applicationDetails, applied_date: e.target.value })}
                        className="w-full rounded-md border border-purple-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">
                        How did you apply?
                      </label>
                      <input
                        type="text"
                        value={applicationDetails.source_detail}
                        onChange={(e) => setApplicationDetails({ ...applicationDetails, source_detail: e.target.value })}
                        placeholder="LinkedIn Easy Apply, Company website, Email, Referral..."
                        className="w-full rounded-md border border-purple-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-1">
                        CV/Resume Used
                      </label>
                      <CVSelector
                        value={applicationDetails.resume_url}
                        onChange={(url) => setApplicationDetails({ ...applicationDetails, resume_url: url })}
                      />
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
                        className="rounded-md border border-purple-300 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div>
                      <span className="text-purple-600">Applied:</span>{' '}
                      <span className="text-purple-900 font-medium">
                        {data.target_apply_date
                          ? format(new Date(data.target_apply_date), 'MMM d, yyyy')
                          : 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600">Method:</span>{' '}
                      <span className="text-purple-900 font-medium">
                        {data.source_detail || 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600">CV:</span>{' '}
                      {data.resume_url ? (
                        data.resume_url.startsWith('http') ? (
                          <a
                            href={data.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-700 underline hover:text-purple-900"
                          >
                            View CV
                          </a>
                        ) : (
                          <span className="text-purple-900 font-medium">{data.resume_url}</span>
                        )
                      ) : (
                        <span className="text-purple-900 font-medium">Not set</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interviews Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">
                  Interviews {data.interviews.length > 0 && `(${data.interviews.length})`}
                </h3>
                <button
                  onClick={() => setShowAddInterview(true)}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Schedule Interview
                </button>
              </div>

              {/* Add Interview Form */}
              {showAddInterview && (
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Schedule New Interview</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={newInterview.scheduled_at}
                        onChange={(e) => setNewInterview({ ...newInterview, scheduled_at: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interview Type
                      </label>
                      <select
                        value={newInterview.interview_type}
                        onChange={(e) => setNewInterview({ ...newInterview, interview_type: e.target.value as InterviewType })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {ALL_INTERVIEW_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {INTERVIEW_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location / Link
                      </label>
                      <input
                        type="text"
                        value={newInterview.location}
                        onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })}
                        placeholder="Zoom, Phone, Office..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prep Notes
                      </label>
                      <textarea
                        value={newInterview.prep_notes}
                        onChange={(e) => setNewInterview({ ...newInterview, prep_notes: e.target.value })}
                        placeholder="Topics to review, questions to ask..."
                        rows={2}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                      className="rounded-lg border p-3"
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
                              <div className="text-sm text-gray-500">
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
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                          <span className="font-medium">Prep:</span> {interview.prep_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No interviews scheduled yet.</p>
              )}
            </div>

            {/* Key Skills */}
            {posting?.key_skills && posting.key_skills.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Key Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {posting.key_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
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
                <h3 className="mb-2 font-semibold text-gray-900">About {company.name}</h3>
                <p className="text-gray-600">{company.description}</p>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Notes</h3>
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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : data.notes ? (
                <p className="whitespace-pre-wrap text-gray-600 bg-gray-50 rounded-lg p-3">{data.notes}</p>
              ) : (
                <p className="text-sm text-gray-500">No notes yet.</p>
              )}
            </div>

            {/* Communications */}
            {data.communications.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Communications ({data.communications.length})
                </h3>
                <div className="space-y-2">
                  {data.communications.slice(0, 5).map((comm) => (
                    <div
                      key={comm.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {comm.comm_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comm.occurred_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {comm.subject && (
                          <p className="text-sm text-gray-600">{comm.subject}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
