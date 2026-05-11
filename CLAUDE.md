# 🔆 PT Laser — Ecommerce

**Versión:** 1.0  
**Estado:** Desarrollo  
**Última actualización:** Mayo 2026

Ecommerce para PT Laser — insignias y chapas personalizadas grabadas a laser (para mascotas, identificación, regalos, etc.). Panel de administración propio en `/admin/*` con Next.js + Supabase + shadcn/ui.

---

## Session Bootstrap Rules

Este proyecto usa Claude Code con Gentleman + Engram memory workflow + SDD (Spec-Driven Development).

En el primer mensaje significativo de cada sesión, antes de responder:

1. Verificar si las herramientas MCP de Engram están conectadas.
2. Si Engram está disponible, recuperar contexto/memoria previo.
3. Revisar la memoria de proyecto relevante.
4. Responder normalmente con el output style activo.
5. Si Engram no está disponible, continuar normalmente.

---

## Project Memory Identifier

Canonical Engram project name for this repository:

**`pet-laser-ecommerce`**

Always use this exact project identifier for memory retrieval and persistence.
Never use alternate names with spaces or different casing.

---

## SDD (Spec-Driven Development)

Este proyecto sigue SDD para cambios sustanciales:

- `/sdd-init` — inicializar contexto SDD (una vez por proyecto)
- `/sdd-explore <topic>` — investigar antes de implementar
- `/sdd-new <change>` — iniciar un cambio con planificación completa
- `/sdd-apply [change]` — implementar tareas de un cambio
- `/sdd-verify [change]` — validar implementación contra specs
- `/sdd-archive [change]` — cerrar un cambio

**Strict TDD es obligatorio** para cambios en:
- Lógica de carrito (`lib/cart.ts`)
- Creación de órdenes (`lib/db/orders.ts`)
- Integración de pagos (`lib/payments.ts`)
- Webhook handling (`app/api/webhooks/`)
- Gestión de stock (`lib/db/stock.ts`)
- Admin Server Actions (`lib/actions/*`)
- Políticas RLS (cualquier migración que toque `supabase/migrations/`)

Para cambios solo de UI, SDD es opcional.

---

## 🛒 Datos del Negocio

| Dato | Valor |
|------|-------|
| Marca | PT Laser |
| Producto | Insignias y chapas grabadas a laser |
| Moneda | ARS |
| Tipo de conversión | Híbrido (online + WhatsApp) |

### Stack

- **Framework:** Next.js 16 (App Router)
- **Base de Datos:** Supabase Postgres + Auth + Storage
- **Pagos:** MercadoPago Checkout Pro
- **Email:** Resend
- **Estado cliente:** Zustand
- **UI:** shadcn/ui + Tailwind CSS v4
- **Deploy:** Vercel

### Decisiones cerradas (no discutir)

- **No** Payload / Sanity / Strapi (panel propio en `/admin`)
- **No** Neon (usamos Supabase Postgres)
- **No** Vercel Blob (usamos Supabase Storage)
- **No** Clerk (usamos Supabase Auth)

---

## Configuración inicial

```bash
cp .env.example .env.local
# Completar .env.local con las credenciales reales

pnpm install
pnpm db:push
pnpm db:types
pnpm dev
```

---

**Mantenedor:** Ale Rimasa  
**Estado:** Desarrollo
