/**
 * POST /api/upload
 *
 * Handles file uploads to Vercel Blob storage.
 * Used by Settings → Identity for logo and favicon uploads.
 *
 * Expects multipart/form-data with a 'file' field.
 * Returns JSON: { url: string } on success.
 *
 * Authentication: Admin only (checked via session cookie).
 * File constraints: image types only, max 2MB (enforced in uploadLogoAction).
 */
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file     = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
