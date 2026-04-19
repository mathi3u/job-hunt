import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handlePreflight } from './_lib/cors'

interface CheckDuplicateRequest {
  url?: string
  company?: string
  role?: string
}

interface ExistingJob {
  id: string
  opportunity_id: string
  role: string
  status?: string
  company?: string
}

interface DuplicateResponse {
  isDuplicate: boolean
  matchType?: 'url' | 'company_role'
  existingJob?: ExistingJob
}

function supabaseHeaders() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return {
    base: url,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = req.body as CheckDuplicateRequest
    const { url, company, role } = body

    const sb = supabaseHeaders()

    // Check by URL
    if (url) {
      const urlCheckRes = await fetch(
        `${sb.base}/rest/v1/job_postings?url=eq.${encodeURIComponent(url)}&select=id,opportunity_id,role,opportunities(status)`,
        { method: 'GET', headers: sb.headers }
      )

      if (!urlCheckRes.ok) {
        throw new Error(`Failed to check URL duplicate: ${urlCheckRes.statusText}`)
      }

      const results = await urlCheckRes.json()

      if (results.length > 0) {
        const match = results[0]
        const opportunityData = Array.isArray(match.opportunities)
          ? match.opportunities[0]
          : match.opportunities

        const response: DuplicateResponse = {
          isDuplicate: true,
          matchType: 'url',
          existingJob: {
            id: match.id,
            opportunity_id: match.opportunity_id,
            role: match.role,
            status: opportunityData?.status,
          },
        }
        return res.status(200).json(response)
      }
    }

    // Check by company + role
    if (company && role) {
      const companyCheckRes = await fetch(
        `${sb.base}/rest/v1/companies?name=ilike.${encodeURIComponent(company)}&select=id`,
        { method: 'GET', headers: sb.headers }
      )

      if (!companyCheckRes.ok) {
        throw new Error(`Failed to check company: ${companyCheckRes.statusText}`)
      }

      const companies = await companyCheckRes.json()

      if (companies.length > 0) {
        const companyId = companies[0].id

        const roleCheckRes = await fetch(
          `${sb.base}/rest/v1/job_postings?company_id=eq.${companyId}&role=ilike.${encodeURIComponent(role)}&select=id,opportunity_id,role,opportunities(status),companies(name)`,
          { method: 'GET', headers: sb.headers }
        )

        if (!roleCheckRes.ok) {
          throw new Error(`Failed to check role duplicate: ${roleCheckRes.statusText}`)
        }

        const results = await roleCheckRes.json()

        if (results.length > 0) {
          const match = results[0]
          const opportunityData = Array.isArray(match.opportunities)
            ? match.opportunities[0]
            : match.opportunities
          const companyData = Array.isArray(match.companies)
            ? match.companies[0]
            : match.companies

          const response: DuplicateResponse = {
            isDuplicate: true,
            matchType: 'company_role',
            existingJob: {
              id: match.id,
              opportunity_id: match.opportunity_id,
              role: match.role,
              status: opportunityData?.status,
              company: companyData?.name,
            },
          }
          return res.status(200).json(response)
        }
      }
    }

    // No duplicate found
    const response: DuplicateResponse = {
      isDuplicate: false,
    }
    return res.status(200).json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
