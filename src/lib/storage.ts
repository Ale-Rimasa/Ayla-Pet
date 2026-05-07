import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadImage(
  bucket: string,
  path: string,
  file: File | Blob
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })

    if (error) {
      return { ok: false, error: error.message }
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return { ok: true, url: data.publicUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

export async function deleteImage(
  bucket: string,
  path: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
