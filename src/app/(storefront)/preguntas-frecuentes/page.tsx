import type { Metadata } from 'next'
import { BRAND } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: `Todo lo que necesitás saber antes de hacer tu pedido en ${BRAND.name}.`,
}

const FAQS = [
  {
    q: '¿Cómo es el proceso de personalización?',
    a: 'Es super simple. Una vez que realizas tu compra y subis tu foto te contactamos por WhatsApp para el asesoramiento de diseño.',
  },
  {
    q: '¿Puedo ver cómo va a quedar antes de que lo fabriquen?',
    a: '¡Sí! Esa es nuestra regla de oro. Dentro de las primeras 24 hs te enviamos un Preview Digital del grabado. No pasamos a producción hasta que nos des el "ok", asegurando que el diseño final sea perfecto.',
  },
  {
    q: '¿Cuánto demora en estar listo?',
    a: 'Trabajamos sin stock genérico — cada pieza se crea bajo pedido. Una vez aprobado el diseño, tu pedido se fabrica y se despacha entre 24 y 48 hs hábiles.',
  },
  {
    q: '¿Tienen cambio o devolución?',
    a: 'Al ser un producto diseñado y fabricado exclusivamente con los datos de tu mascota, no realizamos cambios ni devoluciones por arrepentimiento. Sin embargo, tu compra está 100% protegida por nuestra Garantía de Exactitud: si el producto presenta una falla de fabricación o difiere de la foto pre-envío, lo rehacemos sin costo. Solo te pedimos que nos avises dentro de las 48 hs de haberlo recibido.',
  },
  {
    q: '¿Cómo son los envíos y las entregas?',
    a: 'Operamos 100% online y hacemos envíos a todo el país 🇦🇷\n\n• ENVÍO GRATIS en compras superiores a $30.000.\n• Si estás cerca podés elegir retiro sin cargo coordinando previamente por WhatsApp.\n\nLos envíos por moto-mensajería se despachan en el día si la compra es antes de las 12:00 hs. Caso contrario entra para el siguiente día hábil (lunes a sábado).',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Ofrecemos opciones seguras para que elijas la que mejor te quede:\n\n• Tarjetas de crédito y débito.\n• Mercado Pago.\n• Transferencia bancaria.',
  },
  {
    q: '¿Es seguro comprar en la tienda?',
    a: 'Totalmente. Tu información está encriptada, protegida y se utiliza únicamente para procesar y enviar tu pedido.',
  },
]

export default function PreguntasFrecuentesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-4xl font-bold text-[#111111] mb-4">
        Preguntas frecuentes
      </h1>
      <p className="text-base text-[#6B6258] mb-12">
        Todo lo que necesitás saber antes de hacer tu pedido.
      </p>

      <div className="divide-y divide-[#E7DCCF]">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group py-5"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 list-none text-base font-semibold text-[#111111] hover:text-[#B68A57] transition-colors">
              {faq.q}
              {/* Chevron */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E7DCCF] text-[#6B6258] transition-transform duration-200 group-open:rotate-180">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </summary>

            <div className="mt-4 pr-10">
              {faq.a.split('\n').map((line, i) =>
                line === '' ? (
                  <div key={i} className="h-2" />
                ) : (
                  <p key={i} className="text-sm text-[#6B6258] leading-relaxed">
                    {line}
                  </p>
                )
              )}
            </div>
          </details>
        ))}
      </div>
    </main>
  )
}
