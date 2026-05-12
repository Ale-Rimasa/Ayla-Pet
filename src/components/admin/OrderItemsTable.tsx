import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'
import type { OrderItem } from '@/types'

interface OrderItemsTableProps {
  items: OrderItem[]
}

export function OrderItemsTable({ items }: OrderItemsTableProps) {
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead className="text-right">Cant.</TableHead>
            <TableHead className="text-right">Precio unit.</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.productName}</TableCell>
              <TableCell className="text-muted-foreground">{item.variantName}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(item.subtotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-medium">
              Total productos
            </TableCell>
            <TableCell className="text-right font-semibold">{formatPrice(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
