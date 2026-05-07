'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductsTable } from '@/components/admin/ProductsTable'
import { ProductSheet } from '@/components/admin/ProductSheet'
import type { Product, Category } from '@/types'

interface ProductsPageClientProps {
  products: Product[]
  categories: Category[]
  count: number
  currentPage: number
  searchQuery?: string
  categoryFilter?: string
}

export function ProductsPageClient({
  products,
  categories,
  count,
  currentPage,
  searchQuery,
  categoryFilter,
}: ProductsPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [newSheetOpen, setNewSheetOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery ?? '')

  function applyFilters(q?: string, cat?: string, page?: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (cat) params.set('categoria', cat)
    if (page && page > 1) params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters(searchInput, categoryFilter, 1)
  }

  const totalPages = Math.ceil(count / 20)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground text-sm">{count} producto{count !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setNewSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>

        <Select
          value={categoryFilter ?? 'all'}
          onValueChange={(v) => applyFilters(searchInput, !v || v === 'all' ? undefined : v, 1)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ProductsTable products={products} categories={categories} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => applyFilters(searchInput, categoryFilter, currentPage - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => applyFilters(searchInput, categoryFilter, currentPage + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* New product sheet */}
      <ProductSheet
        categories={categories}
        open={newSheetOpen}
        onClose={() => setNewSheetOpen(false)}
      />
    </div>
  )
}
