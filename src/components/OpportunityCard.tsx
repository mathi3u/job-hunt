import { format } from 'date-fns'
import {
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  Trash2,
  ChevronRight,
  DollarSign,
  Users,
  Clock,
} from 'lucide-react'
import type { PipelineItem, OpportunityStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'

interface OpportunityCardProps {
  item: PipelineItem
  onView: (item: PipelineItem) => void
  onDelete: (id: string) => void
}

function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function PriorityIndicator({ priority }: { priority: number }) {
  const colors = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-blue-500',
    5: 'bg-gray-400',
  }
  return (
    <div
      className={`h-2 w-2 rounded-full ${colors[priority as keyof typeof colors] || colors[3]}`}
      title={`Priority ${priority}`}
    />
  )
}

export function OpportunityCard({ item, onView, onDelete }: OpportunityCardProps) {
  const role = item.posting_role || item.title || 'Untitled Role'
  const company = item.company_name || 'Unknown Company'

  return (
    <div
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onView(item)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <PriorityIndicator priority={item.priority} />
            <h3 className="font-semibold text-gray-900">{role}</h3>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>{company}</span>
            {item.industry && (
              <span className="text-gray-400">({item.industry})</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.opportunity_id)
            }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        {item.salary_range && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{item.salary_range}</span>
          </div>
        )}
        {item.posted_date && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Posted {format(new Date(item.posted_date), 'MMM d')}</span>
          </div>
        )}
        {item.interview_count > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{item.interview_count} interview{item.interview_count !== 1 ? 's' : ''}</span>
          </div>
        )}
        {item.next_interview && (
          <div className="flex items-center gap-1 text-indigo-600">
            <Clock className="h-3.5 w-3.5" />
            <span>Next: {format(new Date(item.next_interview), 'MMM d, h:mm a')}</span>
          </div>
        )}
        {item.comm_count > 0 && (
          <div className="text-xs text-gray-400">
            {item.comm_count} communication{item.comm_count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {item.interview_stage && item.status === 'interviewing' && (
        <div className="mt-2 rounded bg-indigo-50 px-2 py-1 text-sm text-indigo-700">
          Stage: {item.interview_stage.replace('_', ' ')}
        </div>
      )}
    </div>
  )
}
