import { GoogleGenAI } from '@google/genai'

/**
 * Generates a written performance summary via Google Gemini's free tier.
 * Server-side only — never call this from a client component.
 *
 * Model is configurable via GEMINI_MODEL (defaults to gemini-3.6-flash)
 * specifically because Gemini model IDs get retired on a recurring
 * schedule — gemini-2.5-flash itself stopped working for exactly this
 * reason. Pinning the fallback in one place, with the override available
 * via an env var, means the next retirement is a config change instead of
 * a code change and redeploy.
 */
const DEFAULT_MODEL = 'gemini-3.6-flash'

export interface InsightPoint { text: string; severity: 'critical' | 'warning' | 'positive' | 'neutral' }

export async function generateInsights(dataSummary: string, orgName: string): Promise<InsightPoint[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Get a free key at aistudio.google.com and add it to your environment variables.')
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey })

  const prompt = `You are a skeptical, critical data analyst reviewing ${orgName}'s performance data — not a
cheerleader summarizing highlights. Your job is to find what's actually wrong or at risk, not to describe the
data neutrally. Be specific and quantitative — name the exact dimension, the exact gap, the exact percentage.
Never write vague filler like "performance was mixed" or "there's room for improvement" — say precisely which
scheme/hospital/department/rep is underperforming and by how much, and why that matters.

Write 4-7 short, punchy bullet points, each one a single sharp observation or a specific, actionable
recommendation — not a summary sentence. At least one point must directly call out the single worst-performing
dimension by name with its actual numbers. At least one point must be a concrete recommendation, not just an
observation. Skip anything obvious or already implied by another point — no restating raw numbers verbatim,
interpret them.

For each point, classify its severity:
- "critical": something meaningfully below target that needs attention now
- "warning": below target or trending wrong, but not urgent
- "positive": meaningfully exceeding target — a real strength, not routine performance
- "neutral": context, a recommendation, or on-target performance

Respond with ONLY a JSON array, no markdown code fences, no other text, in this exact shape:
[{"text": "...", "severity": "critical"}, ...]

Performance data:
${dataSummary}`

  let response
  try {
    response = await ai.models.generateContent({
      model, contents: prompt,
      config: { responseMimeType: 'application/json' },
    })
  } catch (e) {
    // The SDK throws with the raw Gemini API error JSON as the message
    // (e.g. `{"error":{"code":404,"message":"...","status":"NOT_FOUND"}}`)
    // — that's exactly what was leaking straight through to the user
    // before this catch existed. Parse it into something readable, and
    // give an actionable message specifically for the "model retired"
    // case, since that's the one most likely to recur.
    const raw = e instanceof Error ? e.message : String(e)
    let apiMessage = raw
    let isNotFound = false
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.error?.message) apiMessage = parsed.error.message
      if (parsed?.error?.status === 'NOT_FOUND' || parsed?.error?.code === 404) isNotFound = true
    } catch {
      // Not JSON — raw already holds the best message we have.
      isNotFound = /no longer available|not found/i.test(raw)
    }

    if (isNotFound) {
      throw new Error(
        `AI Insights model "${model}" is no longer available (${apiMessage}). ` +
        `Set GEMINI_MODEL to a current model in your environment variables and redeploy — see ` +
        `https://ai.google.dev/gemini-api/docs/models for the current list.`
      )
    }
    throw new Error(`AI Insights request failed: ${apiMessage}`)
  }

  const text = response.text
  if (!text) throw new Error('Gemini returned an empty response.')

  try {
    const parsed = JSON.parse(text.trim())
    if (!Array.isArray(parsed)) throw new Error('not an array')
    return parsed
      .filter((p): p is { text: string; severity: string } => typeof p?.text === 'string')
      .map(p => ({
        text: p.text,
        severity: (['critical', 'warning', 'positive', 'neutral'].includes(p.severity) ? p.severity : 'neutral') as InsightPoint['severity'],
      }))
  } catch {
    // Structured output occasionally still wraps in a markdown fence despite
    // the responseMimeType request — one fallback attempt before giving up
    // and surfacing the raw text as a single neutral point rather than
    // failing the whole request.
    const stripped = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '')
    try {
      const parsed = JSON.parse(stripped)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p): p is { text: string; severity: string } => typeof p?.text === 'string')
          .map(p => ({
            text: p.text,
            severity: (['critical', 'warning', 'positive', 'neutral'].includes(p.severity) ? p.severity : 'neutral') as InsightPoint['severity'],
          }))
      }
    } catch { /* fall through to the raw-text fallback below */ }
    return [{ text, severity: 'neutral' }]
  }
}
