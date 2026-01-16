export type SourceType = 'linkedin' | 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'generic'

export interface ExtractionResult {
  success: boolean
  needsPaste: boolean
  sourceType: SourceType
  confidence: number // 0-100
  fieldsExtracted: string[]
  data: ExtractedJob
  rawHtml?: string
}

export interface ExtractedJob {
  company: string
  role: string
  location: string
  url: string
  portal: string
  job_content: string
}

const CORS_PROXY = 'https://corsproxy.io/?'

// Sites that block scraping and require paste
const PASTE_REQUIRED_DOMAINS = [
  'linkedin.com',
  'www.linkedin.com',
]

// Sites that usually work well with scraping (for reference)
// greenhouse.io, lever.co, ashbyhq.com, welcometothejungle.com

export function detectSourceType(url: string): { sourceType: SourceType; needsPaste: boolean } {
  try {
    const hostname = new URL(url).hostname.toLowerCase()

    if (PASTE_REQUIRED_DOMAINS.some(d => hostname.includes(d))) {
      return { sourceType: 'linkedin', needsPaste: true }
    }

    if (hostname.includes('greenhouse.io')) {
      return { sourceType: 'greenhouse', needsPaste: false }
    }

    if (hostname.includes('lever.co')) {
      return { sourceType: 'lever', needsPaste: false }
    }

    if (hostname.includes('ashby')) {
      return { sourceType: 'ashby', needsPaste: false }
    }

    if (hostname.includes('workday.com') || hostname.includes('myworkdayjobs.com')) {
      return { sourceType: 'workday', needsPaste: true } // Workday is often blocked
    }

    return { sourceType: 'generic', needsPaste: false }
  } catch {
    return { sourceType: 'generic', needsPaste: false }
  }
}

export function extractPortal(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')

    const portalMap: Record<string, string> = {
      'linkedin.com': 'LinkedIn',
      'indeed.com': 'Indeed',
      'glassdoor.com': 'Glassdoor',
      'lever.co': 'Lever',
      'greenhouse.io': 'Greenhouse',
      'workday.com': 'Workday',
      'myworkdayjobs.com': 'Workday',
      'welcometothejungle.com': 'Welcome to the Jungle',
      'angel.co': 'AngelList',
      'wellfound.com': 'Wellfound',
      'ashbyhq.com': 'Ashby',
      'jobs.ashbyhq.com': 'Ashby',
      'boards.greenhouse.io': 'Greenhouse',
      'jobs.lever.co': 'Lever',
    }

    for (const [domain, name] of Object.entries(portalMap)) {
      if (hostname.includes(domain)) {
        return name
      }
    }

    // For company career pages, extract company name from subdomain or path
    return hostname.split('.')[0]
  } catch {
    return 'Unknown'
  }
}

export async function fetchAndExtractJob(url: string): Promise<ExtractionResult> {
  const { sourceType, needsPaste } = detectSourceType(url)
  const portal = extractPortal(url)

  // If paste is required, return early with minimal data
  if (needsPaste) {
    return {
      success: false,
      needsPaste: true,
      sourceType,
      confidence: 0,
      fieldsExtracted: ['url', 'portal'],
      data: {
        company: '',
        role: '',
        location: '',
        url,
        portal,
        job_content: '',
      },
    }
  }

  try {
    const response = await fetch(CORS_PROXY + encodeURIComponent(url))
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const extracted = parseJobFromHtml(html, url, portal, sourceType)

    // Calculate confidence based on what we extracted
    const { confidence, fieldsExtracted } = calculateConfidence(extracted)

    // If confidence is too low, suggest paste mode
    const lowConfidence = confidence < 40

    return {
      success: !lowConfidence,
      needsPaste: lowConfidence,
      sourceType,
      confidence,
      fieldsExtracted,
      data: extracted,
      rawHtml: html,
    }
  } catch (error) {
    console.error('Failed to fetch job page:', error)
    return {
      success: false,
      needsPaste: true,
      sourceType,
      confidence: 0,
      fieldsExtracted: ['url', 'portal'],
      data: {
        company: '',
        role: '',
        location: '',
        url,
        portal,
        job_content: '',
      },
    }
  }
}

