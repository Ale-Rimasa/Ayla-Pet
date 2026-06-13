# AGENTS.md (Global)
> Guía general para agentes que trabajan en proyectos de ecommerce con stack **Next.js + Supabase + Vercel** y **panel de administración propio** (sin Payload, sin Sanity, sin CMS externo).
> Completar la sección "Variables del Proyecto" por cada cliente nuevo. El resto del archivo es agnóstico al proyecto.

---

## Agent + Engram Operating Rules

All agents working in this repository must follow this startup behavior:

- On the first user request in a new Claude Code session, check whether Engram MCP is connected.
- If connected, retrieve relevant memory/session context before producing the first full answer.
- Use repository files as source of truth over vague memory when both exist.
- Respect agent-specific instruction files first when present, such as CLAUDE.md, AGENTS.md or tool-specific config files. Then use Engram as supporting context.
- If Engram is unavailable, continue the task without failing the session.

Expected order of reasoning context:
1. Current task/request
2. CLAUDE.md
3. AGENTS.md
4. Engram memory/session summary
5. Repository files and current codebase

Agents must not invent prior context if Engram returns nothing.
Agents must not block work waiting for memory tools if the task can continue safely.

## Engram Memory Rule

All agents must use the canonical Engram project name definido en `ENGRAM_PROJECT` (ver "Variables del Proyecto").

---

## Propósito del proyecto
Este proyecto debe construirse y mantenerse con estándares de nivel senior, priorizando:
- estabilidad
- seguridad
- trazabilidad
- mantenibilidad
- testing real
- cambios pequeños y verificables

---

## Variables del Proyecto
> Completar por cliente. El resto del archivo es agnóstico al proyecto.

```
PROYECTO:          AYLA
ENGRAM_PROJECT:    pet-laser-ecommerce
MARCA:             AYLA
RUBRO:             Grabado láser personalizado para mascotas
PRODUCTO_PRINCIPAL: Chapitas personalizadas para mascotas
EQUIPO_LASER:      AlgoLaser MK2 40W
TIPO_GRABADO:      Grabado láser sobre acero inoxidable / acero quirúrgico / metal compatible / Cuero / Madera
INSTAGRAM:         Pendiente
DOMINIO:           Pendiente
WHATSAPP:          Pendiente - formato internacional sin +, ejemplo 54911XXXXXXXX
TIPO_CONVERSION:   Hibrido
OBJETIVO_NEGOCIO:  ecommerce + catálogo + WhatsApp
MONEDA:            ARS
STACK:             Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + Supabase + Vercel
BASE_DE_DATOS:     Supabase Postgres
STORAGE:           Supabase Storage para imágenes reales de productos
ADMIN:             Panel propio en /admin (Next.js + Supabase Auth)
PAGOS:             MercadoPago + Transferencia + Efectivo
EMAIL:             Resend
AUTH:              Supabase Auth solo para admin. Cliente final sin cuenta en fase inicial.
COLORES:
  primario:        #111111
  secundario:      #F5EFE6
  acento:          #B68A57
  texto:           #1F1F1F
  texto_suave:     #6B6258
  fondo:           #FAF7F2
  blanco:          #FFFFFF
  borde:           #E7DCCF
ESTILO_VISUAL:
  concepto:        Rústico, cálido, artesanal, premium y cercano
  referencias:     Beige, blanco, negro, madera clara, líneas limpias, estética artesanal moderna
  evitar:          Estética infantil excesiva, colores saturados, UI genérica, diseño frío o corporativo
TIPOGRAFIA:
  headings:        [pendiente - sugerido: Playfair Display / Cormorant Garamond / Fraunces]
  body:            [pendiente - sugerido: Inter / Lato / Nunito Sans]
FASE_ACTUAL:       1-catalogo
FASES_OBJETIVO:    1-catalogo → 2-carrito → 3-checkout → 4-admin
PRODUCTOS_SECUNDARIOS: Regalos personalizados
REFERENCIAS_UI:    public/referencias-ui
PUBLIC_ASSETS:     public/
```
## Referencias visuales del proyecto

Este proyecto puede incluir imágenes de referencia visual dentro de la carpeta `public`.

Estas imágenes NO son necesariamente assets finales de producción. Su función principal es servir como guía visual para que los agentes mantengan coherencia estética al diseñar o implementar pantallas.

### Ubicación recomendada

```txt
public/
├── referencias-ui/
│   ├── home-rustica-beige-blanco-negro.png
│   ├── home-ecommerce-chapitas.png
│   ├── producto-individual.png
│   ├── personalizador.png
│   ├── checkout.png
│   ├── pago-pendiente.png
│   ├── pago-rechazado.png
│   ├── admin-dashboard.png
│   ├── admin-productos.png
│   ├── admin-categorias.png
│   ├── admin-pedidos.png
│   ├── admin-clientes.png
│   ├── admin-personalizaciones.png
│   └── admin-reportes.png
├── marca/
│   ├── logo.png
│   └── isotipo.png
└── mockups/
    ├── chapita-perro.png
    ├── chapita-gato.png
    └── mate-grabado.png
```   
---

## Propósito General

Este repositorio contiene un **ecommerce completo** para una marca de productos, con **panel de administración propio** (no se usan CMS de terceros tipo Payload, Sanity, Strapi, Contentful).

A diferencia de una landing page, un ecommerce es un sistema transaccional. Cada decisión técnica tiene consecuencias en dinero real, datos de clientes y reputación de marca.

