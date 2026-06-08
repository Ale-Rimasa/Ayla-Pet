'use client'

import { Truck } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function ShippingQuoteAccordion() {
  return (
    <Accordion multiple={false}>
      <AccordionItem value="envio" className="border rounded-lg px-4">
        <AccordionTrigger className="py-4 no-underline hover:no-underline">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Medios de envío
          </div>
        </AccordionTrigger>

        <AccordionContent className="pb-4 space-y-4 text-sm">
          <p className="text-muted-foreground">
            Ofrecemos envíos con{' '}
            <strong className="text-foreground">Correo Argentino</strong> y{' '}
            <strong className="text-foreground">Andreani</strong>.
          </p>

          <div className="space-y-1.5">
            <p className="font-medium">Tipo de entrega</p>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>• Domicilio</li>
              <li>• Sucursal</li>
              <li>• Retiro en Parque Patricio</li>
              <li>• Retiro en Gral. Pacheco</li>
              <li>• Retiro en Nordelta</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="font-medium">Correo Argentino</p>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>
                • <strong className="text-foreground">PAQ.AR Expreso</strong> — 1 a 3 días hábiles (una vez despachado)
              </li>
              <li>
                • <strong className="text-foreground">PAQ.AR Clásico</strong> — 2 a 5 días hábiles (una vez despachado)
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <p className="font-medium">Andreani</p>
            <ul className="space-y-1 text-muted-foreground pl-1">
              <li>• Te enviamos el link de pago y elegís la modalidad dentro de Andreani.</li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
