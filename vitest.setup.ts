import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SITE_NAME: 'Test Store',
    NEXT_PUBLIC_WHATSAPP_NUMBER: '5491132565412',
    NEXT_PUBLIC_INSTAGRAM_URL: 'https://instagram.com/test',
    MP_ACCESS_TOKEN: 'test-mp-token',
    MP_WEBHOOK_SECRET: 'test-mp-secret',
    RESEND_API_KEY: 'test-resend-key',
    RESEND_FROM_EMAIL: 'test@example.com',
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: (_props: { src: string; alt: string }) => null,
}))
