'use client'

import { useEffect, useState, useTransition } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Archive,
  Banknote,
  ImageIcon,
  Layers3,
  Link2,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Save,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { MultiImageUploader } from '@/components/admin/MultiImageUploader'
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
import type { Product, Category, ProductImage, ProductVariant } from '@/types'

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
    product?.images?.[0]?.url
  )
  const [productImages, setProductImages] = useState<ProductImage[]>(product?.images ?? [])
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
    setCurrentImageUrl(product?.images?.[0]?.url)
    setProductImages(product?.images ?? [])
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
      // product_images are managed via MultiImageUploader in edit mode
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
        <SheetContent
          side="right"
          className="w-full max-w-2xl overflow-y-auto border-l bg-background p-0"
        >
          <SheetHeader className="border-b bg-muted/30 px-6 py-5 sm:px-8">
            <div className="flex items-center gap-3 pr-10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
                <Package className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <SheetTitle className="text-xl font-semibold tracking-tight">
                  {isEdit ? 'Editar producto' : 'Nuevo producto'}
                </SheetTitle>
                <SheetDescription>
                  {isEdit
                    ? 'Modificá los datos del producto y sus variantes.'
                    : 'Completá los datos. Al guardar se crea la variante base automáticamente.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
            <div className="space-y-6 px-6 py-6 sm:px-8">

              {/* Imagen */}
              <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {isEdit ? 'Imágenes del producto' : 'Imagen del producto'}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-5">
                      {isEdit
                        ? 'Hasta 8 imágenes. La primera se usa como imagen principal.'
                        : 'Usá una imagen cuadrada y de buena resolución.'}
                    </p>
                  </div>
                </div>
                {isEdit && product ? (
                  <MultiImageUploader
                    productId={product.id}
                    images={productImages}
                    onImagesChange={setProductImages}
                  />
                ) : (
                  <ImageUploader
                    currentUrl={currentImageUrl}
                    className="w-full"
                    previewClassName="h-44 w-full rounded-xl border-primary/20 bg-muted/40"
                    previewWrapperClassName="block w-full"
                    imageSizes="(max-width: 640px) 100vw, 560px"
                    onFileSelect={(file) => setPendingFile(file)}
                    onRemove={() => {
                      setPendingFile(null)
                      setCurrentImageUrl(undefined)
                    }}
                  />
                )}
              </section>

              {/* Datos del producto */}
              <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Datos del producto</h3>
                    <p className="text-muted-foreground text-xs leading-5">
                      El nombre genera el slug automáticamente al crear un producto nuevo.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="prod-name"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Nombre *
                    </Label>
                    <div className="relative">
                      <Tag
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="prod-name"
                        placeholder="Ej: Chapita personalizada"
                        className="h-11 pl-9"
                        aria-invalid={!!errors.name}
                        {...register('name')}
                        onChange={handleNameChange}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="prod-slug"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Slug *
                    </Label>
                    <div className="relative">
                      <Link2
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="prod-slug"
                        placeholder="chapita-personalizada"
                        className="h-11 pl-9"
                        aria-invalid={!!errors.slug}
                        {...register('slug')}
                      />
                    </div>
                    {errors.slug && (
                      <p className="text-xs font-medium text-destructive">{errors.slug.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="prod-category"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Categoría *
                    </Label>
                    <Select
                      value={watch('category_id') || ''}
                      onValueChange={(v) => v && setValue('category_id', v)}
                    >
                      <SelectTrigger
                        id="prod-category"
                        className="h-11"
                        aria-invalid={!!errors.category_id}
                      >
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category_id && (
                      <p className="text-xs font-medium text-destructive">{errors.category_id.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="prod-desc"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Descripción
                    </Label>
                    <Textarea
                      id="prod-desc"
                      rows={4}
                      placeholder="Describí el producto y sus características."
                      className="min-h-28 resize-none"
                      {...register('description')}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 sm:col-span-2">
                    <input
                      id="prod-featured"
                      type="checkbox"
                      {...register('featured')}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <div>
                      <Label
                        htmlFor="prod-featured"
                        className="cursor-pointer text-sm font-medium"
                      >
                        <Star className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                        Producto destacado
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Aparece en la sección de destacados de la tienda.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Precio y stock */}
              <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Banknote className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Precio y stock</h3>
                    <p className="text-muted-foreground text-xs leading-5">
                      Precio en pesos enteros. Stock mínimo 0.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="prod-price"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Precio base (ARS) *
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="prod-price"
                        type="number"
                        min="0"
                        step="1"
                        className="h-11 pl-7"
                        aria-invalid={!!errors.price_pesos}
                        {...register('price_pesos')}
                      />
                    </div>
                    {errors.price_pesos && (
                      <p className="text-xs font-medium text-destructive">{errors.price_pesos.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="prod-stock"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      Stock base
                    </Label>
                    <div className="relative">
                      <Archive
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="prod-stock"
                        type="number"
                        min="0"
                        step="1"
                        className="h-11 pl-9"
                        aria-invalid={!!errors.stock}
                        {...register('stock')}
                      />
                    </div>
                    {errors.stock && (
                      <p className="text-xs font-medium text-destructive">{errors.stock.message}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Variantes — solo al editar */}
              {isEdit && (
                <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers3 className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Variantes</h3>
                      <p className="text-muted-foreground text-xs leading-5">
                        Nombre, precio y stock por combinación vendible.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {variants.length === 0 ? (
                      <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                        Sin variantes — agregá la primera abajo.
                      </p>
                    ) : (
                      variants.map((variant) => (
                        <div key={variant.id} className="rounded-xl border bg-muted/20 p-3">
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

                    <div className="rounded-xl border bg-muted/30 p-3">
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
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Agregar
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="sticky bottom-0 mt-auto flex flex-col-reverse gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-8">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onClose}
                className="h-11 sm:min-w-28"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="h-11 sm:min-w-40"
              >
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear producto'}
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
