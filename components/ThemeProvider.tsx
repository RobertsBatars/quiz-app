"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

type ThemeProviderCustomProps = Omit<ThemeProviderProps, 'attribute' | 'defaultTheme' | 'enableSystem'> & {
  children: React.ReactNode
}

export function ThemeProvider({ children, ...props }: ThemeProviderCustomProps) {
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <NextThemesProvider 
      attribute="class" // Uses class attribute for theming
      defaultTheme="system" // Defaults to system preference
      enableSystem // Enables system theme detection
      disableTransitionOnChange // Prevents flash during theme change
      storageKey="quiz-app-theme" // Custom storage key
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

