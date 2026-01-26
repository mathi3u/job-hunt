import { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import type { PipelineItem, OpportunityStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import { OpportunityCard } from './OpportunityCard'

interface OpportunityListProps {
  items: PipelineItem[]
  onView: (item: PipelineItem) => void
  onDelete: (id: string) => void
  onStatusChange?: (id: string, status: OpportunityStatus) => void
  onClose?: (id: string) => void
}

type StatusFilter = OpportunityStatus | 'all' | 'active'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'identified', label: STATUS_LABELS.identified },
  { value: 'researching', label: STATUS_LABELS.researching },
  { value: 'preparing', label: STATUS_LABELS.preparing },
  { value: 'applied', label: STATUS_LABELS.applied },
  { value: 'interviewing', label: STATUS_LABELS.interviewing },
  { value: 'offer', label: STATUS_LABELS.offer },
  { value: 'closed_won', label: STATUS_LABELS.closed_won },
  { value: 'closed_lost', label: STATUS_LABELS.closed_lost },
]

const activeStatuses: OpportunityStatus[] = [
  'identified',
  'researching',
  'preparing',
  'applied',
  'interviewing',
  'offer',
]

export function OpportunityList({ items, onView, onDelete, onStatusChange, onClose }: OpportunityListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  const filteredItems = items.filter((item) => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      search === '' ||
      (item.title?.toLowerCase().includes(searchLower) ?? false) ||
      (item.company_name?.toLowerCase().includes(searchLower) ?? false) ||
      (item.posting_role?.toLowerCase().includes(searchLower) ?? false) ||
      (item.industry?.toLowerCase().includes(searchLower) ?? false)

    let matchesStatus = true
    if (statusFilter === 'active') {
      matchesStatus = activeStatuses.includes(item.status)
    } else if (statusFilter !== 'all') {
      matchesStatus = item.status === statusFilter
    }

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {items.length === 0
              ? 'No opportunities yet. Add your first one!'
              : 'No opportunities match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <OpportunityCard
              key={item.opportunity_id}
              item={item}
              onView={onView}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  )
}
