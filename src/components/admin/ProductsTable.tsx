'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ProductSheet } from '@/components/admin/ProductSheet'
import { softDeleteProduct } from '@/lib/actions/products'
import { formatPrice } from '@/lib/utils'
import type { Product, Category } from '@/types'

interface ProductsTableProps {
  products: Product[]
  categories: Category[]
}

export function ProductsTable({ products, categories: cats }: ProductsTableProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  function categoryName(categoryId: string) {
    return cats.find((c) => c.id === categoryId)?.name ?? '—'
  }

  async function handleDelete(id: string) {
    const result = await softDeleteProduct(id)
    if (result.ok) {
      toast.success('Producto eliminado')
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin productos
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => {
              const firstVariant = product.variants?.[0]
              const price = firstVariant?.price
              const stock = firstVariant?.stock ?? 0

              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.images?.[0]?.url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted shrink-0">
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{categoryName(product.categoryId)}</TableCell>
                  <TableCell className="text-sm">
                    {price !== undefined ? formatPrice(price) : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={stock <= 5 ? 'text-orange-600 font-semibold' : ''}>
                      {stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.deletedAt ? (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Eliminado
                      </Badge>
                    ) : product.featured ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Destacado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingProduct(product)
                          setSheetOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esto ocultará &quot;{product.name}&quot; del catálogo. Podés reactivarlo después.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ProductSheet
        product={editingProduct}
        categories={cats}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditingProduct(null)
        }}
      />
    </>
  )
}
