'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoriesGrid } from '@/components/admin/CategoriesGrid'
import { CategorySheet } from '@/components/admin/CategorySheet'
import type { Category } from '@/types'

interface CategoriesPageClientProps {
  categories: Category[]
}

export function CategoriesPageClient({ categories }: CategoriesPageClientProps) {
  const [newSheetOpen, setNewSheetOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground text-sm">
            {categories.length} categoría{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setNewSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <CategoriesGrid categories={categories} />

      <CategorySheet
        open={newSheetOpen}
        onClose={() => setNewSheetOpen(false)}
      />
    </div>
  )
}
