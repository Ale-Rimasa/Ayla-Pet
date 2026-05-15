'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signInAction } from '@/lib/actions/auth'
import { SignInSchema, type SignInValues } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginFormProps {
  nextPath?: string
}

export function LoginForm({ nextPath = '/cuenta' }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
  })

  const onSubmit = (values: SignInValues) => {
    setError(null)
    startTransition(async () => {
      const result = await signInAction(values, nextPath)
      if (!result.ok) setError('Email o contraseña incorrectos.')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>}
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}

      <Button type="submit" size="lg" className="w-full bg-[#111111] text-white hover:bg-[#111111]/90" disabled={isPending}>
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </Button>

      <p className="text-center text-sm text-[#6B6258]">
        ¿No tenés cuenta?{' '}
        <Link href="/cuenta/registro" className="font-semibold text-[#B68A57] hover:underline">
          Registrate
        </Link>
      </p>
    </form>
  )
}