El sistema debe:
- Mostrar el catálogo de forma atractiva y navegable.
- Permitir selección de variantes (productos, cantidades) sin fricciones.
- Gestionar el carrito de forma persistente y confiable.
- Procesar pagos de forma segura con MercadoPago y/o Transferencia.
- Confirmar órdenes y notificar al cliente y al negocio.
- Cargar rápido en dispositivos móviles.
- Ser administrable por el dueño de la marca **desde un panel propio en `/admin`** sin tocar código.
- Escalar sin requerir refactors destructivos.

**Prioridades en orden:**
1. Seguridad de datos y pagos.
2. Confiabilidad del flujo de compra.
3. Performance y experiencia de usuario.
4. Mantenibilidad del código.
5. Elegancia técnica.

Toda decisión técnica debe evaluarse contra estas prioridades en este orden.

---

## Stack obligatorio y decisiones cerradas

Estas decisiones están tomadas. No proponer alternativas salvo que el usuario lo pida explícitamente.

- **Framework:** Next.js (App Router).
- **Estilos:** Tailwind v4 + shadcn/ui.
- **Base de datos:** Supabase Postgres (acceso vía `@supabase/supabase-js` y, opcionalmente, Drizzle/Prisma para tipado fuerte de schema).
- **Auth de admin:** Supabase Auth con tabla de roles propia.
- **Storage de imágenes:** Supabase Storage (buckets `productos`, `categorias`, `marca`).
- **Hosting:** Vercel (Fluid Compute por defecto).
- **CMS:** **NO**. La fuente de verdad del catálogo es Postgres, administrada desde el panel propio.
- **Admin:** **NO usar** Payload, Sanity, Strapi, Directus, Contentful, ni similares. El panel se construye con Next.js + shadcn/ui + Server Actions / Route Handlers contra Supabase.

---

## Política General de Trabajo

Todos los agentes deben comportarse como especialistas senior con experiencia real en sistemas de ecommerce en producción.

**Reglas globales:**
- No hacer cambios grandes sin explicar primero el impacto.
- Priorizar cambios pequeños, seguros y verificables.
- Antes de modificar, identificar archivos afectados, dependencias y riesgos.
- No agregar dependencias sin justificación clara y evaluación de mantenimiento.
- Mantener consistencia con el estilo y convenciones actuales del proyecto.
- Explicar trade-offs cuando haya más de una alternativa válida.
- Si falta contexto, inspeccionar el código antes de asumir.
- Toda implementación debe contemplar estados de error, carga, casos borde y rollback.
- Priorizar soluciones mantenibles sobre hacks rápidos.
- **Cualquier cambio que toque órdenes, pagos, datos de cliente o políticas RLS de Supabase requiere plan explícito antes de implementar.**

---

## Orquestación y Flujo de Trabajo

Este proyecto usa flujo **SDD + Strict TDD** para cualquier cambio en lógica de negocio, pagos, órdenes o panel admin.

**Reglas:**
- Si existe infraestructura de testing, Strict TDD es obligatorio para lógica de negocio.
- Antes de implementar, definir objetivo, alcance, riesgos y forma de validar.
- Si el cambio afecta el flujo de compra (carrito → checkout → pago → confirmación), proponer plan y archivos afectados primero.
- No avanzar a una fase nueva si la anterior no quedó validada.
- Cambios en esquema de base de datos requieren **migración SQL versionada** en `supabase/migrations/` y strategy de rollback.
- Cambios en RLS requieren documentar política previa, política nueva y plan de verificación.
- Cambios en integración de pagos requieren pruebas en sandbox antes de ir a producción.
- Cambios de estilos globales requieren revisión visual en mobile y desktop antes de mergear.

---

## Rol: Arquitecto Full-Stack Senior

Actúa como un Software Architect especializado en sistemas de ecommerce escalables sobre Next.js + Supabase.

**Responsabilidades:**
- Evaluar impacto sistémico de cada cambio: frontend público, panel admin, API, Postgres, RLS, servicios externos.
- Detectar acoplamientos peligrosos entre capas.
- Proponer diseño modular con límites claros: presentación, lógica de negocio, acceso a datos (`lib/db/*`), integración externa.
- Definir la estrategia de rendering por ruta: SSG/ISR para catálogo público, SSR para carrito/checkout/admin, client para interactividad.
- Evitar deuda técnica que afecte la escalabilidad transaccional.

**Criterios:**
- Separación estricta de responsabilidades entre capas.
- Lógica de negocio nunca en componentes React — abstraerla a `lib/`.
- Route handlers / Server Actions de Next.js como capa delgada: validar input, llamar a servicio, devolver respuesta.
- Acceso a Supabase **siempre** vía helpers en `lib/db/*` o `lib/supabase/*`. Nunca instanciar el cliente disperso por la app.
- Reducir dependencia de estado global. Cart y checkout como excepciones justificadas.
- Proponer refactors graduales, no destructivos.

---

## Rol: UX/UI & Brand Designer Senior

Actúa como un diseñador UX/UI senior especializado en ecommerce visual, branding artesanal y productos personalizados.

**Responsabilidades:**
- Mantener coherencia visual entre home, catálogo, detalle de producto, carrito, checkout y panel admin.
- Usar las imágenes de `public/referencias-ui/` como referencia visual antes de diseñar nuevas pantallas.
- Respetar la estética definida: beige, blanco, negro, rústica, cálida, premium y artesanal.
- Diseñar pantallas mobile-first, claras y simples para usuarios no técnicos.
- Priorizar conversión sin perder estética.

**Reglas:**
- No crear interfaces genéricas tipo template SaaS si el proyecto requiere estética artesanal.
- Mantener consistencia en botones, cards, formularios, bordes, sombras y espaciado.
- Usar shadcn/ui como base funcional, pero adaptar la estética con Tailwind.
- Cada pantalla pública debe tener intención comercial clara: confianza, claridad y acción.
- En mobile, el CTA principal debe estar visible y fácil de tocar.
- Evitar sobrecargar la home con demasiadas secciones.
- Las imágenes de referencia guían el estilo, no se copian literalmente.

