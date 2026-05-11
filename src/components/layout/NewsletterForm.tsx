'use client'

import { useState } from 'react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    // TODO: integrate with email provider (Resend / Supabase)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="text-xs text-[#B68A57] font-medium">
        ¡Gracias! Te avisamos con novedades.
      </p>
    )
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email"
        required
        aria-label="Email para novedades"
        className="flex-1 min-w-0 rounded-lg border border-[#E7DCCF] bg-[#FAF7F2] px-3 py-2 text-xs text-[#1F1F1F] placeholder:text-[#6B6258] outline-none focus:border-[#B68A57] transition-colors"
      />
      <button
        type="submit"
        className="rounded-lg bg-[#111111] px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-80 min-w-[32px]"
        aria-label="Suscribirse"
      >
        →
      </button>
    </form>
  )
}
