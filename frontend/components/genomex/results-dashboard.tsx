"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Download, Dna } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SequenceVisualizer } from "./sequence-visualizer"
import JSZip from "jszip"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export function ResultsDashboard({ aiResults }: { aiResults?: any[] }) {
  // 1. NEW: State to track which variant is currently selected in the table
  const [selectedIndex, setSelectedIndex] = useState(0)

  // 2. Map the data safely
  const liveVariants = aiResults ? aiResults.map(result => ({
    id: result.variant_id, 
    gene: result.gene_symbol || "Analyzed Target", 
    classification: result.prediction || result.classification, 
    confidence: (result.confidence_score || result.confidence) / 100,
    features: result.features || { cadd_score: 0, sift_score: 0, gnomad_af: 0 }, 
    pytorch_confidence: result.pytorch_confidence || "N/A",
    rf_confidence: result.rf_confidence || result.catboost_confidence || result.confidence || "N/A",
    ensemble_confidence: result.confidence_score || result.confidence || 96.2
  })) : []

  // 3. Fallback for the active panel if no data is uploaded yet
  const activeVariant = liveVariants.length > 0 
    ? liveVariants[selectedIndex] 
    : {
        features: { cadd_score: 28.5, sift_score: 0.05 },
        ensemble_confidence: 96.2,
        pytorch_confidence: 94,
        rf_confidence: 98
      }

  const pathogenicCount = liveVariants.filter((v) => v.classification === "Pathogenic").length
  const benignCount = liveVariants.filter((v) => v.classification === "Benign").length

  // Overall verdict based on majority classification
  const overallVerdict = pathogenicCount > 0 ? "PATHOGENIC" : benignCount > 0 ? "BENIGN" : "UNCERTAIN"
  const verdictColor = overallVerdict === "PATHOGENIC" ? "destructive" : "success"

  const handleDownloadReport = async () => {
    if (liveVariants.length === 0) return

    // Initialize the ZIP instance
    const zip = new JSZip()
    const dateStr = new Date().toISOString().split('T')[0]

    // ==========================================
    // 1. GENERATE CSV
    // ==========================================
    const headers = [
      "Variant ID", "Gene Symbol", "Final Classification",
      "Ensemble Confidence (%)", "GNN Confidence (%)",
      "Random Forest Confidence (%)", "CADD Score", "SIFT Score", "gnomAD Allele Frequency"
    ]

    const csvRows = liveVariants.map(v => [
      v.id, v.gene, v.classification, (v.ensemble_confidence).toFixed(2),
      v.pytorch_confidence, v.rf_confidence,
      v.features.cadd_score, v.features.sift_score, v.features.gnomad_af
    ])

    const csvContent = [headers.join(","), ...csvRows.map(row => row.join(","))].join("\n")
    
    // Add CSV to the ZIP
    zip.file(`GenomeX_Raw_Data_${dateStr}.csv`, csvContent)

    // ==========================================
    // 2. GENERATE STYLISH PDF
    // ==========================================
    const doc = new jsPDF()
    
    // PDF Header & Title
    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42) // Slate 900
    doc.text("GenomeX Clinical Variant Report", 14, 20)
    
    // Metadata/Summary Section
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139) // Slate 500
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)
    doc.text(`Total Variants Analyzed: ${liveVariants.length}`, 14, 36)
    
    // Color-coded overall verdict
    doc.text(`Overall Batch Verdict: `, 14, 42)
    doc.setTextColor(overallVerdict === "PATHOGENIC" ? 220 : 22, overallVerdict === "PATHOGENIC" ? 38 : 163, 38)
    doc.setFont(undefined, 'bold')
    doc.text(overallVerdict, 55, 42)
    doc.setFont(undefined, 'normal')

    // PDF Table formatting
    const tableBody = liveVariants.map(v => [
      v.id, 
      v.gene, 
      v.classification, 
      `${(v.ensemble_confidence).toFixed(1)}%`,
      v.features.cadd_score, 
      v.features.sift_score
    ])

    autoTable(doc, {
      startY: 50,
      head: [['Variant ID', 'Gene', 'Classification', 'Confidence', 'CADD', 'SIFT']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // Dark header
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
      didParseCell: function(data) {
        // Dynamically color the Classification column based on text
        if (data.section === 'body' && data.column.index === 2) {
           if (data.cell.raw === 'Pathogenic') {
             data.cell.styles.textColor = [220, 38, 38] // Red
             data.cell.styles.fontStyle = 'bold'
           } else if (data.cell.raw === 'Benign') {
             data.cell.styles.textColor = [22, 163, 74] // Green
           }
        }
      }
    })

    // Output PDF as ArrayBuffer and add to ZIP
    const pdfBuffer = doc.output('arraybuffer')
    zip.file(`GenomeX_Clinical_Summary_${dateStr}.pdf`, pdfBuffer)

    // ==========================================
    // 3. PACKAGE & DOWNLOAD ZIP
    // ==========================================
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `GenomeX_Export_${dateStr}.zip`)
    
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Analysis Results
            </h1>
            <p className="mt-1 text-muted-foreground">
              Processed via 60/40 Hybrid AI (PyTorch GNN + Random Forest)
            </p>
          </div>
          <Button className="gap-2" onClick={handleDownloadReport}>
            <Download className="h-4 w-4" />
            Download Clinical Report
          </Button>
        </div>
      </motion.div>

      {/* Final Verdict Card */}
      <motion.div
        variants={itemVariants}
        className={`mt-8 rounded-xl border border-${verdictColor}/20 bg-linear-to-br from-${verdictColor}/10 to-${verdictColor}/5 p-8`}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Verdict Badge & Text */}
          <div className="flex flex-col justify-center gap-6">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-lg bg-${verdictColor}/15 px-4 py-2 mb-4`}>
                <span className="text-2xl">{overallVerdict === "PATHOGENIC" ? "🔴" : "🟢"}</span>
                <span className={`text-xl font-bold text-${verdictColor}`}>{overallVerdict}</span>
              </div>
              <p className="mt-4 text-lg text-foreground font-semibold">
                Batch summary exhibits {overallVerdict.toLowerCase()} potential based on multi-model ensemble analysis.
              </p>
            </div>
          </div>

          {/* DYNAMIC: Overall Ensemble Confidence Gauge for Selected Variant */}
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <svg className="h-40 w-40 -rotate-90 transform">
                <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className={`text-${verdictColor}`}
                  // FIX: Set the dash array to the full circumference
                  strokeDasharray="439.82 439.82"
                  initial={{ strokeDashoffset: 439.82 }}
                  // The offset animation correctly handles the percentage
                  animate={{ strokeDashoffset: 439.82 * (1 - (activeVariant.ensemble_confidence / 100)) }}
                  transition={{ duration: 1.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">
                  {activeVariant.ensemble_confidence}%
                </span>
                <span className="text-sm text-muted-foreground text-center px-2 leading-tight mt-1">
                  Confidence<br/>(Selected Row)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Triage Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="my-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="border-b border-border bg-muted/50 px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Variant Triage Table</h2>
            <span className="text-xs text-muted-foreground">Click a row to update metrics below</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full cursor-pointer">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Variant ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Classification</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Confidence Score</th>
                </tr>
              </thead>
              <tbody>
                {liveVariants.map((variant, index) => (
                  <motion.tr
                    key={variant.id}
                    onClick={() => setSelectedIndex(index)} // Updates the active state
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    // Highlight the row if it is currently selected
                    className={`border-b border-border last:border-0 transition-colors ${
                      selectedIndex === index ? "bg-primary/20 hover:bg-primary/25" : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="px-6 py-4 font-mono text-sm text-foreground">
                      {variant.id}
                      {selectedIndex === index && <span className="ml-2 text-xs text-primary font-bold">(Viewing)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          variant.classification === "Pathogenic" ? "destructive"
                            : variant.classification === "Benign" ? "default"
                            : "secondary"
                        }
                        className={variant.classification === "Benign" ? "bg-success text-success-foreground hover:bg-success/90" : ""}
                      >
                        {variant.classification}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${
                              variant.classification === "Pathogenic" ? "bg-destructive"
                                : variant.classification === "Benign" ? "bg-success"
                                : "bg-primary"
                            }`}
                            style={{ width: `${variant.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {(variant.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* DYNAMIC: Model Agreement Section */}
        <motion.div variants={itemVariants} className="mt-8 border-t border-destructive/20 pt-6">
          <p className="text-sm font-semibold text-muted-foreground mb-4">Model Agreement (Selected Variant)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-card/50 p-4 border border-border">
              <p className="text-sm text-muted-foreground">Deep Spatial GNN (60%)</p>
              <p className="text-2xl font-bold text-primary mt-2">
                {activeVariant.pytorch_confidence}{activeVariant.pytorch_confidence !== "N/A" ? "%" : ""}
              </p>
            </div>
            <div className="rounded-lg bg-card/50 p-4 border border-border">
              <p className="text-sm text-muted-foreground">Random Forest Heuristics (40%)</p>
              <p className="text-2xl font-bold text-destructive mt-2">{activeVariant.rf_confidence}%</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Clinical Evidence Section - 2 Columns */}
      <motion.div variants={itemVariants} className="grid gap-8 lg:grid-cols-5 mt-8">
        
        {/* Left Column - 3D Spatial Collapse (Hardcoded) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden shadow-sm"
        >
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <Dna className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  3D Spatial Collapse (GNN Blast Radius)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Interactive protein structure with spatial mutation impact visualization
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-black">
            
            <iframe
              title="Protein Interactive Diagram"
              src={`https://kamilah-overgenerous-empirically.ngrok-free.dev/render_3d/${activeVariant.gene}/${encodeURIComponent(activeVariant.id)}`}
              width="100%"
              height="500"
              className="border-0 rounded-md bg-black"
            />

          </div>
        </motion.div>

        {/* Right Column - DYNAMIC Clinical Heuristics */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col"
        >
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Clinical Heuristics
          </h3>

          {/* DYNAMIC CADD Score */}
          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-medium text-foreground">CADD Score</label>
              <span className={`text-2xl font-bold ${activeVariant.features.cadd_score > 20 ? "text-destructive" : activeVariant.features.cadd_score > 10 ? "text-yellow-500" : "text-success"}`}>
                {activeVariant.features.cadd_score}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${activeVariant.features.cadd_score > 20 ? "bg-destructive" : activeVariant.features.cadd_score > 10 ? "bg-yellow-500" : "bg-success"}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((activeVariant.features.cadd_score / 30) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* DYNAMIC SIFT Score */}
          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-medium text-foreground">SIFT Score</label>
              <span className={`text-2xl font-bold ${activeVariant.features.sift_score < 0.05 ? "text-destructive" : "text-success"}`}>
                {activeVariant.features.sift_score}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${activeVariant.features.sift_score < 0.05 ? "bg-destructive" : "bg-success"}`}
                initial={{ width: 0 }}
                animate={{ width: `${(1 - activeVariant.features.sift_score) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* NEW: Explicit Clinical Legend */}
          <div className="mt-auto border-t border-border pt-4">
            <p className="text-sm font-bold text-foreground mb-3">Clinical Threshold Legend</p>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">CADD (Combined Annotation Dependent Depletion)</p>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                  <div className="bg-destructive/10 text-destructive rounded p-1 font-medium border border-destructive/20">&gt; 20<br/>Pathogenic (Top 1%)</div>
                  <div className="bg-yellow-500/10 text-yellow-600 rounded p-1 font-medium border border-yellow-500/20">10 - 20<br/>Possible Impact</div>
                  <div className="bg-success/10 text-success rounded p-1 font-medium border border-success/20">&lt; 10<br/>Likely Benign</div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">SIFT (Sorting Intolerant From Tolerant)</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-center">
                  <div className="bg-destructive/10 text-destructive rounded p-1 font-medium border border-destructive/20">&lt; 0.05<br/>Deleterious / Damaging</div>
                  <div className="bg-success/10 text-success rounded p-1 font-medium border border-success/20">&ge; 0.05<br/>Tolerated</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Sequence Visualizer (Now Dynamic) */}
      <motion.div variants={itemVariants} className="mt-8">
        <SequenceVisualizer 
          variantId={activeVariant.id} 
          gene={activeVariant.gene}
          classification={activeVariant.classification}
        />
      </motion.div>
    </div>
  )
}