function calculateConfidence(extracted: ExtractedJob): { confidence: number; fieldsExtracted: string[] } {
  const fields: string[] = ['url', 'portal']
  let score = 20 // Base score for having URL and portal

  if (extracted.company && extracted.company.length > 1 && !looksLikeJunk(extracted.company)) {
    fields.push('company')
    score += 25
  }

  if (extracted.role && extracted.role.length > 1 && !looksLikeJunk(extracted.role)) {
    fields.push('role')
    score += 25
  }

  if (extracted.location && extracted.location.length > 1) {
    fields.push('location')
    score += 10
  }

  if (extracted.job_content && extracted.job_content.length > 100) {
    fields.push('job_content')
    score += 20
  }

  return { confidence: Math.min(score, 100), fieldsExtracted: fields }
}

function looksLikeJunk(text: string): boolean {
  const junkPatterns = [
    /sign in/i,
    /log in/i,
    /read more/i,
    /see more/i,
    /click here/i,
    /loading/i,
    /please wait/i,
    /access denied/i,
    /403/,
    /404/,
    /error/i,
  ]

  return junkPatterns.some(pattern => pattern.test(text))
}

function parseJobFromHtml(
  html: string,
  url: string,
  portal: string,
  sourceType: SourceType
): ExtractedJob {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Use source-specific extractors when available
  switch (sourceType) {
    case 'greenhouse':
      return extractGreenhouseJob(doc, url, portal)
    case 'lever':
      return extractLeverJob(doc, url, portal)
    default:
      return extractGenericJob(doc, url, portal)
  }
}

function extractGreenhouseJob(doc: Document, url: string, portal: string): ExtractedJob {
  const company = doc.querySelector('.company-name')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || ''

  const role = doc.querySelector('.app-title')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() || ''

  const location = doc.querySelector('.location')?.textContent?.trim() || ''

  // Get full job description
  const descriptionEl = doc.querySelector('#content') ||
    doc.querySelector('.content') ||
    doc.querySelector('[data-mapped="true"]')

  const job_content = cleanJobContent(descriptionEl?.innerHTML || '')

  return { company, role, location, url, portal, job_content }
}

function extractLeverJob(doc: Document, url: string, portal: string): ExtractedJob {
  const company = doc.querySelector('.main-header-logo img')?.getAttribute('alt') ||
    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || ''

  const role = doc.querySelector('.posting-headline h2')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() || ''

  const location = doc.querySelector('.posting-categories .location')?.textContent?.trim() ||
    doc.querySelector('.workplaceTypes')?.textContent?.trim() || ''

  const descriptionEl = doc.querySelector('.posting-page') ||
    doc.querySelector('[data-qa="job-description"]')

  const job_content = cleanJobContent(descriptionEl?.innerHTML || '')

  return { company, role, location, url, portal, job_content }
}

function extractGenericJob(doc: Document, url: string, portal: string): ExtractedJob {
  // Try multiple strategies for each field
  const title = extractTitle(doc)
  const { company, role } = parseCompanyAndRole(title, doc)
  const location = extractLocation(doc)
  const job_content = extractJobContent(doc)

  return { company, role, location, url, portal, job_content }
}

function extractTitle(doc: Document): string {
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
  if (ogTitle) return ogTitle

  const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
  if (twitterTitle) return twitterTitle

  return doc.title || ''
}

