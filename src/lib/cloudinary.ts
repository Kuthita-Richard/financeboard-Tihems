import { v2 as cloudinary } from 'cloudinary'
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})
export async function uploadToCloudinary(file: File, publicId: string): Promise<{ url: string }> {
  if (!process.env.CLOUDINARY_CLOUD_NAME)
    throw new Error('Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env.local')
  const buffer = await file.arrayBuffer()
  const base64 = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`
  const result = await cloudinary.uploader.upload(base64, {
    public_id: `tihems/${publicId}`, overwrite: true, invalidate: true, resource_type: 'image',
  })
  return { url: result.secure_url }
}
