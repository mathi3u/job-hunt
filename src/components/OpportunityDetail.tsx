import { format } from 'date-fns'
import {
  X,
  Building2,
  MapPin,
  ExternalLink,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useOpportunityDetail } from '@/hooks/usePipeline'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STAGE_LABELS,
  INTERVIEW_TYPE_LABELS,
} from '@/types'

interface OpportunityDetailProps {
  opportunityId: string
  onClose: () => void
  onUpdate: () => void
}

export function OpportunityDetail({ opportunityId, onClose, onUpdate }: OpportunityDetailProps) {
  const { data, loading, error } = useOpportunityDetail(opportunityId)

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
  const process = data.interview_process

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
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[data.status]}`}>
                  {STATUS_LABELS[data.status]}
                </span>
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

            {/* Interview Process */}
            {process && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Interview Process</h3>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Stage:</span>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-sm text-indigo-800">
                        {STAGE_LABELS[process.stage]}
                      </span>
                    </div>
                    {process.expected_timeline && (
                      <span className="text-sm text-gray-500">
                        Timeline: {process.expected_timeline}
                      </span>
                    )}
                  </div>
                  {process.expected_stages && (
                    <p className="mt-2 text-sm text-gray-600">{process.expected_stages}</p>
                  )}
                </div>
              </div>
            )}

            {/* Interviews */}
            {data.interviews.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  Interviews ({data.interviews.length})
                </h3>
                <div className="space-y-2">
                  {data.interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {interview.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium">
                            {interview.interview_type
                              ? INTERVIEW_TYPE_LABELS[interview.interview_type]
                              : `Round ${interview.round || '?'}`}
                          </div>
                          {interview.scheduled_at && (
                            <div className="text-sm text-gray-500">
                              {format(new Date(interview.scheduled_at), 'MMM d, yyyy h:mm a')}
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
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities & Requirements */}
            <div className="grid gap-4 md:grid-cols-2">
              {posting?.responsibilities && (
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Responsibilities</h3>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {posting.responsibilities}
                  </div>
                </div>
              )}
              {posting?.skills_requirements && (
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Requirements</h3>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {posting.skills_requirements}
                  </div>
                </div>
              )}
            </div>

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

            {/* Notes */}
            {data.notes && (
              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Notes</h3>
                <p className="whitespace-pre-wrap text-gray-600">{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
