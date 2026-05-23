'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { BRAND } from '@/lib/constants'

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Productos' },
  { href: '/quienes-somos', label: 'Quiénes somos' },
  { href: '/#asi-de-simple', label: 'Cómo funciona' },
]

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menú"
        className="flex items-center justify-center rounded-md p-2 text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-[#E7DCCF] px-6 py-4">
          <SheetTitle className="font-heading text-base font-bold text-[#111111]">
            {BRAND.name}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Menú mobile">
          {NAV_LINKS.map((link) => (
            <SheetClose
              key={link.href}
              render={
                <Link
                  href={link.href}
                  className="rounded-md px-3 py-3 text-sm font-medium text-[#1F1F1F] transition-colors hover:bg-[#FAF7F2] hover:text-[#B68A57]"
                />
              }
            >
              {link.label}
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
