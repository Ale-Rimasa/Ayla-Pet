'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
  uploadProductImage,
  createVariant,
  updateVariant,
} from '@/lib/actions/products'
import type { Product, Category } from '@/types'

const productFormSchema = z.object({
  name: z.string().min(2, 'Ingresá el nombre del producto'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  category_id: z.string().uuid('Seleccioná una categoría'),
  price_pesos: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Ingresá un precio válido'),
  stock: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Ingresá un stock válido'),
  featured: z.boolean(),
})

type FormValues = z.infer<typeof productFormSchema>

interface ProductSheetProps {
  product?: Product | null
  categories: Category[]
  open: boolean
  onClose: () => void
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function ProductSheet({ product, categories, open, onClose }: ProductSheetProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(
    product?.images?.[0]
  )
  const isEdit = !!product
  const existingVariantId = product?.variants?.[0]?.id

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
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

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue('name', e.target.value)
    if (!isEdit) {
      setValue('slug', toSlug(e.target.value))
    }
  }

  async function onSubmit(values: FormValues) {
    let imageUrl = currentImageUrl

    if (pendingFile) {
      const ext = pendingFile.name.split('.').pop()
      const path = `products/${Date.now()}.${ext}`
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('path', path)
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

      const variantResult = await createVariant({
        product_id: productResult.data!.id,
        name: 'Default',
        price: priceCentavos,
        stock: stockQty,
        sort_order: 0,
      })
      if (!variantResult.ok) {
        toast.error(variantResult.error ?? 'Error al crear variante')
        return
      }
    }

    toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
    onClose()
  }

  return (
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
              {...register('name', { required: 'El nombre es requerido' })}
              onChange={handleNameChange}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="prod-slug">Slug *</Label>
            <Input
              id="prod-slug"
              {...register('slug', { required: 'El slug es requerido' })}
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select
              defaultValue={watch('category_id') || undefined}
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

          <div className="space-y-2">
            <Label htmlFor="prod-price">Precio (en pesos)</Label>
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
            <Label htmlFor="prod-stock">Stock</Label>
            <Input
              id="prod-stock"
              type="number"
              min="0"
              step="1"
              {...register('stock')}
            />
            {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
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
  )
}
