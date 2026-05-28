# Storage Setup

## Prerequisito para migration 009

Antes de ejecutar `pnpm db:push` o aplicar `009_storage_policies.sql`,
crear los siguientes buckets en el Dashboard de Supabase:

1. Ir a Storage en el Dashboard de Supabase
2. Crear bucket `productos` — público: NO (las políticas lo manejan)
3. Crear bucket `categorias` — público: NO
4. Crear bucket `marca` — público: NO

Los buckets deben ser creados con acceso privado.
La migración 009 crea las policies de lectura pública y escritura admin.

## Prerequisito para migration 028

Antes de aplicar `028_storage_hero_policies.sql`, crear el bucket `hero`:

1. Ir a Storage en el Dashboard de Supabase
2. Crear bucket `hero` — público: NO (las políticas lo manejan)

El bucket debe crearse con acceso privado.
La migración 028 crea las 4 policies para el bucket `hero`:
- SELECT público (cualquier visitante puede ver las imágenes del carrusel)
- INSERT / UPDATE / DELETE solo para usuarios con `is_admin(auth.uid()) = true`
