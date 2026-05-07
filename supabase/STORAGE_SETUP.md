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
