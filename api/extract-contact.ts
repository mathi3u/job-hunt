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
    const { pageTitle, pageText, url, userProfile } = req.body

    const anthropic = getAnthropicClient()

    const truncatedText = pageText.length > 15000
      ? pageText.substring(0, 15000) + '\n[Content truncated...]'
      : pageText

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

    const nameParts = pageTitle.split(' | ')
    const fallback = {
      name: nameParts[0] || '',
      role: '',
      company: '',
      summary: 'AI extraction failed - please fill manually',
      outreach_message: { subject: '', body: '' }
    }

    const extractedData = recoverJson(responseText, fallback)

    extractedData.url = url

    res.status(200).json(extractedData)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
