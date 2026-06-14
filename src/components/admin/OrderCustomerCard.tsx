import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getShippingMethodLabel, getShippingSpeedLabel } from '@/lib/order-shipping-display'
import type { Order } from '@/types'

interface OrderCustomerCardProps {
  order: Order
}

export function OrderCustomerCard({ order }: OrderCustomerCardProps) {
  const { customer, shippingAddress } = order
  const methodLabel = getShippingMethodLabel(order.shippingDeliveredType)
  const speedLabel = getShippingSpeedLabel(order.shippingProductType)
  const agency = order.shippingAgencySnapshot

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

        {order.engravingText && (
          <div className="border-t pt-4">
            <Info label="Frase a grabar" value={order.engravingText} />
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="mb-2 text-sm font-medium">Envío</h3>
          <div className="space-y-2">
            <Info label="Dirección" value={shippingAddress.street} />
            <Info label="Ciudad" value={shippingAddress.city} />
            <Info label="Provincia" value={shippingAddress.province} />
            <Info label="Código postal" value={shippingAddress.postalCode} />
          </div>
        </div>

        {methodLabel && (
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">Método de envío</h3>
            <div className="space-y-2">
              <Info
                label="Servicio"
                value={speedLabel ? `${methodLabel} · ${speedLabel}` : methodLabel}
              />
              {order.shippingDeliveredType === 'S' && agency && (
                <>
                  <Info label="Sucursal de retiro" value={agency.name} />
                  <Info label="Código de agencia" value={order.shippingAgencyCode ?? agency.code} />
                  <Info label="Dirección de la sucursal" value={agency.address} />
                  {(agency.city || agency.province) && (
                    <Info
                      label="Localidad"
                      value={[agency.city, agency.province].filter(Boolean).join(', ')}
                    />
                  )}
                  {agency.postalCode && <Info label="CP de la sucursal" value={agency.postalCode} />}
                </>
              )}
            </div>
          </div>
        )}
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
