import type { Metadata } from 'next'
import { BRAND } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: `Términos y condiciones de compra en ${BRAND.name}, conforme a la Ley 24.240 de Defensa del Consumidor.`,
}

const LAST_UPDATED = '20 de junio de 2026'

export default function TerminosYCondicionesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-4xl font-bold text-[#111111] mb-3">
        Términos y condiciones
      </h1>
      <p className="text-sm text-[#6B6258] mb-10">
        Última actualización: {LAST_UPDATED}
      </p>

      <div className="space-y-8 text-[#3D3530] text-base leading-relaxed">
        <section className="space-y-3">
          <p>
            Estos términos y condiciones regulan el uso del sitio y la compra de productos en
            {' '}{BRAND.name}. Al realizar un pedido, aceptás estas condiciones en su totalidad.
            Las operaciones se rigen por la Ley N.º 24.240 de Defensa del Consumidor y demás
            normativa vigente en la República Argentina.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">1. Identificación del vendedor</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Razón social: Ayla</li>
            <li>CUIT: 20-11111111-3</li>
            <li>Domicilio: General Pacheco</li>
            <li>Correo de contacto: {BRAND.email}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">2. Productos y personalización</h2>
          <p>
            {BRAND.name} ofrece piezas grabadas a láser y productos personalizados según las
            especificaciones (nombres, fechas, imágenes y otros datos) que nos proporcionás. Sos
            responsable de la exactitud de la información que enviás para la personalización. No
            nos hacemos responsables por errores de tipeo, ortografía o contenido provistos por
            vos una vez confirmado el pedido.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">3. Precios y moneda</h2>
          <p>
            Todos los precios están expresados en pesos argentinos (ARS) e incluyen los impuestos
            aplicables, salvo aclaración en contrario. Los precios pueden modificarse sin previo
            aviso, pero el precio aplicable a tu compra es el vigente al momento de confirmar el
            pedido. Los costos de envío se informan antes de finalizar la compra.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">4. Medios de pago</h2>
          <p>
            Aceptamos pagos a través de Mercado Pago (tarjetas de crédito, débito y demás medios
            disponibles en la plataforma) y por transferencia bancaria. El pedido se considera
            confirmado una vez acreditado el pago.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">5. Proceso de compra y producción</h2>
          <p>
            Una vez confirmado el pago, comenzamos la producción de tu pieza personalizada. Te
            mantendremos informado sobre el estado del pedido por los medios de contacto que nos
            hayas brindado. Los plazos de producción y entrega son estimados y pueden variar según
            la demanda y la disponibilidad de materiales.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">6. Envíos</h2>
          <p>
            Realizamos envíos a todo el país a través de los proveedores de correo y mensajería
            disponibles. Los plazos de entrega dependen del destino y del operador logístico. Una
            vez despachado el pedido, los tiempos de tránsito quedan sujetos al proveedor de envío.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">7. Derecho de revocación (botón de arrepentimiento)</h2>
          <p>
            Conforme al artículo 34 de la Ley N.º 24.240 y a la Resolución 424/2020 de la
            Secretaría de Comercio Interior, en las compras a distancia el consumidor tiene
            derecho a revocar la aceptación dentro de los diez (10) días corridos contados a
            partir de la entrega del producto, sin responsabilidad alguna y sin necesidad de
            expresar la causa.
          </p>
          <p className="font-medium text-[#111111]">
            Importante: este derecho de revocación no resulta aplicable a los productos
            confeccionados conforme a las especificaciones del consumidor o claramente
            personalizados (artículo 1116 inciso b del Código Civil y Comercial de la Nación).
            Dado que la mayoría de nuestros productos son grabados y personalizados a pedido, no
            están sujetos al derecho de arrepentimiento, salvo los productos no personalizados.
          </p>
          <p>
            Para ejercer este derecho sobre un producto no personalizado, escribinos a{' '}
            <a href={`mailto:${BRAND.email}`} className="text-[#B68A57] underline">
              {BRAND.email}
            </a>{' '}
            dentro del plazo legal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">8. Cambios, devoluciones y garantía</h2>
          <p>
            Si tu producto presenta un defecto de fabricación o no se corresponde con lo
            solicitado por causa atribuible a {BRAND.name}, contactanos dentro de las 48 horas de
            recibido el pedido, adjuntando fotos del problema. Evaluaremos el caso y, de
            corresponder, repararemos, reemplazaremos o reembolsaremos el producto conforme a la
            Ley de Defensa del Consumidor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">9. Propiedad intelectual</h2>
          <p>
            Todo el contenido del sitio (textos, imágenes, logos y diseños) es propiedad de
            {' '}{BRAND.name} o cuenta con autorización para su uso, y está protegido por la
            normativa vigente. Al enviarnos imágenes o textos para personalizar tu producto,
            declarás contar con los derechos necesarios para su utilización.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">10. Defensa del consumidor</h2>
          <p>
            Ante cualquier conflicto, el consumidor puede presentar su reclamo ante la autoridad
            de aplicación. Para más información sobre tus derechos podés consultar el portal de
            Defensa de las y los Consumidores de la Nación. La relación se rige por la Ley N.º
            24.240 y sus modificatorias.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">11. Ley aplicable y jurisdicción</h2>
          <p>
            Estos términos se rigen por las leyes de la República Argentina. Ante cualquier
            controversia, las partes se someten a los tribunales ordinarios que correspondan
            según la normativa de defensa del consumidor.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">12. Contacto</h2>
          <p>
            Por cualquier consulta sobre estos términos, escribinos a{' '}
            <a href={`mailto:${BRAND.email}`} className="text-[#B68A57] underline">
              {BRAND.email}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