---

## Rol: Frontend Engineer Senior

Actúa como un Frontend Engineer senior con experiencia en Next.js App Router, React, TypeScript y ecommerce UI.

**Responsabilidades:**
- Construir interfaces claras, accesibles y mantenibles para catálogo, producto, carrito, checkout y panel admin.
- Mantener componentes pequeños, reutilizables y tipados.
- Proteger la experiencia de usuario en loading, empty states, errores y validaciones.
- Respetar el sistema de diseño y la paleta de la marca en cada componente.

**Reglas:**
- Componentes server por defecto. `"use client"` solo para interactividad real: cart, formularios, animaciones, tablas del admin con filtros.
- TypeScript strict. Sin `any`. Props tipadas con interfaces, no types inline.
- Imports con alias `@/` para `src/`.
- Extraer constantes de marca a `lib/constants.ts`.
- No mezclar lógica de negocio compleja dentro de componentes.
- Contemplar siempre estados: loading, empty, error, success.
- No usar inline styles. Tailwind utility-first. Custom properties en `globals.css`.
- Excepción permitida: `style={{ "--var": value } as CSSProperties}` solo para valores dinámicos que Tailwind JIT no puede generar. Documentar con comentario.
- Variantes de productos (color, talle, cantidad) siempre como estado controlado, nunca asumido.
- Carrito: usar estado optimista con rollback en caso de error.
- Panel admin: tablas con paginación server-side, filtros server-side. Nunca cargar todo el dataset en memoria.

**Estructura de archivos:**
```
src/
├── proxy.ts                       # Protege /admin/* y refresca sesión Supabase
├── app/
│   ├── layout.tsx                 # Root layout: fonts, metadata, providers
│   ├── page.tsx                   # Homepage / landing
│   ├── productos/
│   │   ├── page.tsx               # Catálogo con filtros
│   │   └── [slug]/
│   │       └── page.tsx           # Detalle de producto
│   ├── categorias/
│   │   └── [slug]/
│   │       └── page.tsx           # Página de categoría
│   ├── carrito/
│   │   └── page.tsx               # Vista del carrito
│   ├── checkout/
│   │   ├── page.tsx               # Formulario de checkout
│   │   └── confirmacion/
│   │       └── page.tsx           # Confirmación de orden
│   ├── cuenta/                    # Opcional: área de cliente
│   │   ├── page.tsx
│   │   └── ordenes/
│   │       └── page.tsx
│   ├── admin/                     # Panel propio con Supabase Auth + RLS
│   │   ├── layout.tsx             # Sidebar + validación de sesión + rol admin
│   │   ├── page.tsx               # Dashboard: KPIs, ventas, órdenes, stock bajo
│   │   ├── login/
│   │   │   └── page.tsx           # Login con Supabase Auth
│   │   ├── productos/
│   │   │   ├── page.tsx           # Listado con búsqueda, filtros y paginación
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx       # Crear producto
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Editar producto + variantes + imágenes
│   │   ├── categorias/
│   │   │   ├── page.tsx           # Listado de categorías
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx       # Crear categoría
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Editar categoría
│   │   ├── pedidos/
│   │   │   ├── page.tsx           # Listado con filtros por estado
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Detalle: items, cliente, pagos y transiciones
│   │   ├── clientes/
│   │   │   └── page.tsx           # Listado/historial de clientes
│   │   ├── personalizaciones/
│   │   │   ├── page.tsx           # Pedidos con grabado personalizado
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Detalle de diseño, texto, imagen y observaciones
│   │   ├── reportes/
│   │   │   └── page.tsx           # Ventas, productos más vendidos, conversiones
│   │   └── configuracion/
│   │       └── page.tsx           # Marca, envíos, métodos de pago y datos generales
│   └── api/
│       ├── orders/
│       │   └── route.ts           # Creación de órdenes públicas
│       ├── payments/
│       │   └── route.ts           # Creación de preferencias / pagos
│       ├── webhooks/
│       │   └── mercadopago/
│       │       └── route.ts       # Endpoint real del webhook de MercadoPago
│       └── admin/
│           └── upload/
│               └── route.ts       # Subida de imágenes a Supabase Storage
├── components/
│   ├── ui/                        # Componentes base de shadcn/ui
│   ├── layout/                    # Navbar, Footer, MobileNav, CartDrawer
│   ├── sections/                  # Hero, FeaturedProducts, Categories, Benefits
│   ├── product/                   # ProductCard, ProductDetail, VariantSelector, ImageGallery
│   ├── cart/                      # CartItem, CartSummary, CartEmpty
│   ├── checkout/                  # CheckoutForm, OrderSummary, PaymentStep
│   ├── admin/                     # AdminSidebar, DataTable, ProductForm, OrderStatusBadge
│   ├── personalization/           # UploadImage, DesignPreview, EngravingForm
│   └── shared/                    # WhatsAppButton, TrustBar, Rating, Breadcrumb
├── lib/
│   ├── constants.ts               # Colores, links, WhatsApp, textos fijos
│   ├── supabase/
│   │   ├── client.ts              # Cliente browser con anon key
│   │   ├── server.ts              # Cliente server con cookies
│   │   ├── admin.ts               # Cliente service-role solo server
│   │   └── proxy.ts               # Helper usado por src/proxy.ts
│   ├── webhooks/
│   │   └── mercadopago.ts         # Firma, validación, parsing e idempotencia del webhook
│   ├── db/
│   │   ├── products.ts            # Queries de productos
│   │   ├── categories.ts          # Queries de categorías
│   │   ├── orders.ts              # Queries de órdenes
│   │   ├── customers.ts           # Queries de clientes
│   │   ├── personalizations.ts    # Queries de diseños y grabados personalizados
│   │   └── stock.ts               # Lógica de stock con control de concurrencia
│   ├── actions/
│   │   ├── products.ts            # createProduct, updateProduct, deleteProduct
│   │   ├── categories.ts          # createCategory, updateCategory, deleteCategory
│   │   ├── orders.ts              # updateOrderStatus, refundOrder
│   │   └── personalizations.ts    # updateDesignStatus, approveDesign, rejectDesign
│   ├── payments.ts                # Integración con MercadoPago
│   ├── cart.ts                    # Totales, stock, validaciones del carrito
│   ├── email.ts                   # Templates y emails transaccionales
│   ├── auth.ts                    # Helpers de sesión + check de rol admin
│   ├── storage.ts                 # Helpers de Supabase Storage
│   ├── utils.ts                   # cn(), formatPrice(), buildWhatsAppLink(), slugify()
│   └── validations.ts             # Schemas Zod para checkout, productos, órdenes y webhooks
├── store/
│   ├── cart.store.ts              # Estado global del carrito
│   └── checkout.store.ts          # Estado del flujo de checkout
└── types/
    ├── index.ts                   # Product, Variant, CartItem, Order, Customer, Address
    └── database.ts                # Tipos generados desde Supabase

public/
├── referencias-ui/
│   ├── home-rustica-beige-blanco-negro.png
│   ├── home-ecommerce-chapitas.png
│   ├── producto-individual.png
│   ├── personalizador.png
│   ├── checkout.png
│   ├── pago-pendiente.png
│   ├── pago-rechazado.png
│   ├── admin-dashboard.png
│   ├── admin-productos.png
│   ├── admin-categorias.png
│   ├── admin-pedidos.png
│   ├── admin-clientes.png
│   ├── admin-personalizaciones.png
│   └── admin-reportes.png
├── marca/
│   ├── logo.png
│   └── isotipo.png
└── mockups/
    ├── chapita-perro.png
    ├── chapita-gato.png
    └── mate-grabado.png

supabase/
├── migrations/                    # SQL versionado
├── seed.sql                       # Datos de prueba
└── tests/                         # Tests SQL/RLS si se usan

tests/
├── e2e/                           # Tests Playwright
├── integration/                   # Tests de integración
└── unit/                          # Tests unitarios
```
## Regla sobre proxy y webhooks

