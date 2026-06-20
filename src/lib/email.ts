import { Resend } from 'resend'
import { env } from '@/env'
import { BRAND } from '@/lib/constants'
import type { Order } from '@/types'

// No ?? '' fallback — env now guarantees the key is present outside test.
// In test, Resend is mocked so the key value is never sent to the real client.
const resend = new Resend(env.RESEND_API_KEY)

// ── Types ────────────────────────────────────────────────────────────────────

interface SendEmailArgs {
  to: string
  subject: string
  text?: string
  html?: string
}

interface RenderResult {
  text: string
  html?: string
}

// ── Brand palette (mirrors the storefront tokens in globals.css) ───────────────
// Email clients can't read CSS variables, so the hex values live here.

const C = {
  bg: '#F5EFE6', // sf-cream-deep — page background
  card: '#FAF7F2', // sf-cream — card surface
  olive: '#717552', // brand-olive — header band
  oliveDark: '#5f6347', // brand-olive-dark
  gold: '#B68A57', // sf-gold — accent / total
  sand: '#E7DCCF', // sf-sand — dividers
  ink: '#1F1F1F', // sf-ink-soft — body text
  warm: '#6B6258', // sf-warm — muted text
  onOlive: '#FAF7F2',
} as const

// Serif stack: Playfair won't load in most mail clients, so fall back to Georgia
// which keeps the same elegant, high-contrast serif feel.
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"

// ── Internal helpers ─────────────────────────────────────────────────────────

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      default: return '&#39;'
    }
  })

/** Money is stored in cents; render as ARS with locale grouping ($ 2.500,00). */
const formatARS = (cents: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100)

/**
 * layout — shared, email-client-safe HTML shell (tables + inline styles).
 * Renders the AYLA header band, a centered card, and the footer.
 */
function layout(opts: {
  preheader: string
  heading: string
  intro: string
  contentHtml: string
}): string {
  const { preheader, heading, intro, contentHtml } = opts

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card};border-radius:14px;overflow:hidden;border:1px solid ${C.sand};">

<!-- Header band -->
<tr>
<td align="center" style="background:${C.olive};padding:30px 24px;">
<div style="font-family:${SERIF};font-size:32px;font-weight:600;letter-spacing:10px;color:${C.onOlive};text-indent:10px;">AYLA</div>
</td>
</tr>

<!-- Gold accent rule -->
<tr><td style="height:4px;background:${C.gold};font-size:0;line-height:0;">&nbsp;</td></tr>

<!-- Body -->
<tr>
<td style="padding:36px 32px 8px 32px;">
<h1 style="margin:0 0 14px 0;font-family:${SERIF};font-size:24px;font-weight:600;color:${C.ink};">${escapeHtml(heading)}</h1>
<p style="margin:0 0 24px 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.warm};">${intro}</p>
${contentHtml}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:28px 32px 34px 32px;border-top:1px solid ${C.sand};">
<p style="margin:0 0 6px 0;font-family:${SERIF};font-size:16px;color:${C.olive};">Gracias por elegir ${escapeHtml(BRAND.name)}.</p>
<p style="margin:0 0 14px 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.warm};">Cada pieza se graba a mano, con dedicación, para que dure toda la vida.</p>
<p style="margin:0;font-family:${SANS};font-size:13px;color:${C.warm};">
<a href="${BRAND.instagram}" style="color:${C.gold};text-decoration:none;font-weight:600;">Seguinos en Instagram</a>
&nbsp;·&nbsp;
<a href="mailto:${BRAND.email}" style="color:${C.gold};text-decoration:none;font-weight:600;">Escribinos</a>
</p>
</td>
</tr>

</table>
<p style="margin:18px 0 0 0;font-family:${SANS};font-size:11px;color:${C.warm};opacity:.8;">Este es un correo automático sobre tu pedido en ${escapeHtml(BRAND.name)}.</p>
</td>
</tr>
</table>
</body>
</html>`
}

/** Order line items + totals as an email-safe table. */
function orderSummaryHtml(order: Order): string {
  const itemRows = order.items
    .map(
      (item) => `
<tr>
<td style="padding:12px 0;border-bottom:1px solid ${C.sand};font-family:${SANS};font-size:14px;color:${C.ink};">
${escapeHtml(item.productName)}<br>
<span style="color:${C.warm};font-size:12px;">${escapeHtml(item.variantName)} &nbsp;·&nbsp; x${item.quantity}</span>
</td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${C.sand};font-family:${SANS};font-size:14px;color:${C.ink};white-space:nowrap;">${formatARS(item.subtotal)}</td>
</tr>`
    )
    .join('')

  const totalRow = (label: string, value: string, strong = false) => `
