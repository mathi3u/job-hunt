import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  PipelineItem,
  OpportunityWithDetails,
  OpportunityStatus,
} from '@/types'

export function usePipeline() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('pipeline_overview')
      .select('*')
      .order('priority', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setItems([])
    } else {
      setItems(data as PipelineItem[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  const updateOpportunityStatus = async (id: string, status: OpportunityStatus) => {
    const { error } = await supabase
      .from('opportunities')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    await fetchPipeline()
  }

  const applyToOpportunity = async (
    id: string,
    applicationDetails: {
      resume_url?: string
      cover_letter_url?: string
      source?: string
      source_detail?: string
    }
  ) => {
    const { error } = await supabase
      .from('opportunities')
      .update({
        status: 'applied' as OpportunityStatus,
        ...applicationDetails,
      })
      .eq('id', id)

    if (error) throw error
    await fetchPipeline()
  }

  const updateOpportunityPriority = async (id: string, priority: number) => {
    const { error } = await supabase
      .from('opportunities')
      .update({ priority })
      .eq('id', id)

    if (error) throw error
    await fetchPipeline()
  }

  const deleteOpportunity = async (id: string) => {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)

    if (error) throw error
    await fetchPipeline()
  }

  return {
    items,
    loading,
    error,
    refetch: fetchPipeline,
    updateOpportunityStatus,
    updateOpportunityPriority,
    deleteOpportunity,
    applyToOpportunity,
  }
}

export function useOpportunityDetail(opportunityId: string | null) {
  const [data, setData] = useState<OpportunityWithDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!opportunityId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    // Fetch opportunity with related data
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single()

    if (oppError) {
      setError(oppError.message)
      setLoading(false)
      return
    }

    // Fetch related company
    let company = null
    if (opportunity.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', opportunity.company_id)
        .single()
      company = companyData
    }

    // Fetch job posting
    const { data: jobPosting } = await supabase
      .from('job_postings')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .limit(1)
      .single()

    // Fetch interview process
    const { data: interviewProcess } = await supabase
      .from('interview_processes')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .limit(1)
      .single()

    // Fetch interviews
    let interviews: any[] = []
    if (interviewProcess) {
      const { data: interviewsData } = await supabase
        .from('interviews')
        .select('*')
        .eq('process_id', interviewProcess.id)
        .order('scheduled_at', { ascending: true })
      interviews = interviewsData || []
    }

    // Fetch communications
    const { data: communications } = await supabase
      .from('communications')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('occurred_at', { ascending: false })

    setData({
      ...opportunity,
      company,
      job_posting: jobPosting,
      interview_process: interviewProcess,
      interviews,
      communications: communications || [],
    })
    setLoading(false)
  }, [opportunityId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  return { data, loading, error, refetch: fetchDetail }
}

export function usePipelineStats(items: PipelineItem[]) {
  // Count by status
  const statusCounts = {
    identified: items.filter((i) => i.status === 'identified').length,
    researching: items.filter((i) => i.status === 'researching').length,
    preparing: items.filter((i) => i.status === 'preparing').length,
    applied: items.filter((i) => i.status === 'applied').length,
    interviewing: items.filter((i) => i.status === 'interviewing').length,
    offer: items.filter((i) => i.status === 'offer').length,
    closed_won: items.filter((i) => i.status === 'closed_won').length,
    closed_lost: items.filter((i) => i.status === 'closed_lost').length,
  }

  // Aggregate counts
  const preApplyCount = statusCounts.identified + statusCounts.researching + statusCounts.preparing
  const appliedCount = statusCounts.applied
  const interviewingCount = statusCounts.interviewing
  const offerCount = statusCounts.offer
  const closedCount = statusCounts.closed_won + statusCounts.closed_lost

  const activeCount = preApplyCount + appliedCount + interviewingCount + offerCount
  const totalCount = items.length

  // High priority items (priority 1 or 2)
  const highPriorityCount = items.filter((i) => i.priority <= 2).length

  // Items with upcoming interviews
  const upcomingInterviewCount = items.filter((i) => i.next_interview != null).length

  // Response rate calculation
  const appliedItems = items.filter(
    (i) => i.status === 'applied' || i.status === 'interviewing' || i.status === 'offer' ||
           i.status === 'closed_won' || i.status === 'closed_lost'
  )
  const respondedItems = items.filter(
    (i) => i.status === 'interviewing' || i.status === 'offer' ||
           i.status === 'closed_won' || i.status === 'closed_lost'
  )
  const responseRate = appliedItems.length > 0
    ? Math.round((respondedItems.length / appliedItems.length) * 100)
    : 0

  return {
    statusCounts,
    preApplyCount,
    appliedCount,
    interviewingCount,
    offerCount,
    closedCount,
    activeCount,
    totalCount,
    highPriorityCount,
    upcomingInterviewCount,
    responseRate,
  }
}