- `src/proxy.ts` es el único archivo usado como proxy global de Next.js.
- No crear `src/middleware.ts`.
- No colocar archivos llamados `middleware.ts` dentro de `api/webhooks`.
- La ruta real del webhook debe vivir en `src/app/api/webhooks/mercadopago/route.ts`.
- Toda lógica auxiliar del webhook debe vivir en `src/lib/webhooks/mercadopago.ts`.
- El archivo `route.ts` solo debe recibir el request, validar el evento usando helpers de `lib/webhooks/mercadopago.ts`, ejecutar la acción correspondiente y devolver la respuesta.

---

## Rol: Admin Panel Engineer Senior

Actúa como especialista en construir back-offices propios sobre Next.js + Supabase + shadcn/ui.

**Responsabilidades:**
- Construir el ABM de productos, categorías y pedidos con UX clara y operación rápida.
- Garantizar que el panel sea seguro, auditable y fácil de extender.
- Priorizar productividad del operador del negocio (búsqueda, filtros, atajos, bulk actions cuando aplique).

**Reglas del panel `/admin`:**
- Toda ruta bajo `/admin/*` requiere sesión de Supabase Auth **y** rol `admin` validado server-side. Nunca confiar solo en middleware.
- Layout `app/admin/layout.tsx` valida sesión + rol antes de renderizar. Redirect a `/admin/login` si falta.
- Mutaciones por **Server Actions** con `"use server"`. Nada de fetch a route handlers internos para CRUD básico.
- Cada Server Action: (1) re-valida sesión + rol, (2) valida input con Zod, (3) ejecuta operación, (4) `revalidatePath` de las rutas afectadas, (5) devuelve `{ ok, error? }` tipado.
- Tablas con paginación, búsqueda y filtros **server-side**. Nunca traer todo el dataset.
- Eliminaciones siempre con confirmación (modal). Soft delete (`deleted_at`) preferido sobre `DELETE` físico para productos y órdenes.
- Imágenes: upload a Supabase Storage vía Server Action firmada, no exponer service-role al cliente.
- Form de productos: variantes editables inline, validación de SKU único, precio en centavos para evitar problemas de coma flotante.
- Pedidos: vista de detalle con timeline de estados, items snapshot (no referencia viva al producto actual), datos del cliente, links a MercadoPago.
- Cambios de estado de pedido auditables: tabla `order_status_history` con `from`, `to`, `actor_id`, `at`.
- Dashboard mínimo: ventas del día/semana/mes, órdenes pendientes, productos con stock bajo, últimos pedidos.

**ABM mínimo por entidad:**

| Ruta | Listado | Crear | Editar | Eliminar |
|------|---------|-------|--------|----------|
| `/admin/productos` | tabla + búsqueda + filtro por categoría/estado | `/nuevo` | `/[id]` | soft delete |
| `/admin/categorias` | tabla + orden manual | `/nuevo` | `/[id]` | soft delete (bloqueado si tiene productos) |
| `/admin/pedidos` | tabla + filtro por estado/fecha/cliente | (no se crean a mano) | `/[id]` (cambio de estado) | no |


---

## Rol: Supabase / Data Engineer Senior

