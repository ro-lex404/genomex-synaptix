"use client"

import { motion } from "framer-motion"
import { Dna, AlertTriangle, CheckCircle, Info } from "lucide-react"

// Define the props we expect from the dashboard
interface SequenceVisualizerProps {
  variantId?: string
  gene?: string
  classification?: string
}

export function SequenceVisualizer({ 
  variantId = "Unknown:0:N:N", 
  gene = "Unknown Target", 
  classification = "Unknown" 
}: SequenceVisualizerProps) {
  
  // 1. Parse the variant ID (Format: Chromosome:Position:Ref:Alt)
  const parts = variantId.split(":")
  const isValid = parts.length >= 4
  
  const chrom = isValid ? parts[0] : "??"
  const pos = isValid ? parts[1] : "Unknown"
  const ref = isValid ? parts[2] : "N"
  const alt = isValid ? parts[3] : "N"

  // 2. Determine mutation type for the label
  let mutationType = "substitution"
  if (ref.length > alt.length) mutationType = "deletion"
  if (alt.length > ref.length) mutationType = "insertion"

  // 3. Dynamic styling based on AI classification
  const isPathogenic = classification === "Pathogenic"
  const isBenign = classification === "Benign"
  
  const alertColor = isPathogenic ? "text-destructive" : isBenign ? "text-success" : "text-yellow-500"
  const alertBgColor = isPathogenic ? "rgba(239, 68, 68, 0.3)" : isBenign ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)"
  const highlightColor = isPathogenic ? "text-red-400" : isBenign ? "text-green-400" : "text-yellow-400"

  // Hardcoded flanking sequences for visualization purposes
  const leftFlank = "ATGCGTAGCTAACGTTAGCC"
  const rightFlank = "GCGATCGATCGTAGCATGC"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      {/* Header Info */}
      <div className="border-b border-border bg-muted/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Dna className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Sequence Visualizer</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground font-mono">
          {gene} Gene Region • Chromosome {chrom} • Position {pos}
        </p>
      </div>

      <div className="p-6">
        <div className="grid gap-6">
          <div className="w-full">
            {/* Dynamic Alert Status */}
            <div className="mb-4 flex items-center gap-2">
              {isPathogenic ? (
                <AlertTriangle className={`h-4 w-4 ${alertColor}`} />
              ) : isBenign ? (
                <CheckCircle className={`h-4 w-4 ${alertColor}`} />
              ) : (
                <Info className={`h-4 w-4 ${alertColor}`} />
              )}
              <span className="text-sm font-medium text-foreground">
                {isPathogenic ? "Pathogenic Mutation Detected" : isBenign ? "Benign Variant (Tolerated)" : "Variant of Uncertain Significance"}
              </span>
            </div>

            {/* Sequence Block */}
            <div className="overflow-x-auto rounded-lg bg-slate-900 p-4">
              <pre className="font-mono text-sm leading-relaxed">
                <span className="text-slate-400">5&apos;-</span>
                <span className="text-slate-300">{leftFlank}</span>
                
                {/* Dynamic Blinking Mutation Site */}
                <motion.span
                  key={variantId} // Forces animation to restart on variant change
                  animate={{ 
                    backgroundColor: [alertBgColor, "rgba(0,0,0,0)", alertBgColor]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`mx-0.5 rounded px-1 font-bold text-base ${highlightColor}`}
                >
                  {alt}
                </motion.span>
                
                <span className="text-slate-300">{rightFlank}</span>
                <span className="text-slate-400">-3&apos;</span>
              </pre>

              {/* Dynamic Legend / Translation */}
              <div className="mt-3 border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400">
                  Reference Sequence: <span className="text-slate-300">...{leftFlank.slice(-6)}</span>
                  <span className="text-yellow-100 font-bold mx-1">{ref}</span>
                  <span className="text-slate-300">{rightFlank.slice(0, 6)}...</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Observed Sequence: <span className="text-slate-300">...{leftFlank.slice(-6)}</span>
                  <span className={`${highlightColor} font-bold mx-1`}>{alt}</span>
                  <span className="text-slate-300">{rightFlank.slice(0, 6)}...</span>
                  <span className={`ml-2 ${highlightColor}`}>({ref}→{alt} {mutationType})</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-300" />
            <span className="text-sm text-muted-foreground">Flanking Region</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-100" />
            <span className="text-sm text-muted-foreground">Reference Allele</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isPathogenic ? "bg-red-400" : isBenign ? "bg-green-400" : "bg-yellow-400"}`} />
            <span className="text-sm text-muted-foreground">Observed Mutation</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}