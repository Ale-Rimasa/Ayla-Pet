'use client'

import { useEffect } from 'react'
import { useCartStore } from './cart.store'
import { useCheckoutStore } from './checkout.store'

export function ZustandProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useCartStore.persist.rehydrate()
    useCheckoutStore.persist.rehydrate()
  }, [])

  return <>{children}</>
}