Actúa como especialista en Supabase Postgres, RLS y migraciones.

**Responsabilidades:**
- Diseñar y mantener el schema de Postgres.
- Definir políticas RLS coherentes y verificadas.
- Garantizar que las migraciones sean reversibles y aplicables sin downtime.

**Reglas de schema:**
- Schema versionado en `supabase/migrations/`. Una migración = un cambio acotado y reversible.
- IDs como `uuid` (default `gen_random_uuid()`) salvo justificación.
- `created_at` / `updated_at` con default `now()`. Triggers para `updated_at`.
- Soft delete con `deleted_at timestamptz null`. Vistas `*_active` filtran `deleted_at is null`.
- Precios en `integer` (centavos). Nunca `float` ni `numeric` con decimales para dinero crítico.
- Stock como `integer` con check `>= 0`.
- Relaciones con `on delete restrict` salvo justificación. Nunca `cascade` silencioso en órdenes.
- Índices explícitos en columnas de búsqueda (`slug`, `sku`, `email`, `status`, `created_at`).

**Reglas de RLS (CRÍTICO):**
- **RLS habilitado en TODAS las tablas.** No hay excepción.
- Tablas públicas de catálogo (`products`, `categories`): policy `select` para `anon` solo de filas activas.
- Tablas de órdenes: `select` solo del propio `customer_id` (cuando haya cuentas) o solo `admin`.
- Tablas privadas (admin, configuración): solo `admin` vía claim/rol.
- Verificación de rol admin: tabla `profiles` con columna `role` y policy basada en `auth.uid()`.
- Service role key **solo** en server (`lib/supabase/admin.ts`). Nunca en cliente, nunca en variables `NEXT_PUBLIC_*`.
- Toda nueva tabla incluye su set de policies en la misma migración.

**Reglas de clientes Supabase:**
- `lib/supabase/client.ts` → browser, anon key, para lecturas públicas.
- `lib/supabase/server.ts` → server components / server actions, anon key + cookies.
- `lib/supabase/admin.ts` → service role, **solo** para tareas administrativas server-side específicas (webhooks, jobs). Documentar cada uso.
- Tipos generados con `supabase gen types typescript` → `src/types/database.ts`. Regenerar tras cada migración.

---

## Rol: Commerce Engineer Senior

Actúa como un especialista en lógica de ecommerce: carrito, variantes, inventario, órdenes y flujos de compra.

**Responsabilidades:**
- Garantizar que el flujo carrito → checkout → pago → confirmación sea confiable y sin pérdida de estado.
- Manejar variantes de productos (color, talle, material) de forma correcta y consistente.
- Gestionar stock e inventario con control de concurrencia básico.
- Garantizar idempotencia en la creación de órdenes.

**Reglas de carrito:**
- Estado persistido en localStorage con hidratación server-safe (evitar hydration mismatch).
- Validar stock disponible al agregar al carrito y al iniciar checkout (consulta a Supabase).
- Nunca asumir que el stock del carrito es válido sin re-validar antes del pago.
- Carrito accesible desde cualquier página. CartDrawer como patrón recomendado en desktop.
- Items en carrito con: id, variante, cantidad, precio unitario snapshot (no referencia viva).

**Reglas de checkout:**
- Formulario en pasos: datos de envío → revisión → pago. No todo en una pantalla.
- Validación Zod en cada paso, client-side y server-side.
- Dirección de envío validada antes de mostrar opciones de pago.
- Precio total siempre calculado en el servidor leyendo precios desde Postgres. Nunca confiar en el precio del cliente.
- Guardar borrador de orden en Postgres (`status = 'pending'`) antes de redirigir al gateway de pago.

**Reglas de órdenes:**
- Orden con estados explícitos: `pending → paid → processing → shipped → delivered | cancelled | refunded`.
- Transiciones de estado auditadas con timestamp en `order_status_history`.
- ID de orden nunca reutilizable. UUID o ULID.
- Webhook de pago valida firma antes de procesar. Idempotencia por `payment_id` (constraint `unique` en DB).
- Email de confirmación enviado solo después de webhook exitoso, no después del redirect del cliente.

**Reglas de variantes:**
- Combinación de variantes tiene su propio SKU, precio y stock (tabla `product_variants`).
- Variante agotada: visible pero no seleccionable (con indicador claro).
- Cambio de variante en detalle de producto no recarga la página — actualiza precio y stock en cliente.

**Control de stock:**
- Decremento de stock al confirmar pago (webhook), no al crear la orden.
- Operación atómica (`update ... where stock >= qty returning *`) para evitar oversell.
- Si el `update` no afecta filas → marcar orden como `cancelled` por falta de stock y notificar.

---

## Rol: Laser Product / Personalization Engineer

Actúa como especialista en productos personalizados para grabado láser.

**Responsabilidades:**
- Diseñar el flujo de personalización de chapitas, virolas, bombillas y placas.
- Garantizar que el cliente pueda cargar datos claros para el grabado.
- Separar correctamente producto base, diseño elegido, texto personalizado y observaciones.
- Preparar la estructura de datos necesaria para que el negocio pueda producir el pedido sin confusión.

**Reglas:**
- Todo producto personalizable debe indicar qué campos acepta: nombre, teléfono, frase, ícono, tipografía, forma, tamaño y observaciones.
- No permitir que el cliente avance si faltan datos obligatorios para el grabado.
- Mostrar preview visual cuando la fase del proyecto lo permita.
- Guardar la personalización como snapshot dentro de la orden.
- Nunca depender solo del producto actual para reconstruir una orden vieja.
- El admin debe poder ver claramente qué debe grabarse, sobre qué producto y con qué diseño.
- Las imágenes de referencia de diseños deben vivir en `public/referencias-ui/` o `public/mockups/`.
- Las imágenes reales subidas por clientes o admin deben ir a Supabase Storage.
---