function parseCompanyAndRole(title: string, doc: Document): { company: string; role: string } {
  let company = ''
  let role = ''

  // Try meta tags for company
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')
  if (ogSiteName) {
    company = ogSiteName
  }

  // Try common selectors for job title
  const roleSelectors = [
    'h1.job-title',
    'h1[data-testid="job-title"]',
    '.job-title h1',
    'h1.posting-headline',
    '.job-header h1',
    'h1',
  ]

  for (const selector of roleSelectors) {
    const el = doc.querySelector(selector)
    if (el?.textContent?.trim() && !looksLikeJunk(el.textContent)) {
      role = el.textContent.trim()
      break
    }
  }

  // Parse title if needed
  if (!role && title) {
    const separators = [' at ', ' - ', ' | ', ' — ', ' · ']
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep)
        if (parts.length >= 2) {
          if (sep === ' at ') {
            role = parts[0].trim()
            company = company || parts[1].trim()
          } else {
            role = parts[0].trim()
            company = company || parts[1].trim()
          }
          break
        }
      }
    }

    if (!role) {
      role = title
    }
  }

  // Try company-specific selectors
  if (!company) {
    const companySelectors = ['.company-name', '[data-testid="company-name"]', '.employer-name']
    for (const selector of companySelectors) {
      const el = doc.querySelector(selector)
      if (el?.textContent?.trim()) {
        company = el.textContent.trim()
        break
      }
    }
  }

  return { company, role }
}

function extractLocation(doc: Document): string {
  const locationSelectors = [
    '.job-location',
    '[data-testid="job-location"]',
    '.location',
    '.job-info-location',
    'span[itemprop="jobLocation"]',
    '[itemprop="addressLocality"]',
  ]

  for (const selector of locationSelectors) {
    const el = doc.querySelector(selector)
    if (el?.textContent?.trim()) {
      return el.textContent.trim()
    }
  }

  const geoRegion = doc.querySelector('meta[name="geo.region"]')?.getAttribute('content')
  if (geoRegion) return geoRegion

  return ''
}

function extractJobContent(doc: Document): string {
  // Try common job description containers
  const contentSelectors = [
    '.job-description',
    '[data-testid="job-description"]',
    '.description',
    '#job-description',
    '.posting-description',
    'article',
    '.content',
    'main',
  ]

  for (const selector of contentSelectors) {
    const el = doc.querySelector(selector)
    if (el && el.innerHTML.length > 200) {
      return cleanJobContent(el.innerHTML)
    }
  }

  // Fall back to meta description
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')
  return metaDesc || ''
}

function cleanJobContent(html: string): string {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Remove scripts, styles, and other non-content elements
  const removeSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', '.apply-button', '.share-button']
  removeSelectors.forEach(sel => {
    temp.querySelectorAll(sel).forEach(el => el.remove())
  })

  // Convert to plain text with some formatting preserved
  let text = ''
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName.toLowerCase()

      // Add line breaks for block elements
      if (['p', 'div', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        text += '\n'
      }

      // Add bullet for list items
      if (tag === 'li') {
        text += '• '
      }

      node.childNodes.forEach(walk)

      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        text += '\n'
      }
    }
  }

  walk(temp)

  // Clean up whitespace
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

// Parse pasted content (for LinkedIn and other blocked sites)
export function parseFromPastedContent(
  url: string,
  pastedText: string
): ExtractedJob {
  const portal = extractPortal(url)

  // Try to extract structured data from pasted text
  // LinkedIn pastes often have format like:
  // Job Title
  // Company Name · Location
  // Posted X days ago · X applicants
  // ... description ...

  const lines = pastedText.split('\n').map(l => l.trim()).filter(Boolean)

  let role = ''
  let company = ''
  let location = ''

  if (lines.length > 0) {
    role = lines[0]
  }

  if (lines.length > 1) {
    // Second line often has "Company · Location" or "Company Name"
    const secondLine = lines[1]
    if (secondLine.includes('·')) {
      const parts = secondLine.split('·').map(p => p.trim())
      company = parts[0]
      if (parts.length > 1 && !parts[1].toLowerCase().includes('posted') && !parts[1].toLowerCase().includes('applicant')) {
        location = parts[1]
      }
    } else {
      company = secondLine
    }
  }

  // The rest is job content
  const contentStartIndex = company ? 2 : 1
  const job_content = lines.slice(contentStartIndex).join('\n')

  return {
    company,
    role,
    location,
    url,
    portal,
    job_content,
  }
}
