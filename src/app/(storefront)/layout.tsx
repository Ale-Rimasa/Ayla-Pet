import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { getMaintenanceConfig } from '@/lib/db/site-settings'
import { isAdmin } from '@/lib/auth'
import { MaintenanceScreen } from './_components/MaintenanceScreen'

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { enabled: maintenanceEnabled } = await getMaintenanceConfig()

  // Modo mantenimiento: el storefront se bloquea para el público, pero el admin
  // sigue navegando con normalidad (puede trabajar/probar en producción).
  const adminBypass = maintenanceEnabled ? await isAdmin() : false

  if (maintenanceEnabled && !adminBypass) {
    return <MaintenanceScreen />
  }

  return (
    <div className="flex min-h-screen flex-col">
      {maintenanceEnabled && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          Modo mantenimiento activo — solo vos (admin) ves la tienda. Los clientes ven la pantalla de mantenimiento.
        </div>
      )}
      <Navbar />
      <CartDrawer />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
