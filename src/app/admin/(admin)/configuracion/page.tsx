import {
  Store,
  Globe,
  Languages,
  Wrench,
  Download,
  ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  getHeroConfig,
  getStoreInfo,
  getTransferInfo,
  getMaintenanceConfig,
  getBrandingConfig,
} from '@/lib/db/site-settings'
import { HeroSettingsForm } from './_components/HeroSettingsForm'
import { HeroImagesUploader } from './_components/HeroImagesUploader'
import { StoreInfoForm } from './_components/StoreInfoForm'
import { TransferForm } from './_components/TransferForm'
import { MaintenanceToggle } from './_components/MaintenanceToggle'
import { LogoForm } from './_components/LogoForm'

export const metadata = { title: 'Configuración' }

export default async function ConfiguracionPage() {
  const [hero, store, transfer, maintenance, branding] = await Promise.all([
    getHeroConfig(),
    getStoreInfo(),
    getTransferInfo(),
    getMaintenanceConfig(),
    getBrandingConfig(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administrá los ajustes generales de la tienda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Columna principal ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Imágenes del carrusel hero */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-sf-gold" />
                <CardTitle>Imágenes del carrusel</CardTitle>
              </div>
              <CardDescription>
                Hasta 3 imágenes para el hero del home. Se muestran en rotación automática.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <HeroImagesUploader initialImages={hero.images} />
              <Separator />
              <div>
                <p className="text-sm font-medium mb-3">Texto del hero</p>
                <HeroSettingsForm initial={{ title: hero.title, subtitle: hero.subtitle }} />
              </div>
            </CardContent>
          </Card>

          {/* Información de la tienda */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-sf-gold" />
                <CardTitle>Información de la tienda</CardTitle>
              </div>
              <CardDescription>Datos de contacto y presentación pública.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <StoreInfoForm initial={store} />
            </CardContent>
          </Card>

          {/* Medios de pago - Transferencia */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sf-gold" />
                <CardTitle>Transferencia bancaria</CardTitle>
              </div>
              <CardDescription>Datos de la cuenta para pagos por transferencia.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <TransferForm initial={transfer} />
            </CardContent>
          </Card>

          {/* Moneda y zona horaria — disabled, out of scope */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sf-gold" />
                <CardTitle>Moneda y zona horaria</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Moneda</Label>
                  <Input defaultValue="Pesos Argentina (ARS)" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Zona horaria</Label>
                  <Input defaultValue="GMT-03:00 Buenos Aires" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Idioma — disabled, out of scope */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-sf-gold" />
                <CardTitle>Idioma</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Idioma</Label>
                  <Input defaultValue="Español (Español)" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Formato de fecha</Label>
                  <Input defaultValue="DD/MM/YYYY" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mantenimiento */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-sf-gold" />
                <CardTitle>Mantenimiento de la tienda</CardTitle>
              </div>
              <CardDescription>Activá el modo mantenimiento para pausar la tienda.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MaintenanceToggle initial={maintenance.enabled} />
            </CardContent>
          </Card>

        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-6">

          {/* Logo y marca */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-sf-gold" />
                <CardTitle>Logo y marca</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <LogoForm initial={branding} />
            </CardContent>
          </Card>

          {/* Exportación — disabled, out of scope */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-sf-gold" />
                <CardTitle>Exportación</CardTitle>
              </div>
              <CardDescription>Descargá tus datos en formato CSV.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {[
                { label: 'Pedidos', description: 'Historial completo de órdenes' },
                { label: 'Clientes', description: 'Base de datos de clientes' },
                { label: 'Inventario', description: 'Stock y variantes de productos' },
              ].map(({ label, description }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
