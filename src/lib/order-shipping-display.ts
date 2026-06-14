import type { Order } from '@/types'

/**
 * Etiquetas legibles para los campos de fulfillment de envío (Fase 2).
 * `shippingDeliveredType` / `shippingProductType` son `null` en pedidos
 * previos a esa fase — en ese caso no se muestra esta sección.
 */

export function getShippingMethodLabel(
  deliveredType: Order['shippingDeliveredType']
): string | null {
  switch (deliveredType) {
    case 'D':
      return 'Correo Argentino — a domicilio'
    case 'S':
      return 'Correo Argentino — a sucursal'
    default:
      return null
  }
}

export function getShippingSpeedLabel(
  productType: Order['shippingProductType']
): string | null {
  switch (productType) {
    case 'CP':
      return 'Clásico'
    case 'EP':
      return 'Expreso'
    default:
      return null
  }
}