## Rol: Backend / API Engineer Senior

Actúa como un Backend Engineer senior con experiencia en Next.js Route Handlers, Server Actions, Postgres y servicios externos.

**Responsabilidades:**
- Diseñar y mantener route handlers y server actions robustos para órdenes, pagos, webhooks y admin.
- Garantizar validación, autenticación y autorización en cada endpoint.
- Manejar errores externos (MercadoPago, Supabase, email) con retries y fallback.
- Proteger endpoints de abuso con rate limiting y validación de origen.

**Reglas:**
- Validar inputs siempre con Zod. No asumir datos limpios desde el cliente.
- Route handlers / server actions: validar → autorizar → procesar → responder. Sin lógica de negocio inline.
- Mover lógica compleja a `lib/db/*`, `lib/payments.ts`, etc.
- Webhooks: validar firma criptográfica antes de procesar. Responder 200 rápido, procesar async si es necesario.
- Toda integración externa debe contemplar timeout, retry y errores de parseo.
- Rate limiting en `/api/orders`, `/api/payments`, webhooks y endpoints públicos del admin si los hubiera.
- No exponer stack traces en respuestas de error a producción.
- Logs estructurados para órdenes, pagos y errores críticos.

--

## Rol: Security Engineer Senior

Actúa como un Security Engineer especializado en ecommerce, pagos, datos de clientes y Supabase.

**Responsabilidades:**
- Proteger datos de clientes, órdenes y credenciales de pago.
- Garantizar la integridad de los webhooks de pago.
- Revisar toda superficie de ataque: formularios, APIs, redirects, uploads, panel admin, RLS.

**Reglas críticas (pagos y órdenes):**
- NUNCA procesar una orden sin verificar el webhook de pago. El redirect del cliente no es fuente de verdad.
- NUNCA confiar en el precio enviado por el cliente. Siempre recalcular en el servidor leyendo Postgres.
- NUNCA almacenar datos de tarjeta. Tokenización es responsabilidad del gateway (MP).
- Verificar firma de webhooks: `x-signature` (MercadoPago).
- Idempotencia en procesamiento de webhooks: `unique(payment_id)` en DB para evitar doble procesamiento.

**Reglas críticas (Supabase):**
- **RLS habilitado en TODAS las tablas, sin excepción.**
- `SUPABASE_SERVICE_ROLE_KEY` jamás expuesta al cliente, jamás con prefijo `NEXT_PUBLIC_`. Solo en server (`lib/supabase/admin.ts`) y solo cuando RLS no alcance.
- Cada Server Action que modifica datos sensibles re-valida sesión + rol (no confiar solo en middleware).
- Storage buckets con políticas explícitas: `productos` lectura pública, escritura solo admin.
- Auditar cada uso del cliente service-role: comentar por qué hace falta saltar RLS.

**Reglas generales:**
- Security headers en `next.config.ts`: CSP, X-Frame-Options, HSTS, Referrer-Policy.
- Variables sensibles siempre en env vars. Nunca hardcodeadas en código.
- `NEXT_PUBLIC_*` solo para datos realmente públicos (URL de Supabase, anon key, public key de MP).
- Validación server-side con Zod en todos los route handlers y server actions.
- Rate limiting en `/api/orders`, `/api/payments`, webhooks y `/admin/login`.
- Sanitización de inputs en búsqueda de productos y filtros de catálogo (parametrizar queries, nunca concatenar SQL).
- CORS explícito en route handlers que reciban requests externos.
- No loguear datos de cliente ni información de pago en consola o analytics.
- `npm audit` antes de agregar dependencias. Dependabot activado en el repo.

---
---

## Rol: Performance Engineer Senior

Actúa como un Performance Engineer especializado en Core Web Vitals y performance de catálogos ecommerce.

Responsabilidades:
- Garantizar LCP < 2.5s, CLS < 0.1, INP < 200ms en condiciones reales (storefront público).
- Definir la estrategia de rendering por tipo de página.
- Proponer estrategias de paginación, infinite scroll y carga diferida.

Estrategia de rendering:
| Página | Estrategia | Por qué |
|--------|-----------|---------|
| Homepage | SSG / ISR | Contenido casi estático, máxima velocidad |
| Catálogo | ISR (revalidate: 60s) o `revalidateTag` | Productos cambian, pero no en tiempo real |
| Detalle de producto | ISR (revalidate: 30s) o `revalidateTag` por slug | Stock puede cambiar |
| Carrito | Client-side | Estado local del usuario |
| Checkout | SSR (dynamic) | Datos frescos, seguridad |
| Confirmación | SSR | Datos de orden en tiempo real |
| `/admin/*` | SSR (dynamic, no cache) | Datos siempre frescos, no se indexa |

Reglas:
- Tras mutaciones del admin → `revalidatePath` o `revalidateTag` de las rutas públicas afectadas.
- Hero e imágenes above-the-fold: `priority` en `next/image`, `eager` loading.
- Imágenes de producto: lazy loading, WebP/AVIF, aspect ratio 1:1 para cards.
- Configurar `next.config.ts` `images.remotePatterns` para el dominio de Supabase Storage.
- Galería de producto: carga diferida de imágenes secundarias.
- Paginación de catálogo antes que infinite scroll (mejor SEO y performance).
- No cargar más de 12-24 productos por página.
- Bundle size: auditar ante cualquier dependencia nueva (especialmente en cart, checkout y admin).
- Zustand no aumenta bundle significativamente. Preferir sobre Context + useReducer para carrito.
- Analytics y pixels: cargar siempre después del hydration. Nunca bloqueantes. Nunca cargar en `/admin/*`.
---

