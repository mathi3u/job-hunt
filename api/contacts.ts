import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handlePreflight } from './_lib/cors'

interface ContactRequest {
  name: string
  role?: string
  email?: string
  linkedin_url?: string
  company?: string
  relationship?: string
  notes?: string
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
    const body = req.body as ContactRequest
    const { name, role, email, linkedin_url, company, relationship, notes } = body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const sb = supabaseHeaders()

    // Check if company exists or create it
    let companyId: string

    if (company) {
      const companyCheckRes = await fetch(
        `${sb.base}/rest/v1/companies?name=ilike.${encodeURIComponent(company)}&select=id`,
        { method: 'GET', headers: sb.headers }
      )

      if (!companyCheckRes.ok) {
        throw new Error(`Failed to check company: ${companyCheckRes.statusText}`)
      }

      const companies = await companyCheckRes.json()

      if (companies.length > 0) {
        companyId = companies[0].id
      } else {
        const createCompanyRes = await fetch(`${sb.base}/rest/v1/companies`, {
          method: 'POST',
          headers: sb.headers,
          body: JSON.stringify({ name: company }),
        })

        if (!createCompanyRes.ok) {
          throw new Error(`Failed to create company: ${createCompanyRes.statusText}`)
        }

        const created = await createCompanyRes.json()
        companyId = created[0]?.id
      }
    }

    // Check if contact already exists by linkedin_url
    if (linkedin_url) {
      const existingCheckRes = await fetch(
        `${sb.base}/rest/v1/contacts?linkedin_url=eq.${encodeURIComponent(linkedin_url)}&select=id,name`,
        { method: 'GET', headers: sb.headers }
      )

      if (!existingCheckRes.ok) {
        throw new Error(`Failed to check existing contact: ${existingCheckRes.statusText}`)
      }

      const existing = await existingCheckRes.json()

      if (existing.length > 0) {
        return res.status(200).json({
          success: true,
          contact_id: existing[0].id,
          is_existing: true,
          message: `Contact "${existing[0].name}" already exists`,
        })
      }
    }

    // Create contact
    const contactPayload: Record<string, unknown> = {
      name,
      ...(role && { role }),
      ...(email && { email }),
      ...(linkedin_url && { linkedin_url }),
      ...(companyId && { company_id: companyId }),
      ...(relationship && { relationship }),
      ...(notes && { notes }),
    }

    const createContactRes = await fetch(`${sb.base}/rest/v1/contacts`, {
      method: 'POST',
      headers: sb.headers,
      body: JSON.stringify(contactPayload),
    })

    if (!createContactRes.ok) {
      throw new Error(`Failed to create contact: ${createContactRes.statusText}`)
    }

    const contactCreated = await createContactRes.json()
    const contactId = contactCreated[0]?.id

    return res.status(201).json({
      success: true,
      contact_id: contactId,
      ...(companyId && { company_id: companyId }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
