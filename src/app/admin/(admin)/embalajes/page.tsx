import { requireAdmin } from '@/lib/auth'
import { getShippingPackageProfiles } from '@/lib/db/shipping'
import { PackageProfilesPageClient } from '@/components/admin/PackageProfilesPageClient'

export default async function EmbalajesPage() {
  await requireAdmin()
  const profiles = await getShippingPackageProfiles()

  return <PackageProfilesPageClient profiles={profiles} />
}
