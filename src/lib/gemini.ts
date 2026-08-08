import { GoogleGenAI } from '@google/genai'

/**
 * Generates a written performance summary via Google Gemini's free tier.
 * Server-side only — never call this from a client component.
 */
export async function generateInsights(dataSummary: string, orgName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Get a free key at aistudio.google.com and add it to your environment variables.')
  }

  const ai = new GoogleGenAI({ apiKey })

  const prompt = `You are a sales performance analyst writing a short briefing for ${orgName}'s leadership.
Given the performance data below, write 3-5 concise, specific insights — what's driving performance this month,
which dimensions are exceeding or missing target, and one actionable recommendation. Plain prose, no headers,
no markdown formatting, no restating the raw numbers verbatim — interpret them. Keep it under 200 words.

Performance data:
${dataSummary}`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })

  const text = response.text
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}
