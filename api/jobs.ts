import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handlePreflight } from './_lib/cors'
import { parseRelativeDate } from './_lib/json'

interface JobRequest {
  role: string
  company: string
  company_info?: string
  company_url?: string
  portal: string
  url: string
  date_posted: string
  location?: string
  tldr?: string
  responsibilities?: string
  skills_requirements?: string
  recruitment_process?: string
  salary_range?: string
  experience_level?: string
  key_skills?: string
  red_flags?: string
  job_content: string
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
    const body = req.body as JobRequest
    const {
      role,
      company,
      company_info,
      company_url,
      portal,
      url,
      date_posted,
      location,
      tldr,
      responsibilities,
      skills_requirements,
      recruitment_process,
      salary_range,
      experience_level,
      key_skills,
      red_flags,
      job_content,
    } = body

    if (!role || !company || !portal || !url || !job_content) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const sb = supabaseHeaders()

    // Find or create company by exact name match
    let companyId: string

    const companyCheckRes = await fetch(
      `${sb.base}/rest/v1/companies?name=eq.${encodeURIComponent(company)}&select=id`,
      { method: 'GET', headers: sb.headers }
    )

    if (!companyCheckRes.ok) {
      throw new Error(`Failed to check company: ${companyCheckRes.statusText}`)
    }

    const companies = await companyCheckRes.json()

    if (companies.length > 0) {
      companyId = companies[0].id
    } else {
      const companyPayload: Record<string, unknown> = {
        name: company,
        ...(company_info && { description: company_info }),
        ...(company_url && { website: company_url }),
      }

      const createCompanyRes = await fetch(`${sb.base}/rest/v1/companies`, {
        method: 'POST',
        headers: sb.headers,
        body: JSON.stringify(companyPayload),
      })

      if (!createCompanyRes.ok) {
        throw new Error(`Failed to create company: ${createCompanyRes.statusText}`)
      }

      const created = await createCompanyRes.json()
      companyId = created[0]?.id
    }

    // Create opportunity
    const opportunityPayload = {
      company_id: companyId,
      title: role,
      status: 'identified',
      source: 'job_board',
      source_detail: portal,
    }

    const createOpportunityRes = await fetch(`${sb.base}/rest/v1/opportunities`, {
      method: 'POST',
      headers: sb.headers,
      body: JSON.stringify(opportunityPayload),
    })

    if (!createOpportunityRes.ok) {
      throw new Error(`Failed to create opportunity: ${createOpportunityRes.statusText}`)
    }

    const opportunityCreated = await createOpportunityRes.json()
    const opportunityId = opportunityCreated[0]?.id

    // Create job posting
    const postedDate = parseRelativeDate(date_posted)

    const jobPayload: Record<string, unknown> = {
      opportunity_id: opportunityId,
      company_id: companyId,
      role,
      url,
      portal,
      ...(postedDate && { posted_date: postedDate }),
      ...(location && { location }),
      ...(tldr && { tldr }),
      ...(responsibilities && { responsibilities }),
      ...(skills_requirements && { skills_requirements }),
      ...(recruitment_process && { recruitment_process }),
      ...(salary_range && { salary_range }),
      ...(experience_level && { experience_level }),
      ...(key_skills && { key_skills }),
      ...(red_flags && { red_flags }),
      job_content,
      ...(company_url && { company_url }),
    }

    const createJobRes = await fetch(`${sb.base}/rest/v1/job_postings`, {
      method: 'POST',
      headers: sb.headers,
      body: JSON.stringify(jobPayload),
    })

    if (!createJobRes.ok) {
      throw new Error(`Failed to create job posting: ${createJobRes.statusText}`)
    }

    const jobCreated = await createJobRes.json()
    const postingId = jobCreated[0]?.id

    return res.status(201).json({
      success: true,
      company_id: companyId,
      opportunity_id: opportunityId,
      posting_id: postingId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
