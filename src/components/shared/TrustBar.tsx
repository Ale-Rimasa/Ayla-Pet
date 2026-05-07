import { Truck, ShieldCheck, CreditCard, MessageCircle } from 'lucide-react'

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: 'Envíos a todo el país',
    description: 'Correo Argentino y Andreani',
  },
  {
    icon: ShieldCheck,
    title: 'Compra segura',
    description: 'Tus datos protegidos siempre',
  },
  {
    icon: CreditCard,
    title: 'Pagá con MercadoPago',
    description: 'Hasta 12 cuotas sin interés',
  },
  {
    icon: MessageCircle,
    title: 'Atención por WhatsApp',
    description: 'Respondemos rápido',
  },
]

export function TrustBar() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <li key={item.title} className="flex flex-col items-center gap-2 text-center">
              <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
