import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, X } from 'lucide-react'
import { usePipeline } from '@/hooks/usePipeline'
import { usePageTitle } from '@/hooks/usePageTitle'
import { OpportunityList } from '@/components/OpportunityList'
import { OpportunityDetail } from '@/components/OpportunityDetail'
import { ApplyModal } from '@/components/ApplyModal'
import type { PipelineItem, OpportunityStatus, ClosedReason } from '@/types'
import { CLOSED_REASON_LABELS } from '@/types'

export function Pipeline() {
  usePageTitle('Pipeline')
  const { items, loading, error, refetch, deleteOpportunity, updateOpportunityStatus, applyToOpportunity } = usePipeline()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [closedReason, setClosedReason] = useState<ClosedReason>('rejected')
  const [applyingItem, setApplyingItem] = useState<PipelineItem | null>(null)

  // Auto-open opportunity from URL query param (e.g., /pipeline?open=abc123)
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      setSelectedId(openId)
      // Clear the query param so it doesn't persist on refresh
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleView = (item: PipelineItem) => {
    setSelectedId(item.opportunity_id)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this opportunity?')) {
      await deleteOpportunity(id)
    }
  }

  const handleCloseDetail = () => {
    setSelectedId(null)
  }

  const handleStatusChange = async (id: string, status: OpportunityStatus) => {
    // Intercept 'applied' status to open the ApplyModal instead
    if (status === 'applied') {
      const item = items.find((i) => i.opportunity_id === id)
      if (item) {
        setApplyingItem(item)
        return
      }
    }

    try {
      await updateOpportunityStatus(id, status)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleOpenCloseModal = (id: string) => {
    setClosingId(id)
  }

  const handleConfirmClose = async () => {
    if (!closingId) return
    try {
      await updateOpportunityStatus(closingId, 'closed_lost')
      // TODO: Also save the closed_reason to the database
      setClosingId(null)
    } catch (err) {
      console.error('Failed to close opportunity:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        Failed to load pipeline: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline</h2>
          <p className="mt-1 text-gray-600">
            {items.length} opportunit{items.length !== 1 ? 'ies' : 'y'} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <OpportunityList
        items={items}
        onView={handleView}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onClose={handleOpenCloseModal}
      />

      {selectedId && (
        <OpportunityDetail
          opportunityId={selectedId}
          onClose={handleCloseDetail}
          onUpdate={refetch}
        />
      )}

      {/* Apply Modal */}
      {applyingItem && (
        <ApplyModal
          opportunityId={applyingItem.opportunity_id}
          companyName={applyingItem.company_name}
          roleName={applyingItem.posting_role || applyingItem.title}
          onClose={() => setApplyingItem(null)}
          onApply={applyToOpportunity}
        />
      )}

      {/* Close/Decline Modal */}
      {closingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Close Opportunity</h3>
              <button
                onClick={() => setClosingId(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Why are you closing this opportunity?
            </p>

            <div className="space-y-2 mb-6">
              {(Object.entries(CLOSED_REASON_LABELS) as [ClosedReason, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    closedReason === value
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="closedReason"
                    value={value}
                    checked={closedReason === value}
                    onChange={(e) => setClosedReason(e.target.value as ClosedReason)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setClosingId(null)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Close Opportunity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
