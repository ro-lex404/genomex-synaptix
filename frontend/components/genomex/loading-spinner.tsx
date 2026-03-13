"use client"

import { motion } from "framer-motion"
import { Dna } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="mb-6"
      >
        <Dna className="h-16 w-16 text-primary" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-xl font-semibold text-foreground">Analyzing sequences...</p>
        <p className="mt-2 text-center text-muted-foreground">
          Running deep learning inference
        </p>
      </motion.div>
      <motion.div className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  )
}
