import type { ReactNode } from 'react'
import { requireCustomer } from '@/lib/auth'

export default async function CuentaLayout({ children }: { children: ReactNode }) {
  await requireCustomer('/cuenta')

  return <div className="bg-[#FAF7F2]/40">{children}</div>
}
