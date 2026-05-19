import type { Metadata } from 'next'
import Image from 'next/image'
import { BRAND } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Quiénes somos',
  description: `Conocé la historia detrás de ${BRAND.name}.`,
}

export default function QuienesSomosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-4xl font-bold text-[#111111] mb-10">
        Quiénes somos
      </h1>

      {/* Imagen 1 */}
      <div className="mb-10 overflow-hidden rounded-2xl bg-[#FAF7F2] border border-[#E7DCCF] aspect-[16/7] flex items-center justify-center">
        {/* Reemplazá src con la ruta de tu imagen, ej: /quienes-somos-1.jpg */}
        <p className="text-sm text-[#6B6258]">Imagen 1</p>
      </div>

      <div className="space-y-6 text-[#3D3530] text-base leading-relaxed">
        <p className="text-lg font-semibold text-[#111111]">¡Hola! Somos {BRAND.name}</p>

        <p>
          Creamos piezas personalizadas para que puedas llevar siempre con vos a ese compañero
          que ocupa un lugar enorme en tu vida. Sabemos que una mascota no es "solo una mascota":
          es familia, compañía, amor incondicional y parte de nuestra historia.
        </p>

        <p>
          Cada producto que hacemos nace con mucho cuidado, paciencia y dedicación. Nos gusta
          pensar que detrás de cada grabado hay un recuerdo, una mirada, una personalidad única
          y un vínculo que merece ser celebrado.
        </p>

        <p>
          Trabajamos cada diseño de forma especial, buscando que conserve la esencia de tu
          mascota y que el resultado sea delicado, lindo y duradero. Desde la imagen que nos
          compartís hasta el grabado final, cuidamos cada detalle para que recibas una pieza
          hecha con amor.
        </p>

        <p>
          En {BRAND.name} creemos que los pequeños objetos también pueden guardar grandes emociones.
          Por eso hacemos cada chapita, llavero, medallita o accesorio como si fuera único,
          porque para vos también lo es.
        </p>

        <p className="font-medium text-[#111111]">
          Gracias por confiar en nosotras para transformar ese amor tan grande en un recuerdo
          que puedas llevar siempre cerca. 🤍
        </p>
      </div>

      {/* Imagen 2 */}
      <div className="mt-10 overflow-hidden rounded-2xl bg-[#FAF7F2] border border-[#E7DCCF] aspect-[16/7] flex items-center justify-center">
        {/* Reemplazá src con la ruta de tu imagen, ej: /quienes-somos-2.jpg */}
        <p className="text-sm text-[#6B6258]">Imagen 2</p>
      </div>
    </main>
  )
}
