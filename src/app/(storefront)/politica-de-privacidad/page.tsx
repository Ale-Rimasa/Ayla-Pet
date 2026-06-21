import type { Metadata } from 'next'
import { BRAND } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: `Cómo ${BRAND.name} recopila, usa y protege tus datos personales conforme a la Ley 25.326 de Protección de Datos Personales.`,
}

const LAST_UPDATED = '20 de junio de 2026'

export default function PoliticaDePrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-4xl font-bold text-[#111111] mb-3">
        Política de privacidad
      </h1>
      <p className="text-sm text-[#6B6258] mb-10">
        Última actualización: {LAST_UPDATED}
      </p>

      <div className="space-y-8 text-[#3D3530] text-base leading-relaxed">
        <section className="space-y-3">
          <p>
            En {BRAND.name} respetamos tu privacidad y nos comprometemos a proteger los datos
            personales que nos confiás. Esta política explica qué datos recopilamos, con qué
            finalidad, con quién los compartimos y qué derechos tenés sobre ellos, de acuerdo
            con la Ley N.º 25.326 de Protección de los Datos Personales de la República
            Argentina y su normativa complementaria.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">1. Responsable del tratamiento</h2>
          <p>
            El responsable del tratamiento de tus datos es {BRAND.name}.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Razón social: Ayla</li>
            <li>CUIT: 20-11111111-3</li>
            <li>Domicilio: General Pacheco</li>
            <li>Correo de contacto: {BRAND.email}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">2. Qué datos recopilamos</h2>
          <p>Para procesar tus pedidos y brindarte el servicio, podemos recopilar:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Datos de identificación y contacto: nombre, apellido, correo electrónico y teléfono.</li>
            <li>Datos de envío: domicilio, localidad, provincia y código postal.</li>
            <li>Datos del pedido: productos, personalizaciones (nombres, fechas, imágenes que nos compartís) e historial de compras.</li>
            <li>Datos de pago: procesados directamente por Mercado Pago. No almacenamos los datos completos de tu tarjeta.</li>
            <li>Datos de navegación: información técnica básica (cookies y similares) para el funcionamiento del sitio.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">3. Finalidad del tratamiento</h2>
          <p>Usamos tus datos para:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Procesar, fabricar y enviar tus pedidos.</li>
            <li>Gestionar pagos y emitir comprobantes.</li>
            <li>Comunicarnos con vos sobre el estado de tu compra.</li>
            <li>Brindar soporte y responder consultas.</li>
            <li>Mejorar nuestros productos y la experiencia del sitio.</li>
            <li>Enviarte novedades o promociones, únicamente si nos diste tu consentimiento.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">4. Con quién compartimos tus datos</h2>
          <p>
            No vendemos tus datos personales. Los compartimos únicamente con proveedores que nos
            permiten operar, y solo en la medida necesaria:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Mercado Pago, para procesar los pagos.</li>
            <li>Proveedores de correo y servicios de mensajería, para coordinar entregas.</li>
            <li>Proveedores tecnológicos de hosting y envío de correos electrónicos transaccionales.</li>
          </ul>
          <p>
            Estos terceros tratan tus datos conforme a sus propias políticas y a la normativa
            aplicable.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">5. Conservación de los datos</h2>
          <p>
            Conservamos tus datos mientras dure la relación comercial y durante los plazos que
            exija la legislación fiscal, contable y de defensa del consumidor. Luego serán
            eliminados o anonimizados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">6. Tus derechos</h2>
          <p>
            Como titular de los datos tenés derecho a acceder, rectificar, actualizar y suprimir
            tu información personal. Para ejercerlos, escribinos a {BRAND.email}.
          </p>
          <p>
            El titular de los datos personales tiene la facultad de ejercer el derecho de acceso
            a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se
            acredite un interés legítimo al efecto, conforme lo establecido en el artículo 14,
            inciso 3 de la Ley N.º 25.326.
          </p>
          <p>
            La Agencia de Acceso a la Información Pública (AAIP), órgano de control de la Ley
            N.º 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan
            con relación al incumplimiento de las normas sobre protección de datos personales.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">7. Cookies</h2>
          <p>
            Utilizamos cookies y tecnologías similares para el correcto funcionamiento del sitio,
            recordar tu carrito y mejorar tu experiencia. Podés configurar tu navegador para
            bloquearlas, aunque algunas funciones podrían dejar de operar correctamente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">8. Seguridad</h2>
          <p>
            Adoptamos medidas técnicas y organizativas razonables para proteger tus datos contra
            el acceso no autorizado, la pérdida o la alteración.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">9. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta política en cualquier momento. Publicaremos la versión vigente
            en esta página con su fecha de última actualización.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-bold text-[#111111]">10. Contacto</h2>
          <p>
            Si tenés dudas sobre esta política o sobre el tratamiento de tus datos, escribinos a{' '}
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
