import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'
import type { OrderReferencePhoto } from '@/types'

type DbRow = Database['public']['Tables']['order_reference_photos']['Row']

function mapPhoto(row: DbRow): OrderReferencePhoto {
  return {
    id: row.id,
    orderId: row.order_id,
    storagePath: row.storage_path,
    displayOrder: row.display_order,
    mimeType: row.mime_type as OrderReferencePhoto['mimeType'],
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  }
}

export async function listOrderReferencePhotos(orderId: string): Promise<OrderReferencePhoto[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('order_reference_photos')
    .select('*')
    .eq('order_id', orderId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data ?? []).map(mapPhoto)
}

export async function countOrderReferencePhotos(orderId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('order_reference_photos')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
  return count ?? 0
}

export async function findOrderPhoto(
  photoId: string,
  orderId: string
): Promise<OrderReferencePhoto | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('order_reference_photos')
    .select('*')
    .eq('id', photoId)
    .eq('order_id', orderId)
    .maybeSingle()
  return data ? mapPhoto(data) : null
}
