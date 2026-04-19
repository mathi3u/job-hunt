import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handlePreflight, setCors } from './_lib/cors'
import { recoverJson } from './_lib/json'
import { getAnthropicClient } from './_lib/anthropic'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)

  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pageTitle, pageText, url, portal } = req.body

    const anthropic = getAnthropicClient()

    const truncatedText = pageText.length > 15000
      ? pageText.substring(0, 15000) + '\n[Content truncated...]'
      : pageText

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
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

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    const titleParts = pageTitle.split(' - ')
    const fallback = {
      role: titleParts[0] || '',
      company: titleParts[1] || '',
      location: '',
      tldr: 'AI extraction failed - please fill manually',
      job_content: ''
    }

    const extractedData = recoverJson(responseText, fallback)

    extractedData.url = url
    extractedData.portal = portal

    res.status(200).json(extractedData)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
