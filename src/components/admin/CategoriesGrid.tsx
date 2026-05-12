'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Layers, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { CategorySheet } from '@/components/admin/CategorySheet'
import { restoreCategory, softDeleteCategory } from '@/lib/actions/categories'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoriesGridProps {
  categories: Category[]
}

export function CategoriesGrid({ categories }: CategoriesGridProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  async function handleDelete(id: string, name: string) {
    const result = await softDeleteCategory(id)
    if (result.ok) {
      toast.success('Categoría eliminada')
    } else if (result.error === 'category_has_products') {
      toast.error(`No se puede eliminar "${name}" porque tiene productos activos`)
    } else {
      toast.error(result.error ?? 'Error al eliminar')
    }
  }

  async function handleRestore(id: string) {
    const result = await restoreCategory(id)
    if (result.ok) {
      toast.success('Categoría restaurada')
    } else {
      toast.error(result.error ?? 'Error al restaurar')
    }
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Layers className="h-10 w-10 opacity-30" />
        <p className="text-sm">Sin categorías aún</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {categories.map((cat) => (
          <Card key={cat.id} className={cn('overflow-hidden', cat.deletedAt && 'opacity-60')}>
            <div className="relative h-36 bg-muted">
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Layers className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <div className="mb-2">
                <h3 className="font-semibold text-sm">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.slug}</p>
                {cat.deletedAt ? (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Eliminada</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {cat.deletedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRestore(cat.id)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restaurar
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEditingCategory(cat)
                        setSheetOpen(true)
                      }}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            aria-label="Eliminar categoría"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esto ocultará &quot;{cat.name}&quot;. No se puede eliminar si tiene productos activos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CategorySheet
        category={editingCategory}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditingCategory(null)
        }}
      />
    </>
  )
}
