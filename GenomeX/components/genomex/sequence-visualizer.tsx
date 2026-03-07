"use client"

import { motion } from "framer-motion"
import { Dna, AlertTriangle } from "lucide-react"

const mockSequence = "ATGCGTAGCTAACGTTAGCCATGCGATCGATCGATCGTAGCTAGCTGATCGATCGATCGATCGTAGCATGC"
const mutationIndex = 23 // Position of the mutation (T→G)

export function SequenceVisualizer() {
  const beforeMutation = mockSequence.slice(0, mutationIndex)
  const mutation = mockSequence[mutationIndex]
  const afterMutation = mockSequence.slice(mutationIndex + 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border bg-muted/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Dna className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Sequence Visualizer</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          BRCA1 Gene Region • Position 43071077 • c.5266dupC mutation
        </p>
      </div>

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sequence Block */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-foreground">Pathogenic Mutation Detected</span>
            </div>
            <div className="overflow-x-auto rounded-lg bg-slate-900 p-4">
              <pre className="font-mono text-sm leading-relaxed">
                <span className="text-slate-400">5&apos;-</span>
                <span className="text-emerald-400">{beforeMutation}</span>
                <motion.span
                  animate={{ 
                    backgroundColor: ["rgba(239, 68, 68, 0.3)", "rgba(239, 68, 68, 0.6)", "rgba(239, 68, 68, 0.3)"]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mx-0.5 rounded px-1 text-red-400 font-bold text-base"
                >
                  {mutation}
                </motion.span>
                <span className="text-emerald-400">{afterMutation}</span>
                <span className="text-slate-400">-3&apos;</span>
              </pre>
              <div className="mt-3 border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400">
                  Reference: <span className="text-emerald-400">...TAGCCAT</span>
                  <span className="text-white font-bold">T</span>
                  <span className="text-emerald-400">GCGATCG...</span>
                </p>
                <p className="text-xs text-slate-400">
                  Observed: <span className="text-emerald-400">...TAGCCAT</span>
                  <span className="text-red-400 font-bold">G</span>
                  <span className="text-emerald-400">GCGATCG...</span>
                  <span className="ml-2 text-red-400">(T→G substitution)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Gauge */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-6">
            <p className="mb-4 text-sm font-medium text-muted-foreground">Model Confidence</p>
            <div className="relative">
              <svg className="h-32 w-32 -rotate-90 transform">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="text-destructive"
                  strokeDasharray={`${0.96 * 351.86} 351.86`}
                  initial={{ strokeDashoffset: 351.86 }}
                  animate={{ strokeDashoffset: 351.86 * (1 - 0.96) }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">96%</span>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              High confidence pathogenic classification
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="text-sm text-muted-foreground">Normal Sequence</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <span className="text-sm text-muted-foreground">Mutation Site</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-400" />
            <span className="text-sm text-muted-foreground">Flanking Region</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
