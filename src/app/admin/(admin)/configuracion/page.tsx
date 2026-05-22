import Image from 'next/image'
import {
  Store,
  Globe,
  Languages,
  Wrench,
  Download,
  ImageIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { BRAND, TRANSFER } from '@/lib/constants'

export const metadata = { title: 'Configuración' }

export default function ConfiguracionPage() {
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

          {/* Información de la tienda */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-[#B68A57]" />
                <CardTitle>Información de la tienda</CardTitle>
              </div>
              <CardDescription>Datos de contacto y presentación pública.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre de la tienda</Label>
                  <Input id="nombre" defaultValue={BRAND.name} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email de contacto</Label>
                  <Input id="email" type="email" defaultValue={BRAND.email} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dominio">Dominio</Label>
                  <Input id="dominio" defaultValue={BRAND.domain} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" defaultValue={BRAND.instagram} disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Editá estos valores en <code className="rounded bg-muted px-1 py-0.5 text-xs">lib/constants.ts</code>
              </span>
              <Button size="sm" disabled>Guardar cambios</Button>
            </CardFooter>
          </Card>

          {/* Medios de pago - Transferencia */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#B68A57]" />
                <CardTitle>Transferencia bancaria</CardTitle>
              </div>
              <CardDescription>Datos de la cuenta para pagos por transferencia.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Banco</Label>
                  <Input defaultValue={TRANSFER.banco} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Titular</Label>
                  <Input defaultValue={TRANSFER.titular} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>CBU</Label>
                  <Input defaultValue={TRANSFER.cbu} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Alias</Label>
                  <Input defaultValue={TRANSFER.alias} disabled />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Editá estos valores en <code className="rounded bg-muted px-1 py-0.5 text-xs">lib/constants.ts</code>
              </span>
              <Button size="sm" disabled>Guardar cambios</Button>
            </CardFooter>
          </Card>

          {/* Moneda y zona horaria */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#B68A57]" />
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

          {/* Idioma */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-[#B68A57]" />
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
                <Wrench className="h-4 w-4 text-[#B68A57]" />
                <CardTitle>Mantenimiento de la tienda</CardTitle>
              </div>
              <CardDescription>Activá el modo mantenimiento para pausar la tienda.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Modo mantenimiento</p>
                  <p className="text-xs text-muted-foreground">
                    Los clientes verán una página de "próximamente" mientras está activo.
                  </p>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  Próximamente
                </Badge>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Columna lateral ── */}
        <div className="space-y-6">

          {/* Logo y marca */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#B68A57]" />
                <CardTitle>Logo y marca</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6">
                <Image
                  src="/logo.png"
                  alt={BRAND.name}
                  width={96}
                  height={96}
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" disabled>
                  Cambiar logo
                </Button>
                <Button size="sm" variant="outline" disabled>
                  Eliminar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                PNG, JPG o SVG. Máx. 2MB.
              </p>
            </CardContent>
          </Card>

          {/* Exportación */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-[#B68A57]" />
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
