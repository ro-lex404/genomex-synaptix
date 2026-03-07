"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, AlertTriangle } from "lucide-react"

export function WarningBanner() {
  const [isVisible, setIsVisible] = useState(true)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-warning text-warning-foreground"
        >
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  <span className="font-semibold">Disclaimer:</span> GenomeX is an AI-assisted research tool. Predictions may contain inaccuracies and must not be trusted as a sole diagnostic source.
                </p>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="shrink-0 rounded-md p-1 hover:bg-warning-foreground/10 transition-colors"
                aria-label="Dismiss warning"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
