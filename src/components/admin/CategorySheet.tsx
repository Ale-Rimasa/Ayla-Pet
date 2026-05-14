'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ImageIcon,
  Layers3,
  Link2,
  ListOrdered,
  LoaderCircle,
  Tag,
} from 'lucide-react'
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
import { ImageUploader } from '@/components/admin/ImageUploader'
import {
  createCategory,
  updateCategory,
  uploadCategoryImage,
} from '@/lib/actions/categories'
import { slugify } from '@/lib/utils'
import type { Category } from '@/types'

const categoryFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().optional(),
  sort_order: z.string(),
})

type FormValues = z.infer<typeof categoryFormSchema>

interface CategorySheetProps {
  category?: Category | null
  open: boolean
  onClose: () => void
}


export function CategorySheet({ category, open, onClose }: CategorySheetProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(
    category?.imageUrl
  )
  const isEdit = !!category

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      sort_order: String(category?.sortOrder ?? 0),
    },
  })

  useEffect(() => {
    setCurrentImageUrl(category?.imageUrl)
    setPendingFile(null)
    reset({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      sort_order: String(category?.sortOrder ?? 0),
    })
  }, [category, reset])

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      const result = await uploadCategoryImage(formData)
      if (!result.ok) {
        toast.error(`Error al subir imagen: ${result.error}`)
        return
      }
      imageUrl = result.url
    }

    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description || undefined,
      sort_order: Number(values.sort_order) || 0,
      image_url: imageUrl,
    }

    let result
    if (isEdit && category) {
      result = await updateCategory({ ...payload, id: category.id })
    } else {
      result = await createCategory(payload)
    }

    if (!result.ok) {
      toast.error(result.error ?? 'Error al guardar categoría')
      return
    }

    toast.success(isEdit ? 'Categoría actualizada' : 'Categoría creada')
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl overflow-y-auto border-l bg-background p-0"
      >
        <SheetHeader className="border-b bg-muted/30 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
              <Layers3 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <SheetTitle className="text-xl font-semibold tracking-tight">
                {isEdit ? 'Editar categoría' : 'Nueva categoría'}
              </SheetTitle>
              <SheetDescription>
                Definí cómo se agrupan y muestran los productos en la tienda.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="space-y-6 px-6 py-6 sm:px-8">
            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Imagen de categoría</h3>
                  <p className="text-muted-foreground text-xs leading-5">
                    Usá una imagen cuadrada y clara. Se va a ver en cards y
                    accesos rápidos.
                  </p>
                </div>
              </div>

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
            </section>

            <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Datos principales</h3>
                  <p className="text-muted-foreground text-xs leading-5">
                    El nombre genera el slug automáticamente al crear una categoría nueva.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="cat-name"
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
                      id="cat-name"
                      placeholder="Ej: Cerámica"
                      className="h-11 pl-9"
                      aria-invalid={!!errors.name}
                      {...register('name')}
                      onChange={handleNameChange}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs font-medium text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="cat-slug"
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
                      id="cat-slug"
                      placeholder="ceramica"
                      className="h-11 pl-9"
                      aria-invalid={!!errors.slug}
                      {...register('slug')}
                    />
                  </div>
                  {errors.slug && (
                    <p className="text-xs font-medium text-destructive">
                      {errors.slug.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="cat-order"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Orden
                  </Label>
                  <div className="relative">
                    <ListOrdered
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="cat-order"
                      type="number"
                      min="0"
                      className="h-11 pl-9"
                      {...register('sort_order')}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="cat-desc"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Descripción
                  </Label>
                  <Textarea
                    id="cat-desc"
                    rows={4}
                    placeholder="Contá brevemente qué productos incluye esta categoría."
                    className="min-h-28 resize-none"
                    {...register('description')}
                  />
                </div>
              </div>
            </section>
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
              {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