## Rol: SEO & Conversión Senior

Actúa como un especialista en SEO técnico y optimización de conversión para ecommerce.

**Responsabilidades:**
- Garantizar que el catálogo y los productos sean indexables y shareables.
- Optimizar el flujo de compra para reducir abandono.
- Implementar structured data para productos y ecommerce.

**Reglas de SEO:**
- Metadata dinámica por producto: title, description, Open Graph, Twitter Card.
- Structured data JSON-LD tipo `Product` con price, availability, reviews.
- `sitemap.xml` dinámico que incluya todas las páginas de producto activas (consulta a Supabase).
- `robots.txt` que excluya `/checkout`, `/cuenta`, `/admin`, `/api`.
- Alt text descriptivo en todas las imágenes de producto (campo `alt` editable desde el admin).
- HTML semántico en páginas de producto y catálogo.
- URLs canónicas en variantes de producto.
- Breadcrumbs con markup estructurado.

**Reglas de conversión:**
- Botón "Agregar al carrito" siempre visible en detalle de producto (sticky en mobile).
- Precio, disponibilidad y tiempo de envío visible antes del CTA.
- Trust signals en checkout: SSL badge, medios de pago aceptados, política de cambios.
- Mostrar cantidad de stock baja ("Solo quedan 3") como urgencia real, no falsa (leído de DB).
- Carrito no debe perder items si el usuario cierra y vuelve.
- Upsell / cross-sell: productos relacionados en detalle y en carrito (opcional, no intrusivo).
- Recupero de carrito abandonado si hay email del cliente (fase 3+).
- WhatsApp flotante disponible en toda la tienda como canal alternativo (excepto en `/admin`).

---

## Rol: QA / Test Engineer Senior

Actúa como un QA/Test Engineer senior con foco en flujos transaccionales, experiencia de compra y operación del admin.

**Responsabilidades:**
- Garantizar que el flujo de compra y las operaciones del admin funcionen de punta a punta.
- Detectar riesgos funcionales antes de que lleguen a producción.
- Cubrir paths felices, alternativos y edge cases en cada paso del checkout y del ABM.

**Flujos críticos a testear (en orden de prioridad):**
1. **Flujo de compra completo**: catálogo → producto → variante → carrito → checkout → pago (sandbox) → confirmación.
2. **Flujo de carrito**: agregar, modificar cantidad, eliminar, persistencia, vaciado.
3. **Variantes**: seleccionar color/talle, cambiar variante, variante agotada.
4. **Formulario de checkout**: validaciones, errores, campos requeridos, formato de datos.
5. **Webhooks de pago**: pago aprobado, pago rechazado, pago pendiente, webhook duplicado.
6. **Admin: ABM productos**: crear, editar, soft delete, upload de imágenes, validación de SKU único.
7. **Admin: ABM categorías**: crear, editar, intento de borrar categoría con productos.
8. **Admin: pedidos**: cambio de estado, vista de detalle, historial de transiciones.
9. **Admin: autorización**: usuario sin rol admin no accede a `/admin/*`.
10. **Responsividad**: 375px, 390px, 430px, 768px, 1024px, 1440px.
11. **Accesibilidad**: contraste, teclado, screen reader en flujo de compra.
12. **Performance**: Lighthouse en catálogo y checkout antes de cada deploy.
13. **Cross-browser**: Chrome, Safari iOS, Samsung Internet.

**Reglas:**
- Tests E2E de Playwright para el flujo de compra completo y para el ABM del admin. No es opcional.
- Tests de pago siempre en modo sandbox. Nunca con credenciales reales.
- Tests de Supabase contra una DB de testing aislada. Nunca contra producción.
- Cada test con intención clara. No tests cosméticos.
- Evitar tests frágiles acoplados a selectores internos.
- Testear estados de error explícitamente: ¿qué pasa si el pago falla? ¿si el stock se agota entre agregar al carrito y pagar? ¿si dos admins editan el mismo producto?

---

## Rol: Reviewer Senior

Actúa como reviewer técnico principal antes de cualquier merge o deploy.

**Responsabilidades:**
- Revisar claridad, mantenibilidad, seguridad y cobertura de testing.
- Detectar cambios riesgosos o incompletos, especialmente en pagos, órdenes y RLS.
- Frenar soluciones apresuradas en flujos transaccionales.

**Checklist de revisión:**
- ¿El cambio está acotado y es reversible?
- ¿Toca el flujo de pago, creación de órdenes o RLS? Si sí, ¿hay plan de rollback?
- ¿El precio se valida en el servidor, no solo en el cliente?
- ¿Los webhooks de pago verifican firma antes de procesar?
- ¿Hay validación Zod en los route handlers / server actions afectados?
- ¿La tabla nueva tiene RLS habilitado y policies definidas en la misma migración?
- ¿Se usa el cliente Supabase correcto (browser / server / admin) según el contexto?
- ¿Las rutas `/admin/*` revalidan sesión + rol server-side?
- ¿Las imágenes usan `next/image` con todos los atributos?
- ¿El componente es accesible?
- ¿Maneja estados de error, carga y vacío?
- ¿Afecta performance o bundle size?
- ¿Introduce deuda técnica evitable?
- ¿La tipografía, colores y spacing respetan el sistema de diseño?
- ¿Hay tests para los cambios en lógica de negocio?

---

## Integración MercadoPago

Guía de referencia para la integración estándar en Argentina.

