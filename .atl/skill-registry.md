# Skill Registry — pet-laser-ecommerce

Generated: 2026-05-09
Project: pet-laser-ecommerce (D:\Ecommerce Pet Laser)
Engram project: pet-laser-ecommerce

---

## Trigger Table

| Trigger | Skill | Path |
|---------|-------|------|
| UI/UX design, component creation, design systems, color/font selection, accessibility review, responsive layout | `ui-ux-pro-max` | `~/.claude/skills/ui-ux-pro-max/SKILL.md` |
| Creating a pull request, opening a PR, preparing changes for review | `branch-pr` | `~/.claude/skills/branch-pr/SKILL.md` |
| "judgment day", "dual review", "doble review", "juzgar", "que lo juzguen" | `judgment-day` | `~/.claude/skills/judgment-day/SKILL.md` |
| Creating a GitHub issue, reporting a bug, requesting a feature | `issue-creation` | `~/.claude/skills/issue-creation/SKILL.md` |
| Creating a new AI skill, adding agent instructions | `skill-creator` | `~/.claude/skills/skill-creator/SKILL.md` |

---

## Compact Rules

### ui-ux-pro-max
- Match visual style to product type: artisanal/handmade → warm palettes, serif headings, textured feel
- This project: primario #111111, secundario #F5EFE6, acento #B68A57, fondo #FAF7F2 — NEVER deviate without user approval
- Estilo: rústico, cálido, artesanal, premium — NO templates SaaS genéricos, NO colores saturados
- Typography: headings → serif (Playfair Display / Cormorant Garamond / Fraunces), body → sans-serif (Inter / Lato)
- Mobile-first: CTA principal siempre visible en 375px, touch targets mínimo 44×44px
- WCAG AA: contraste 4.5:1 texto, 3:1 elementos grandes
- Imágenes: siempre next/image, lazy por defecto, priority solo en above-the-fold
- No sobrecargar home con demasiadas secciones — priorizar conversión

### branch-pr
- Every PR must reference a GitHub issue (issue-first enforcement)
- PR title: imperative mood, under 70 chars
- PR body: Summary (3 bullets max) + Test plan (checklist) + Co-authored-by line
- Never push directly to main/master — always branch + PR

### judgment-day
- Launches 2 blind independent judge sub-agents simultaneously (same target, no shared context)
- Synthesizes findings → applies fixes → re-judges both until both pass or 2 iterations exceeded
- Use before any significant merge: payments, RLS, webhook, order flow, admin mutations

### issue-creation
- Issue requires: title (imperative, ≤70 chars), description, acceptance criteria, labels
- Bug issues: include steps to reproduce + expected vs actual behavior
- Feature issues: include user story + acceptance criteria + scope boundaries

---

## Project Conventions (from AGENTS.md + CLAUDE.md)

### Architecture
- `lib/db/*` — all Supabase queries; NEVER instantiate client outside `lib/supabase/*`
- `lib/actions/*` — Server Actions only; each validates session + role + input (Zod) + revalidatePath
- `lib/supabase/admin.ts` — service role, SERVER ONLY; document every usage
- `store/` — Zustand for cart + checkout only; persist keys: `pet-laser-cart-v1`, `pet-laser-checkout-v1`
- `proxy.ts` — Next.js 16 proxy (renamed from middleware.ts); exports `proxy()` + `proxyConfig`
- Prices always in centavos (integer). NEVER float for money.

### Admin Panel Rules
- Every `/admin/*` route: re-validate session + role server-side, not just via proxy
- Mutations: Server Actions only (no internal fetch to route handlers for CRUD)
- Tables: pagination + search + filters ALL server-side — never load full dataset
- Soft delete (`deleted_at`) preferred over physical DELETE for products/categories

### Testing (Strict TDD — ENABLED)
- Strict TDD applies to: `lib/db/orders.ts`, `lib/payments.ts`, `lib/cart.ts`, `lib/db/stock.ts`, `lib/actions/*`, any migration touching RLS
- UI-only changes: SDD optional, TDD not required
- Unit tests: `tests/unit/` with Vitest + jsdom
- E2E tests: `tests/e2e/` with Playwright (Chromium, Mobile Safari, Mobile Chrome)
- Supabase mock: `tests/helpers/supabase-mock.ts` — use `createSupabaseMock()` + `mockAdminClient()`
- Never call real Supabase/MP APIs in tests

### Security Rules
- `SUPABASE_SERVICE_ROLE_KEY` — server only, never `NEXT_PUBLIC_*`
- Webhook: verify `x-signature` HMAC before processing anything
- Idempotency: `unique(mp_payment_id)` in DB catches 23505
- RLS: enabled on ALL tables, no exceptions
- Price ALWAYS recalculated server-side from Postgres — never trust client price

### Rendering Strategy
| Route | Strategy |
|-------|----------|
| Homepage | ISR (revalidate: 300s) |
| Catálogo | ISR (revalidate: 60s) |
| Producto | ISR (revalidate: 30s) |
| Carrito | Client-side |
| Checkout | SSR (dynamic) |
| `/admin/*` | SSR (no cache) |
