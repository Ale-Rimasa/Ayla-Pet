# Skill Registry — Ayla Pets
_Generated: 2026-05-20_

## User Skills

| Skill | Triggers |
|-------|----------|
| `branch-pr` | Creating pull requests, opening PRs |
| `judgment-day` | Adversarial dual review: "judgment day", "doble review" |
| `ui-ux-pro-max` | UI/UX design, component creation, design systems, styling |
| `skill-creator` | Creating new AI skills |

## SDD Skills (orchestrator-only)

| Skill | Phase |
|-------|-------|
| `sdd-explore` | Investigation, codebase research |
| `sdd-propose` | Change proposal |
| `sdd-spec` | Specifications (Given/When/Then) |
| `sdd-design` | Technical design |
| `sdd-tasks` | Task breakdown |
| `sdd-apply` | Implementation |
| `sdd-verify` | Validation against specs |
| `sdd-archive` | Close and persist change |

## Project Convention Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project config, stack, SDD rules, brand |
| `AGENTS.md` | Agent operating rules, senior standards |

## Compact Rules

### Security
- requireAdmin() en TODA Server Action admin antes de cualquier logica
- createAdminClient() solo en generateStaticParams/jobs/scripts (sin cookies)
- Validar mimetype + tamano en uploads: jpeg/png/webp/avif, max 5MB
- Nunca aceptar paths de storage desde el cliente — crypto.randomUUID() server-side

### Data Layer
- Precios en centavos ARS (integer, nunca float)
- Soft delete idempotente: .is('deleted_at', null) en updates
- revalidateTag(tag, {}) — segundo argumento requerido en Next.js 16
- ILIKE escape: slice(0,100) -> escape \ -> escape % -> escape _

### Testing (Strict TDD — lib/actions/*, lib/db/orders, stock, payments, webhooks)
- Test runner: pnpm test (Vitest + jsdom)
- E2E: pnpm test:e2e (Playwright)
- Tests en tests/unit/ — mismo path relativo que el archivo fuente

### Stack
- Next.js 16.2.4, React 19, TypeScript 5, Supabase, Tailwind v4, @base-ui/react
- shadcn SelectContent: NO acepta prop position (API de Radix, no Base UI)
- Zod v4, React Hook Form para forms admin
