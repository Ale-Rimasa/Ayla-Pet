'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  BarChart2,
  Users,
  Percent,
  Settings,
  ExternalLink,
  BoxIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { BRAND } from '@/lib/constants'

const activeItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Productos', href: '/admin/productos', icon: Package },
  { label: 'Categorías', href: '/admin/categorias', icon: Tags },
  { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { label: 'Clientes', href: '/admin/clientes', icon: Users },
  { label: 'Estadísticas', href: '/admin/estadisticas', icon: BarChart2 },
  { label: 'Embalajes', href: '/admin/embalajes', icon: BoxIcon },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
]

const disabledItems = [
  { label: 'Descuentos', icon: Percent },
]

export function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sidebar-foreground font-bold text-base leading-tight">
            {BRAND.name}
          </span>
          <span className="text-sidebar-foreground/50 text-xs">Panel de administración</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activeItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href, item.exact)}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Próximamente</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {disabledItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    className="opacity-50 pointer-events-none"
                    aria-disabled="true"
                    render={
                      <span>
                        <item.icon />
                        <span>{item.label}</span>
                      </span>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  <span>Ver tienda</span>
                </a>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