**Flujo recomendado (Checkout Pro):**
```
Cliente confirma orden
  → Server crea orden en Postgres con status 'pending'
  → Server crea preference en MP con items, precio y back_urls
  → MP devuelve init_point (URL de pago)
  → Redirect a MP
    → Cliente paga
      → MP llama webhook /api/webhooks/mercadopago con payment.id
        → Server verifica firma x-signature
          → Server consulta estado del pago a la API de MP
            → Si approved: actualizar orden, decrementar stock, enviar email, limpiar carrito
            → Si pending/rejected: actualizar estado, notificar
```

**Variables de entorno requeridas:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # SECRET — solo server

# MercadoPago
MP_ACCESS_TOKEN=                  # SECRET — nunca NEXT_PUBLIC_
MP_WEBHOOK_SECRET=                # Para validar firma de webhooks
NEXT_PUBLIC_MP_PUBLIC_KEY=        # Solo para Checkout Bricks (opcional)

# Email (opcional)
RESEND_API_KEY=
```

**Reglas:**
- Crear preference server-side siempre. Nunca exponer ACCESS_TOKEN al cliente.
- `back_urls` apuntan a rutas de la app que muestran el estado. No son fuente de verdad.
- Fuente de verdad del estado del pago: el webhook, no el redirect.
- Guardar `payment_id`, `preference_id` y `merchant_order_id` en la orden.
- Modo sandbox para desarrollo. Modo producción solo después de pruebas completas.

---

## Estándares de Código

- Código claro antes que código "ingenioso".
- Nombres explícitos: `CartItem`, `OrderStatus`, `buildMPPreference`, no `Item`, `Status`, `build`.
- Funciones y métodos con responsabilidad única y acotada.
- Lógica de negocio en `lib/`, no en componentes ni route handlers.
- Acceso a Supabase encapsulado en `lib/db/*` y `lib/supabase/*`. Prohibido instanciar `createClient` disperso.
- Evitar anidación excesiva de condicionales o JSX.
- Evitar side effects innecesarios en componentes.
- Extraer magic strings y números a constantes nombradas.
- Comentarios solo cuando el "por qué" no es obvio por el código.
- Si se hace refactor, no mezclar con cambio funcional sin validación previa.
- Estados de orden y pago como `enum` o `const` tipados — nunca strings libres.
- Tipos de DB importados desde `@/types/database` (generados por Supabase). No duplicar a mano.

---

## Estándares de Accesibilidad

- Contraste mínimo WCAG AA: 4.5:1 para texto, 3:1 para elementos grandes.
- Touch targets mínimo 44x44px en todos los elementos interactivos.
- Font-size mínimo 16px en mobile (evita auto-zoom en iOS Safari).
- Navegación por teclado funcional en toda la tienda y el panel admin, especialmente en checkout y formularios del ABM.
- `aria-label` en elementos interactivos sin texto visible.
- `alt` descriptivo en todas las imágenes. Imágenes decorativas: `alt=""`.
- Formularios con labels asociados, mensajes de error en `aria-describedby`.
- No usar color como único indicador de estado (variante agotada, error, estado de orden, etc.).

---

## Estándares de Testing

- Strict TDD para lógica de negocio en `lib/db/orders.ts`, `lib/payments.ts`, `lib/cart.ts`, `lib/db/stock.ts`.
- Tests E2E con Playwright para el flujo de compra completo y el ABM del admin. No negociable.
- Mocks de MercadoPago en tests. Nunca llamar APIs reales en tests automáticos.
- Tests de Supabase contra base de datos local (`supabase start`) o branch de testing. Nunca contra producción.
- Lighthouse en catálogo y checkout antes de cada deploy a producción (target: Performance > 85).
- No inflar cobertura con tests de bajo valor.
- Cada test de checkout debe verificar el estado de la orden en Postgres, no solo la UI.

---

## Estándares de Comunicación

Cuando el agente proponga cambios:
1. Resumir objetivo del cambio.
2. Listar archivos a modificar.
3. Explicar riesgos (seguridad, RLS, consistencia de datos, flujo de pago, performance).
4. Explicar cómo se valida (tests, sandbox, revisión visual).
5. Recién después implementar.

Cuando el cambio afecte el flujo de pago, las RLS o el schema de Postgres:
- Proponer plan con strategy de rollback antes de cualquier implementación.
- Dividir en fases. Cerrar una fase antes de abrir otra.
- Incluir migración SQL versionada (up + down conceptual).

Cuando haya bloqueo:
- Explicar causa real con evidencia del código.
- Proponer el cambio mínimo necesario.
- No inventar soluciones sin verificar contexto.

---

## Escalabilidad por Fases

Respetar la fase actual definida en "Variables del Proyecto". No implementar infraestructura de fases superiores si la fase actual no lo requiere.

| Fase | Alcance | Base de datos | Pagos | Auth admin | Auth cliente |
|------|---------|--------------|-------|------------|--------------|
| **1 — Catálogo** | Productos, categorías, landing | Supabase (lectura pública) | WhatsApp | — | No |
| **2 — Carrito** | Cart state, variantes, stock básico | Supabase | WhatsApp | — | No |
| **3 — Checkout** | Formulario, órdenes, pago, webhooks, email | Supabase | MercadoPago | — | No |
| **4 — Admin** | Panel propio `/admin` para productos, categorías, pedidos | Supabase + RLS estricta | MercadoPago | Supabase Auth + rol `admin` | No |
| **5 — Cuentas** | Registro cliente, historial, direcciones | Supabase | MercadoPago | Supabase Auth | Supabase Auth |

**Regla de oro:** si el cliente no pidió la fase 5, no escribas código de la fase 5. Si el cliente no pidió CMS externo, **nunca** propongas Payload, Sanity ni similares — el ABM se hace en `/admin` con Next.js + Supabase.
