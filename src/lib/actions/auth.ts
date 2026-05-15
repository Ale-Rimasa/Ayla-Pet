'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { claimGuestOrders } from '@/lib/db/profiles'
import { SignInSchema, SignUpSchema } from '@/lib/validations'
import type { SignInValues, SignUpValues } from '@/lib/validations'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export type LoginState = { error: string } | null

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (!await checkRateLimit(`admin-login:${ip}`, 10, 60_000)) {
    return { error: 'Demasiados intentos. Esperá un minuto.' }
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Email o contraseña inválidos' }

  const { email, password } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email o contraseña incorrectos' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No se pudo verificar la sesión' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'No tenés permisos de administrador' }
  }

  redirect('/admin')
}

export async function logoutAction(): Promise<never> {
  const supabase = await createClient()

  await supabase.auth.signOut()
  revalidatePath('/admin', 'layout')
  redirect('/admin/login')
}

export type CustomerAuthResult = { ok: true } | { ok: false; error: string }

export async function signInAction(
  input: SignInValues,
  nextPath = '/cuenta'
): Promise<CustomerAuthResult> {
  const parsed = SignInSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation_error' }

  const supabase = await createClient()
  const { email, password } = parsed.data
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'auth_error' }
  }

  await claimGuestOrders(data.user.id, data.user.email ?? email)
  redirect(nextPath)
}

export async function signUpAction(
  input: SignUpValues,
  nextPath = '/cuenta'
): Promise<CustomerAuthResult> {
  const parsed = SignUpSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'validation_error' }

  const supabase = await createClient()
  const { name, email, password } = parsed.data
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'auth_error' }
  }

  if (!data.session) {
    redirect('/cuenta/verificar')
  }

  await claimGuestOrders(data.user.id, data.user.email ?? email)
  redirect(nextPath)
}

export async function signOutAction(): Promise<never> {
  const supabase = await createClient()

  await supabase.auth.signOut()
  redirect('/')
}
