import { Heart, Shield, Truck, Wrench } from 'lucide-react'

const benefits = [
  {
    icon: Wrench,
    title: 'Grabado permanente',
    description: 'No se borra con el uso ni con el tiempo',
  },
  {
    icon: Shield,
    title: 'Material resistente',
    description: 'Acero inoxidable y dorado de alta calidad',
  },
  {
    icon: Truck,
    title: 'Envíos a todo el país',
    description: 'Recibí tu pedido en la puerta de tu casa',
  },
  {
    icon: Heart,
    title: 'Hecho con amor',
    description: 'Cada producto es único y hecho especialmente para vos',
  },
]

export function ProductTrustBar() {
  return (
    <div className="grid grid-cols-2 gap-4 border-y py-6 md:grid-cols-4">
      {benefits.map((benefit) => (
        <div key={benefit.title} className="flex items-start gap-3">
          <benefit.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{benefit.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{benefit.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
