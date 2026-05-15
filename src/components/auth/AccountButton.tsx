'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import { User as UserIcon } from 'lucide-react'
import { signOutAction } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function AccountButton() {
  const [user, setUser] = useState<User | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!user) {
    return (
      <Link
        href="/cuenta/login"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-[#6B6258] transition-colors hover:bg-[#F5EFE6]"
        aria-label="Ingresar a mi cuenta"
      >
        <UserIcon className="h-4.5 w-4.5" aria-hidden="true" />
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/cuenta"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-[#6B6258] transition-colors hover:bg-[#F5EFE6]"
        aria-label="Mi cuenta"
      >
        <UserIcon className="h-4.5 w-4.5" aria-hidden="true" />
        <span className="hidden sm:inline">Mi cuenta</span>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden rounded-full text-[#6B6258] hover:bg-[#F5EFE6] sm:inline-flex"
        disabled={isPending}
        onClick={() => startTransition(async () => signOutAction())}
      >
        Salir
      </Button>
    </div>
  )
}