<tr>
<td style="padding:6px 0;font-family:${SANS};font-size:${strong ? '16px' : '14px'};color:${strong ? C.ink : C.warm};${strong ? 'font-weight:700;' : ''}">${escapeHtml(label)}</td>
<td align="right" style="padding:6px 0;font-family:${SANS};font-size:${strong ? '18px' : '14px'};color:${strong ? C.olive : C.warm};${strong ? 'font-weight:700;' : ''}white-space:nowrap;">${value}</td>
</tr>`

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${itemRows}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
${totalRow('Subtotal', formatARS(order.subtotal))}
${totalRow('Envío', formatARS(order.shippingCost))}
<tr><td colspan="2" style="padding:6px 0 0 0;"><div style="height:1px;background:${C.sand};font-size:0;line-height:0;">&nbsp;</div></td></tr>
${totalRow('Total', formatARS(order.total), true)}
</table>`
}

/** Shipping address card. */
function addressHtml(order: Order, title: string): string {
  const a = order.shippingAddress
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
<tr>
<td style="background:${C.bg};border-radius:10px;padding:16px 18px;">
<p style="margin:0 0 6px 0;font-family:${SANS};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.gold};font-weight:700;">${escapeHtml(title)}</p>
<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.ink};">
${escapeHtml(a.street)}<br>
${escapeHtml(a.city)}, ${escapeHtml(a.province)} (${escapeHtml(a.postalCode)})
</p>
</td>
</tr>
</table>`
}

/**
 * renderEmail — single seam for template rendering.
 * Returns both a plain-text body (deliverability + fallback) and a styled HTML body.
 */
function renderEmail(
  template: 'order-confirmation' | 'order-shipped',
  order: Order
): RenderResult {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const name = order.customer.name

  if (template === 'order-confirmation') {
    const itemLines = order.items
      .map((item) => `  - ${item.productName} (${item.variantName}) x${item.quantity}  ${formatARS(item.subtotal)}`)
      .join('\n')

    const text = [
      `Hola ${name},`,
      '',
      `Tu pago para el pedido #${shortId} fue confirmado.`,
      '',
      'Productos:',
      itemLines,
      '',
      `Subtotal: ${formatARS(order.subtotal)}`,
      `Envío: ${formatARS(order.shippingCost)}`,
      `Total: ${formatARS(order.total)}`,
      '',
      `Gracias por tu compra en ${BRAND.name}.`,
    ].join('\n')

    const html = layout({
      preheader: `Tu pago del pedido #${shortId} fue confirmado — ¡gracias por tu compra!`,
      heading: '¡Tu pago fue confirmado!',
      intro: `Hola ${escapeHtml(name)}, recibimos tu pago y ya estamos preparando tu pedido <strong style="color:${C.ink};">#${shortId}</strong>. Te avisaremos por este medio cuando salga en camino.`,
      contentHtml: orderSummaryHtml(order) + addressHtml(order, 'Enviaremos a'),
    })

    return { text, html }
  }

  // order-shipped
  const text = [
    `Hola ${name},`,
    '',
    `Tu pedido #${shortId} fue enviado.`,
    '',
    `Pronto llegará a tu domicilio.`,
    '',
    `Gracias por tu confianza en ${BRAND.name}.`,
  ].join('\n')

  const html = layout({
    preheader: `Tu pedido #${shortId} ya está en camino.`,
    heading: 'Tu pedido está en camino',
    intro: `Hola ${escapeHtml(name)}, ¡buenas noticias! Tu pedido <strong style="color:${C.ink};">#${shortId}</strong> ya fue despachado y pronto llegará a tu domicilio.`,
    contentHtml: addressHtml(order, 'Enviado a'),
  })

  return { text, html }
}

// ── Exported API ─────────────────────────────────────────────────────────────

/**
 * sendEmail — centralized Resend wrapper.
 * Sends both text and html when available (multipart: better deliverability +
 * a plain-text fallback). Swallows all errors; callers observe { sent: boolean }.
 */
export async function sendEmail(args: SendEmailArgs): Promise<{ sent: boolean }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      from: env.RESEND_FROM_EMAIL as string,
      to: args.to,
      subject: args.subject,
    }
    if (args.text) payload.text = args.text
    if (args.html) payload.html = args.html
    await resend.emails.send(payload)
    return { sent: true }
  } catch (err) {
    console.error('[email] send failed', err)
    return { sent: false }
  }
}

/**
 * sendOrderConfirmation — fire-and-forget; void contract preserved.
 * Webhook caller awaits this (serverless drops un-awaited work).
 */
export async function sendOrderConfirmation(order: Order): Promise<void> {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const { text, html } = renderEmail('order-confirmation', order)
  await sendEmail({
    to: order.customer.email,
    subject: `Tu pago para el pedido #${shortId} fue confirmado`,
    text,
    html,
  })
}

/**
 * sendOrderShipped — returns the send result so dispatchOrder can observe failure.
 */
export async function sendOrderShipped(order: Order): Promise<{ sent: boolean }> {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const { text, html } = renderEmail('order-shipped', order)
  return sendEmail({
    to: order.customer.email,
    subject: `Tu pedido #${shortId} fue enviado`,
    text,
    html,
  })
}
