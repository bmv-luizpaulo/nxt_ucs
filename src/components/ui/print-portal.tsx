"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

export function PrintPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  // Target the body to be outside of #app-print-root
  return createPortal(children, document.body)
}
