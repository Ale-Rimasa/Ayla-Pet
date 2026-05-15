'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpAction } from '@/lib/actions/auth'
import { SignUpSchema, type SignUpValues } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm() {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
  })

  const onSubmit = (values: SignUpValues) => {
    setMessage(null)
    startTransition(async () => {
      const result = await signUpAction(values)
      if (!result.ok) setMessage('No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre completo</Label>
        <Input id="name" autoComplete="name" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive" role="alert">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
        {errors.email && <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} />
        {errors.password && <p className="text-xs text-destructive" role="alert">{errors.password.message}</p>}
      </div>

      {message && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{message}</p>}

      <Button type="submit" size="lg" className="w-full bg-[#111111] text-white hover:bg-[#111111]/90" disabled={isPending}>
        {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>

      <p className="text-center text-sm text-[#6B6258]">
        ¿Ya tenés cuenta?{' '}
        <Link href="/cuenta/login" className="font-semibold text-[#B68A57] hover:underline">
          Ingresá
        </Link>
      </p>
    </form>
  )
}
