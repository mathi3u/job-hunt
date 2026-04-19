export function parseRelativeDate(dateStr: string): string | null {
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

export function recoverJson<T>(text: string, fallback: T): T {
  try {
    // Strip markdown code fences
    let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // If string doesn't end with }, try to close it
    if (!jsonStr.endsWith('}')) {
      const lastQuote = jsonStr.lastIndexOf('"')
      if (lastQuote > 0) {
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

    return JSON.parse(jsonStr)
  } catch {
    return fallback
  }
}
