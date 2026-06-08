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
        <p>
          En {BRAND.name} creamos piezas personalizadas pensadas para guardar recuerdos, nombres,
          fechas, imágenes e historias que tienen un significado especial. Creemos que un objeto
          puede ser mucho más que un accesorio: puede representar una persona, una mascota, un
          momento, una etapa de la vida o un regalo hecho con amor.
        </p>

        <p>
          Cada producto que hacemos nace con cuidado, paciencia y dedicación. Nos gusta pensar
          que detrás de cada grabado hay una historia única: una mirada, una frase, una inicial,
          una fecha importante o un recuerdo que merece ser conservado de una forma especial.
        </p>

        <p>
          Trabajamos cada diseño de manera personalizada, buscando que el resultado sea delicado,
          prolijo y duradero. Desde la idea que nos compartís hasta el producto final, cuidamos
          cada detalle para que recibas una pieza hecha con dedicación y pensada especialmente
          para vos.
        </p>

        <p>
          En {BRAND.name} creemos que los pequeños objetos también pueden guardar grandes emociones.
          Por eso hacemos cada mate, llavero, chapita, medallita o accesorio como si fuera único,
          porque para quien lo recibe también lo es.
        </p>

        <p className="font-medium text-[#111111]">
          Gracias por confiar en nosotras para transformar tus recuerdos, vínculos y momentos
          importantes en piezas que puedas llevar, regalar o conservar siempre cerca. 🤍
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
