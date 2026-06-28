'use client'

import { useEffect } from 'react'

const AUTO_DISMISS_MS = 5000

export default function ErrorToast({ message, onDismiss }: {
  message: string
  onDismiss: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(id)
  }, [message, onDismiss])

  return (
    <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <span className="text-red-400 shrink-0 mt-0.5 text-base leading-none">⚠</span>
      <p className="text-red-400 font-body text-sm flex-1 leading-relaxed">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar"
        className="text-red-400/50 hover:text-red-400 text-xl leading-none shrink-0 transition-colors"
      >
        ×
      </button>
    </div>
  )
}
