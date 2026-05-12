import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Order } from '@/types'

interface OrderCustomerCardProps {
  order: Order
}

export function OrderCustomerCard({ order }: OrderCustomerCardProps) {
  const { customer, shippingAddress } = order

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Info label="Nombre" value={customer.name} />
          <Info label="Email" value={customer.email} />
          <Info label="Teléfono" value={customer.phone} />
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">Envío</h3>
          <div className="space-y-2">
            <Info label="Dirección" value={shippingAddress.street} />
            <Info label="Ciudad" value={shippingAddress.city} />
            <Info label="Provincia" value={shippingAddress.province} />
            <Info label="Código postal" value={shippingAddress.postalCode} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  )
}
