"use client"

import { motion } from "framer-motion"
import { Download, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SequenceVisualizer } from "./sequence-visualizer"

interface Variant {
  id: string
  gene: string
  classification: "Pathogenic" | "Benign" | "Uncertain"
  confidence: number
}

const mockVariants: Variant[] = [
  { id: "rs104894089", gene: "BRCA1", classification: "Pathogenic", confidence: 0.96 },
  { id: "rs80357906", gene: "BRCA2", classification: "Pathogenic", confidence: 0.92 },
  { id: "rs121913527", gene: "TP53", classification: "Pathogenic", confidence: 0.89 },
  { id: "rs1799966", gene: "BRCA1", classification: "Benign", confidence: 0.95 },
  { id: "rs16942", gene: "BRCA1", classification: "Benign", confidence: 0.88 },
  { id: "rs144848", gene: "BRCA2", classification: "Benign", confidence: 0.91 },
  { id: "rs1800056", gene: "ATM", classification: "Uncertain", confidence: 0.62 },
]

// Sort pathogenic to top
const sortedVariants = [...mockVariants].sort((a, b) => {
  const order = { Pathogenic: 0, Uncertain: 1, Benign: 2 }
  return order[a.classification] - order[b.classification]
})

export function ResultsDashboard() {
  const pathogenicCount = mockVariants.filter((v) => v.classification === "Pathogenic").length
  const benignCount = mockVariants.filter((v) => v.classification === "Benign").length

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Analysis Results
            </h1>
            <p className="mt-1 text-muted-foreground">
              {mockVariants.length} variants analyzed • {pathogenicCount} pathogenic • {benignCount} benign
            </p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download Clinical Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-3xl font-bold text-destructive">{pathogenicCount}</p>
                <p className="text-sm text-muted-foreground">Pathogenic Variants</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-success/30 bg-success/5 p-6"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div>
                <p className="text-3xl font-bold text-success">{benignCount}</p>
                <p className="text-sm text-muted-foreground">Benign Variants</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <span className="text-lg font-bold text-primary">%</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">94.7%</p>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Triage Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Variant Triage Table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Variant ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Gene
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Classification
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Confidence Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedVariants.map((variant, index) => (
                  <motion.tr
                    key={variant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-foreground">
                      {variant.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{variant.gene}</td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          variant.classification === "Pathogenic"
                            ? "destructive"
                            : variant.classification === "Benign"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          variant.classification === "Benign"
                            ? "bg-success text-success-foreground hover:bg-success/90"
                            : ""
                        }
                      >
                        {variant.classification}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              variant.classification === "Pathogenic"
                                ? "bg-destructive"
                                : variant.classification === "Benign"
                                ? "bg-success"
                                : "bg-primary"
                            }`}
                            style={{ width: `${variant.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {(variant.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Sequence Visualizer */}
        <SequenceVisualizer />
      </motion.div>
    </div>
  )
}
