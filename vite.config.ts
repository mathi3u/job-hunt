import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import Anthropic from '@anthropic-ai/sdk'
import path from 'path'

// Simple API plugin for extension to save jobs
function apiPlugin(): PluginOption {
  let env: Record<string, string> = {}
  let anthropic: Anthropic | null = null

  return {
    name: 'api-plugin',
    configureServer(server) {
      // Load env variables
      env = loadEnv('development', process.cwd(), '')

      // Initialize Anthropic client if API key is available
      if (env.ANTHROPIC_API_KEY) {
        anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
        console.log('Anthropic API initialized')
      } else {
        console.warn('ANTHROPIC_API_KEY not found - AI extraction will not work')
      }

      // AI extraction endpoint
      server.middlewares.use('/api/extract', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { pageTitle, pageText, url, portal } = JSON.parse(body)

              if (!anthropic) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Anthropic API not configured. Add ANTHROPIC_API_KEY to .env.local' }))
                return
              }

              // Truncate page text to stay under rate limits
              // LinkedIn pages have lots of boilerplate - 15k chars is plenty for job content
              const truncatedText = pageText.length > 15000
                ? pageText.substring(0, 15000) + '\n[Content truncated...]'
                : pageText

              console.log('Extracting job info with AI...')
              console.log('Page title:', pageTitle)
              console.log('Text length:', truncatedText.length)

              const message = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',  // Faster, cheaper, sufficient for extraction
                max_tokens: 4096,
                messages: [{
                  role: 'user',
                  content: `Extract job posting information from this page content. Return ONLY valid JSON, no markdown.

Page Title: ${pageTitle}
URL: ${url}
Source: ${portal}

Page Content:
${truncatedText}

Extract and return this JSON structure (use empty string or empty array if not found):
{
  "role": "job title",
  "company": "company name",
  "location": "location (city, state/country, remote/hybrid/onsite status)",

  "tldr": "2-3 sentence executive summary: what the role is, who it's for, and why someone should apply",

  "responsibilities": "bullet-point list of main day-to-day responsibilities and what you'll be doing",

  "skills_requirements": "bullet-point list of required and nice-to-have skills, qualifications, experience",

  "company_info": "summary of what the company does, their mission, culture, team size, funding stage if mentioned",

  "recruitment_process": "interview process steps if mentioned (e.g., 'Phone screen → Technical → Onsite → Offer')",

  "date_posted": "exact date or relative time when posted (e.g., '2 days ago', 'January 10, 2025'). This is CRITICAL - look for 'Posted X ago', 'Reposted', dates near the job title",

  "salary_range": "compensation/salary range if mentioned",

  "experience_level": "junior/mid/senior/staff/lead/principal based on requirements",

  "key_skills": ["top 5-7 technical skills or tools mentioned"],

  "hiring_team": "recruiter, hiring manager, or team lead names if mentioned",

  "red_flags": "any concerning signals (e.g., unrealistic requirements, low pay for role, vague responsibilities)",

  "job_content": "a condensed version of the job description (max 2000 chars) - keep key details, remove boilerplate"
}

IMPORTANT: Keep responses concise. For text fields, summarize rather than copy verbatim. Max 500 chars per field except job_content.`
                }]
              })

              // Parse the response
              const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : ''

              console.log('AI response:', responseText.substring(0, 200))

              // Try to parse JSON from response
              let extractedData
              try {
                // Remove any markdown code blocks if present
                let jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

                // If response was truncated, try to fix common issues
                if (!jsonStr.endsWith('}')) {
                  // Find last complete field and close the JSON
                  const lastQuote = jsonStr.lastIndexOf('"')
                  if (lastQuote > 0) {
                    // Check if we're in the middle of a value
                    const afterLastQuote = jsonStr.substring(lastQuote + 1)
                    if (afterLastQuote.includes(':')) {
                      // We're in a key, truncate to last complete field
                      jsonStr = jsonStr.substring(0, lastQuote)
                      const lastComma = jsonStr.lastIndexOf(',')
                      if (lastComma > 0) {
                        jsonStr = jsonStr.substring(0, lastComma) + '}'
                      }
                    } else {
                      // We're in a value, close it
                      jsonStr = jsonStr + '"}'
                    }
                  }
                }

                extractedData = JSON.parse(jsonStr)
              } catch (parseErr) {
                console.error('Failed to parse AI response as JSON:', parseErr)
                console.error('Response text:', responseText.substring(0, 500))

                // Return partial data from page title as fallback
                const titleParts = pageTitle.split(' - ')
                extractedData = {
                  role: titleParts[0] || '',
                  company: titleParts[1] || '',
                  location: '',
                  tldr: 'AI extraction failed - please fill manually',
                  job_content: ''
                }
              }

              // Add URL and portal
              extractedData.url = url
              extractedData.portal = portal

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(extractedData))

            } catch (err) {
              console.error('AI extraction error:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: (err as Error).message }))
            }
          })
          return
        }

        next()
      })

      // Contact extraction endpoint (AI-powered)
      server.middlewares.use('/api/extract-contact', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { pageTitle, pageText, url, userProfile } = JSON.parse(body)

              if (!anthropic) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Anthropic API not configured' }))
                return
              }

              // Truncate page text
              const truncatedText = pageText.length > 15000
                ? pageText.substring(0, 15000) + '\n[Content truncated...]'
                : pageText

              console.log('Extracting contact info with AI...')

              // Build user context for personalization
              let userContext = ''
              if (userProfile && (userProfile.name || userProfile.background)) {
                userContext = `
YOUR BACKGROUND (the person reaching out):
- Name: ${userProfile.name || 'Not provided'}
- Current Role: ${userProfile.role || 'Not provided'}
- Company: ${userProfile.company || 'Not provided'}
- Background: ${userProfile.background || 'Not provided'}
`
              }

              const message = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 4096,
                messages: [{
                  role: 'user',
                  content: `Extract professional profile information from this LinkedIn page and generate a personalized outreach message.

Page Title: ${pageTitle}
URL: ${url}

${userContext}

Page Content:
${truncatedText}

IMPORTANT EXTRACTION TIPS:
- The page title often follows format: "Name - Role - Company | LinkedIn"
- Look for the person's headline near the top (usually describes their current role)
- Current company is often mentioned in their headline or under "Experience"
- If you see "at [Company]" in their headline, that's their current company
- Look for job titles like CEO, Founder, Engineer, Manager, etc.

Extract and return this JSON structure:
{
  "name": "full name of the person (REQUIRED - extract from page title or h1)",
  "role": "current job title/headline (look in page title, headline, or first experience entry)",
  "company": "current company name (look in page title, headline 'at Company', or first experience entry)",
  "location": "location if visible",
  "email": "email if visible (rare)",
  "summary": "2-3 sentence summary of their background, experience, and expertise",

  "commonalities": [
    "List 3-5 potential commonalities or connection points based on their profile and the user's background (shared industries, skills, interests, education, career paths, etc.)"
  ],

  "outreach_message": {
    "subject": "Short, personalized subject line for LinkedIn message or email",
    "body": "Write a warm, professional outreach message (150-200 words) that:
      1. Opens with a specific observation about their work/background
      2. Mentions 1-2 genuine commonalities or reasons for reaching out
      3. Shows you've done your research (reference something specific)
      4. Asks for a brief chat or advice (not a job ask directly)
      5. Ends with a clear but low-pressure CTA

      Keep it conversational and authentic - avoid generic networking language."
  },

  "talking_points": [
    "3-5 specific questions or topics you could discuss based on their expertise and your interests"
  ],

  "relationship_type": "suggested relationship type: 'potential_referral', 'industry_peer', 'hiring_manager', 'recruiter', 'mentor', 'alumni'"
}

Return ONLY valid JSON, no markdown. Do NOT return empty strings for name/role/company - extract from the available content.`
                }]
              })

              const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : ''

              let extractedData
              try {
                let jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                extractedData = JSON.parse(jsonStr)
              } catch (parseErr) {
                console.error('Failed to parse AI response:', parseErr)
                // Fallback
                const nameParts = pageTitle.split(' | ')
                extractedData = {
                  name: nameParts[0] || '',
                  role: '',
                  company: '',
                  summary: 'AI extraction failed - please fill manually',
                  outreach_message: { subject: '', body: '' }
                }
              }

              extractedData.url = url
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(extractedData))

            } catch (err) {
              console.error('Contact extraction error:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: (err as Error).message }))
            }
          })
          return
        }

        next()
      })

      // Save contact endpoint
      server.middlewares.use('/api/contacts', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const contactData = JSON.parse(body)

              const supabaseUrl = env.VITE_SUPABASE_URL
              const supabaseKey = env.VITE_SUPABASE_ANON_KEY

              if (!supabaseUrl || !supabaseKey) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Supabase not configured' }))
                return
              }

              const headers = {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=representation'
              }

              console.log('Saving contact:', contactData.name)

              // 1. Find or create company if provided
              let companyId: string | null = null
              if (contactData.company) {
                const companySearch = await fetch(
                  `${supabaseUrl}/rest/v1/companies?name=ilike.${encodeURIComponent(contactData.company)}&limit=1`,
                  { headers }
                )
                const existingCompanies = await companySearch.json() as Array<{id: string}>

                if (existingCompanies.length > 0) {
                  companyId = existingCompanies[0].id
                } else {
                  const companyRes = await fetch(`${supabaseUrl}/rest/v1/companies`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: contactData.company })
                  })
                  if (companyRes.ok) {
                    const newCompany = await companyRes.json() as Array<{id: string}>
                    companyId = newCompany[0]?.id
                  }
                }
              }

              // 2. Check for existing contact by LinkedIn URL
              if (contactData.linkedin_url) {
                const existingContact = await fetch(
                  `${supabaseUrl}/rest/v1/contacts?linkedin_url=eq.${encodeURIComponent(contactData.linkedin_url)}&limit=1`,
                  { headers }
                )
                const existing = await existingContact.json() as Array<{id: string; name: string}>
                if (existing.length > 0) {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({
                    success: true,
                    contact_id: existing[0].id,
                    is_existing: true,
                    message: `Contact "${existing[0].name}" already exists`
                  }))
                  return
                }
              }

              // 3. Create contact
              const contactPayload = {
                name: contactData.name,
                role: contactData.role || null,
                email: contactData.email || null,
                linkedin_url: contactData.linkedin_url || null,
                company_id: companyId,
                relationship: contactData.relationship || null,
                notes: contactData.notes || null
              }

              const contactRes = await fetch(`${supabaseUrl}/rest/v1/contacts`, {
                method: 'POST',
                headers,
                body: JSON.stringify(contactPayload)
              })

              if (!contactRes.ok) {
                const error = await contactRes.text()
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to save contact: ' + error }))
                return
              }

              const contact = await contactRes.json() as Array<{id: string}>
              console.log('Contact saved:', contact[0]?.id)

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                contact_id: contact[0]?.id,
                company_id: companyId
              }))

            } catch (err) {
              console.error('Save contact error:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: (err as Error).message }))
            }
          })
          return
        }

        next()
      })

      // Duplicate check endpoint
      server.middlewares.use('/api/check-duplicate', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { url, company, role } = JSON.parse(body)

              const supabaseUrl = env.VITE_SUPABASE_URL
              const supabaseKey = env.VITE_SUPABASE_ANON_KEY

              if (!supabaseUrl || !supabaseKey) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Supabase not configured' }))
                return
              }

              const headers = {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }

              // Check by URL first (exact match)
              if (url) {
                const urlCheck = await fetch(
                  `${supabaseUrl}/rest/v1/job_postings?url=eq.${encodeURIComponent(url)}&select=id,opportunity_id,role,opportunities(status)`,
                  { headers }
                )
                const urlMatches = await urlCheck.json() as Array<{id: string; opportunity_id: string; role: string; opportunities?: {status: string}}>

                if (urlMatches.length > 0) {
                  const match = urlMatches[0]
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({
                    isDuplicate: true,
                    matchType: 'url',
                    existingJob: {
                      id: match.id,
                      opportunity_id: match.opportunity_id,
                      role: match.role,
                      status: match.opportunities?.status || 'unknown'
                    }
                  }))
                  return
                }
              }

              // Check by company + role (fuzzy match)
              if (company && role) {
                const companyCheck = await fetch(
                  `${supabaseUrl}/rest/v1/companies?name=ilike.${encodeURIComponent(company)}&select=id,name`,
                  { headers }
                )
                const companies = await companyCheck.json() as Array<{id: string; name: string}>

                if (companies.length > 0) {
                  const companyId = companies[0].id
                  const roleCheck = await fetch(
                    `${supabaseUrl}/rest/v1/job_postings?company_id=eq.${companyId}&role=ilike.${encodeURIComponent(role)}&select=id,role,opportunity_id,opportunities(status)`,
                    { headers }
                  )
                  const roleMatches = await roleCheck.json() as Array<{id: string; role: string; opportunity_id: string; opportunities?: {status: string}}>

                  if (roleMatches.length > 0) {
                    const match = roleMatches[0]
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({
                      isDuplicate: true,
                      matchType: 'company_role',
                      existingJob: {
                        id: match.id,
                        opportunity_id: match.opportunity_id,
                        role: match.role,
                        company: companies[0].name,
                        status: match.opportunities?.status || 'unknown'
                      }
                    }))
                    return
                  }
                }
              }

              // No duplicate found
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ isDuplicate: false }))

            } catch (err) {
              console.error('Duplicate check error:', err)
              res.statusCode = 500
              res.end(JSON.stringify({ error: (err as Error).message }))
            }
          })
          return
        }

        next()
      })

      server.middlewares.use('/api/jobs', async (req, res, next) => {
        // Handle CORS for extension
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const jobData = JSON.parse(body)

              // Get Supabase credentials from env
              const supabaseUrl = env.VITE_SUPABASE_URL
              const supabaseKey = env.VITE_SUPABASE_ANON_KEY

              if (!supabaseUrl || !supabaseKey) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Supabase not configured' }))
                return
              }

              const headers = {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=representation'
              }

              // Parse relative date strings like "3 days ago" to actual dates
              function parseRelativeDate(dateStr: string): string | null {
                if (!dateStr || dateStr.trim() === '') return null

                const now = new Date()
                const lower = dateStr.toLowerCase()

                const match = lower.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/)
                if (match) {
                  const num = parseInt(match[1])
                  const unit = match[2]
                  const date = new Date(now)

                  if (unit === 'hour') date.setHours(date.getHours() - num)
                  else if (unit === 'day') date.setDate(date.getDate() - num)
                  else if (unit === 'week') date.setDate(date.getDate() - num * 7)
                  else if (unit === 'month') date.setMonth(date.getMonth() - num)

                  return date.toISOString().split('T')[0]
                }

                if (lower.includes('today') || lower.includes('just now')) {
                  return now.toISOString().split('T')[0]
                }

                if (lower.includes('yesterday')) {
                  const date = new Date(now)
                  date.setDate(date.getDate() - 1)
                  return date.toISOString().split('T')[0]
                }

                const parsed = new Date(dateStr)
                if (!isNaN(parsed.getTime())) {
                  return parsed.toISOString().split('T')[0]
                }

                return null
              }

              // ============================================================
              // NEW SCHEMA: Company → Opportunity → Job Posting
              // ============================================================

              console.log('Creating job with new schema...')
              console.log('Company:', jobData.company)
              console.log('Role:', jobData.role)

              // 1. Find or create Company
              let companyId: string | null = null

              if (jobData.company) {
                // Check if company exists
                const companySearch = await fetch(
                  `${supabaseUrl}/rest/v1/companies?name=eq.${encodeURIComponent(jobData.company)}&limit=1`,
                  { headers }
                )
                const existingCompanies = await companySearch.json() as Array<{id: string}>

                if (existingCompanies.length > 0) {
                  companyId = existingCompanies[0].id
                  console.log('Found existing company:', companyId)
                } else {
                  // Create new company
                  const companyRes = await fetch(`${supabaseUrl}/rest/v1/companies`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      name: jobData.company,
                      description: jobData.company_info || null
                    })
                  })

                  if (companyRes.ok) {
                    const newCompany = await companyRes.json() as Array<{id: string}>
                    companyId = newCompany[0]?.id
                    console.log('Created new company:', companyId)
                  }
                }
              }

              // 2. Create Opportunity
              const opportunityRes = await fetch(`${supabaseUrl}/rest/v1/opportunities`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  company_id: companyId,
                  title: jobData.role || null,
                  status: 'identified',
                  source: 'job_board',
                  source_detail: jobData.portal || null
                })
              })

              if (!opportunityRes.ok) {
                const error = await opportunityRes.text()
                console.error('Failed to create opportunity:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to create opportunity: ' + error }))
                return
              }

              const opportunity = await opportunityRes.json() as Array<{id: string}>
              const opportunityId = opportunity[0]?.id
              console.log('Created opportunity:', opportunityId)

              // 3. Create Job Posting
              const postingData: Record<string, unknown> = {
                opportunity_id: opportunityId,
                company_id: companyId,
                role: jobData.role || null,
                url: jobData.url || null,
                portal: jobData.portal || null,
                posted_date: parseRelativeDate(jobData.date_posted),
                location: jobData.location || null,
                tldr: jobData.tldr || null,
                responsibilities: jobData.responsibilities || null,
                skills_requirements: jobData.skills_requirements || null,
                recruitment_process: jobData.recruitment_process || null,
                salary_range: jobData.salary_range || null,
                experience_level: jobData.experience_level || null,
                key_skills: jobData.key_skills || null,
                red_flags: jobData.red_flags || null,
                job_content: jobData.job_content || null
              }

              // Only include company_url if provided (avoids schema cache issues)
              if (jobData.company_url) {
                postingData.company_url = jobData.company_url
              }

              const postingRes = await fetch(`${supabaseUrl}/rest/v1/job_postings`, {
                method: 'POST',
                headers,
                body: JSON.stringify(postingData)
              })

              if (!postingRes.ok) {
                const error = await postingRes.text()
                console.error('Failed to create job posting:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to create job posting: ' + error }))
                return
              }

              const posting = await postingRes.json() as Array<{id: string}>
              console.log('Created job posting:', posting[0]?.id)

              // Return the full result
              const result = {
                success: true,
                company_id: companyId,
                opportunity_id: opportunityId,
                posting_id: posting[0]?.id
              }

              console.log('Job saved successfully:', result)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: (err as Error).message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
