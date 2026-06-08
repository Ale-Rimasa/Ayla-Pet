'use client'

import Image from 'next/image'
import { CreditCard, Banknote } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function PaymentMethodsAccordion() {
  return (
    <Accordion multiple={false}>
      <AccordionItem value="pago" className="border rounded-lg px-4">
        <AccordionTrigger className="py-4 no-underline hover:no-underline">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Medios de pago
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-4 space-y-3">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Image
              src="/images/mercadopago-logo.svg"
              alt="Mercado Pago"
              width={80}
              height={24}
              className="mt-0.5 h-6 w-auto"
            />
            <div>
              <p className="text-sm font-medium">Mercado Pago</p>
              <p className="text-xs text-muted-foreground">
                Pagá de forma segura con tarjeta de débito, crédito y más.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Banknote className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Transferencia bancaria</p>
              <p className="text-xs text-green-600 font-medium">10% Descuento</p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
