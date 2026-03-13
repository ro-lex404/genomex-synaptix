"use client"

import { Dna } from "lucide-react"

interface HeaderProps {
  onReset: () => void
}

export function Header({ onReset }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Dna className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">GenomeX</span>
          </button>
          <nav className="flex items-center gap-6">
            <span className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              System Online
            </span>
          </nav>
        </div>
      </div>
    </header>
  )
}
