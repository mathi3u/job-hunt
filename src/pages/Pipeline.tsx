import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { usePipeline } from '@/hooks/usePipeline'
import { OpportunityList } from '@/components/OpportunityList'
import { OpportunityDetail } from '@/components/OpportunityDetail'
import type { PipelineItem } from '@/types'

export function Pipeline() {
  const { items, loading, error, refetch, deleteOpportunity } = usePipeline()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
      />

      {selectedId && (
        <OpportunityDetail
          opportunityId={selectedId}
          onClose={handleCloseDetail}
          onUpdate={refetch}
        />
      )}
    </div>
  )
}
