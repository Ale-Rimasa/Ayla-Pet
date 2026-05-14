'use client'

import { useEffect, useState, useTransition } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploader } from '@/components/admin/ImageUploader'
import {
  createProduct,
  updateProduct,
  softDeleteProduct,
  uploadProductImage,
  createVariant,
  updateVariant,
  deleteVariant,
} from '@/lib/actions/products'
import { formatPrice, slugify } from '@/lib/utils'
import type { Product, Category, ProductVariant } from '@/types'

const productFormSchema = z.object({
  name: z.string().min(2, 'Ingresá el nombre del producto'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  category_id: z.string().uuid('Seleccioná una categoría'),
  price_pesos: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Ingresá un precio válido'),
  stock: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Ingresá un stock válido'),
  featured: z.boolean(),
})

const emptyVariantForm = { name: '', price_pesos: '', stock: '' }

type FormValues = z.infer<typeof productFormSchema>
type VariantForm = typeof emptyVariantForm

interface ProductSheetProps {
  product?: Product | null
  categories: Category[]
  open: boolean
  onClose: () => void
}

function toVariantForm(variant: ProductVariant): VariantForm {
  return {
    name: variant.name,
    price_pesos: String(variant.price / 100),
    stock: String(variant.stock),
  }
}

function parseVariantForm(values: VariantForm) {
  const price = Math.round(Number(values.price_pesos) * 100)
  const stock = Number(values.stock)

  if (!values.name.trim() || !Number.isInteger(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
    return null
  }

  return { name: values.name.trim(), price, stock }
}

export function ProductSheet({ product, categories, open, onClose }: ProductSheetProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(
    product?.images?.[0]
  )
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? [])
  const [newVariant, setNewVariant] = useState<VariantForm>(emptyVariantForm)
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [editingVariant, setEditingVariant] = useState<VariantForm>(emptyVariantForm)
  const [isVariantPending, startVariantTransition] = useTransition()
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null)
  const isEdit = !!product
  const existingVariantId = product?.variants?.[0]?.id

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      description: product?.description ?? '',
      category_id: product?.categoryId ?? '',
      price_pesos: product?.variants?.[0]?.price
        ? String(product.variants[0].price / 100)
        : '0',
      stock: String(product?.variants?.[0]?.stock ?? 0),
      featured: product?.featured ?? false,
    },
  })

  useEffect(() => {
    setCurrentImageUrl(product?.images?.[0])
    setVariants(product?.variants ?? [])
    setNewVariant(emptyVariantForm)
    setEditingVariantId(null)
    setEditingVariant(emptyVariantForm)
    reset({
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      description: product?.description ?? '',
      category_id: product?.categoryId ?? '',
      price_pesos: product?.variants?.[0]?.price
        ? String(product.variants[0].price / 100)
        : '0',
      stock: String(product?.variants?.[0]?.stock ?? 0),
      featured: product?.featured ?? false,
    })
  }, [product, reset])

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    setValue('name', e.target.value)
    if (!isEdit) {
      setValue('slug', slugify(e.target.value))
    }
  }

  async function onSubmit(values: FormValues) {
    let imageUrl = currentImageUrl

    if (pendingFile) {
      const formData = new FormData()
      formData.append('file', pendingFile)
      const result = await uploadProductImage(formData)
      if (!result.ok) {
        toast.error(`Error al subir imagen: ${result.error}`)
        return
      }
      imageUrl = result.url
    }

    const priceCentavos = Math.round(Number(values.price_pesos) * 100)
    const stockQty = Number(values.stock)

    const productPayload = {
      name: values.name,
      slug: values.slug,
      description: values.description || undefined,
      category_id: values.category_id,
      images: imageUrl ? [imageUrl] : [],
      featured: values.featured,
    }

    if (isEdit && product) {
      const productResult = await updateProduct({ ...productPayload, id: product.id })
      if (!productResult.ok) {
        toast.error(productResult.error ?? 'Error al actualizar producto')
        return
      }

      if (existingVariantId) {
        const variantResult = await updateVariant({
          id: existingVariantId,
          price: priceCentavos,
          stock: stockQty,
        })
        if (!variantResult.ok) {
          toast.error(variantResult.error ?? 'Error al actualizar variante')
          return
        }
      }
    } else {
      const productResult = await createProduct(productPayload)
      if (!productResult.ok) {
        toast.error(productResult.error ?? 'Error al crear producto')
        return
      }

      if (!productResult.data) {
        toast.error('No se recibió el ID del producto creado')
        return
      }

      const variantResult = await createVariant({
        product_id: productResult.data.id,
        name: 'Default',
        price: priceCentavos,
        stock: stockQty,
        sort_order: 0,
      })
      if (!variantResult.ok) {
        // Rollback: soft-delete the orphan product so it doesn't pollute the catalogue
        await softDeleteProduct(productResult.data.id)
        toast.error(variantResult.error ?? 'Error al crear variante')
        return
      }
    }

    toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
    onClose()
  }

  function handleCreateVariant() {
    if (!product) return
    const parsed = parseVariantForm(newVariant)
    if (!parsed) {
      toast.error('Completá nombre, precio y stock válidos')
      return
    }

    startVariantTransition(async () => {
      const result = await createVariant({
        product_id: product.id,
        name: parsed.name,
        price: parsed.price,
        stock: parsed.stock,
        sort_order: variants.length,
      })

      if (!result.ok) {
        toast.error(result.error ?? 'Error al crear variante')
        return
      }

      const insertedId = result.data?.id
      if (insertedId) {
        setVariants((current) => [
          ...current,
          {
            id: insertedId,
            productId: product.id,
            name: parsed.name,
            price: parsed.price,
            stock: parsed.stock,
            sortOrder: variants.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
      }
      setNewVariant(emptyVariantForm)
      toast.success('Variante creada')
    })
  }

  function handleUpdateVariant(id: string) {
    const parsed = parseVariantForm(editingVariant)
    if (!parsed) {
      toast.error('Completá nombre, precio y stock válidos')
      return
    }

    startVariantTransition(async () => {
      const result = await updateVariant({ id, ...parsed })
      if (!result.ok) {
        toast.error(result.error ?? 'Error al actualizar variante')
        return
      }

      setVariants((current) =>
        current.map((variant) =>
          variant.id === id
            ? { ...variant, name: parsed.name, price: parsed.price, stock: parsed.stock }
            : variant
        )
      )
      setEditingVariantId(null)
      setEditingVariant(emptyVariantForm)
      toast.success('Variante actualizada')
    })
  }

  function handleDeleteVariant(id: string) {
    setVariantToDelete(id)
  }

  function confirmDeleteVariant() {
    if (!variantToDelete) return
    const id = variantToDelete
    setVariantToDelete(null)

    startVariantTransition(async () => {
      const result = await deleteVariant(id)
      if (!result.ok) {
        toast.error(result.error ?? 'Error al eliminar variante')
        return
      }

      setVariants((current) => current.filter((variant) => variant.id !== id))
      toast.success('Variante eliminada')
    })
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Imagen</Label>
            <ImageUploader
              currentUrl={currentImageUrl}
              onFileSelect={(file) => setPendingFile(file)}
              onRemove={() => {
                setPendingFile(null)
                setCurrentImageUrl(undefined)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-name">Nombre *</Label>
            <Input
              id="prod-name"
              {...register('name')}
              onChange={handleNameChange}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-slug">Slug *</Label>
            <Input
              id="prod-slug"
              {...register('slug')}
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select
              value={watch('category_id') || undefined}
              onValueChange={(v) => v && setValue('category_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prod-price">Precio base (en pesos)</Label>
              <Input
                id="prod-price"
                type="number"
                min="0"
                step="1"
                {...register('price_pesos')}
              />
              {errors.price_pesos && <p className="text-xs text-destructive">{errors.price_pesos.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-stock">Stock base</Label>
              <Input
                id="prod-stock"
                type="number"
                min="0"
                step="1"
                {...register('stock')}
              />
              {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-desc">Descripción</Label>
            <Textarea id="prod-desc" rows={3} {...register('description')} />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="prod-featured"
              type="checkbox"
              {...register('featured')}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <Label htmlFor="prod-featured">Producto destacado</Label>
          </div>

          <Separator />

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Variantes</h3>
              <p className="text-xs text-muted-foreground">
                Nombre, precio y stock por combinación vendible.
              </p>
            </div>

            {!product ? (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Guardá el producto para administrar variantes adicionales.
              </p>
            ) : (
              <div className="space-y-2">
                {variants.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    Sin variantes — agregá la primera
                  </p>
                ) : (
                  variants.map((variant) => (
                    <div key={variant.id} className="rounded-md border p-2">
                      {editingVariantId === variant.id ? (
                        <VariantInputs
                          value={editingVariant}
                          onChange={setEditingVariant}
                          disabled={isVariantPending}
                          actions={
                            <>
                              <Button
                                type="button"
                                size="icon-sm"
                                onClick={() => handleUpdateVariant(variant.id)}
                                disabled={isVariantPending}
                                aria-label="Guardar variante"
                              >
                                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setEditingVariantId(null)}
                                aria-label="Cancelar edición"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </>
                          }
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{variant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(variant.price)} · Stock {variant.stock}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingVariantId(variant.id)
                                setEditingVariant(toVariantForm(variant))
                              }}
                              aria-label="Editar variante"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteVariant(variant.id)}
                              disabled={isVariantPending}
                              aria-label="Eliminar variante"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                <div className="rounded-md border bg-muted/30 p-2">
                  <VariantInputs
                    value={newVariant}
                    onChange={setNewVariant}
                    disabled={isVariantPending}
                    actions={
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateVariant}
                        disabled={isVariantPending}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </Button>
                    }
                  />
                </div>
              </div>
            )}
          </section>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear producto'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <AlertDialog open={!!variantToDelete} onOpenChange={(open) => { if (!open) setVariantToDelete(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar variante?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. La variante será eliminada permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteVariant}
            className="bg-destructive hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

interface VariantInputsProps {
  value: VariantForm
  onChange: (value: VariantForm) => void
  disabled?: boolean
  actions: ReactNode
}

function VariantInputs({ value, onChange, disabled, actions }: VariantInputsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_90px_80px_auto]">
      <Input
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="Nombre"
        disabled={disabled}
      />
      <Input
        value={value.price_pesos}
        onChange={(event) => onChange({ ...value, price_pesos: event.target.value })}
        type="number"
        min="0"
        step="1"
        placeholder="Precio"
        disabled={disabled}
      />
      <Input
        value={value.stock}
        onChange={(event) => onChange({ ...value, stock: event.target.value })}
        type="number"
        min="0"
        step="1"
        placeholder="Stock"
        disabled={disabled}
      />
      <div className="flex gap-1">{actions}</div>
    </div>
  )
}

