"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { WarningBanner } from "@/components/genomex/warning-banner"
import { Header } from "@/components/genomex/header"
import { Footer } from "@/components/genomex/footer"
import { BackToTop } from "@/components/genomex/back-to-top"
import { UploadZone } from "@/components/genomex/upload-zone"
import { InfoSections } from "@/components/genomex/info-sections"
import { LoadingSpinner } from "@/components/genomex/loading-spinner"
import { ResultsDashboard } from "@/components/genomex/results-dashboard"

type ViewState = "home" | "loading" | "results"

export default function GenomeXPage() {
  const [view, setView] = useState<ViewState>("home")

  const handleAnalyze = () => {
    setView("loading")
    // Simulate 2 second analysis
    setTimeout(() => {
      setView("results")
    }, 2000)
  }

  const handleReset = () => {
    setView("home")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Reset scroll position when view changes
  useEffect(() => {
    if (view === "results") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [view])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WarningBanner />
      <Header onReset={handleReset} />
      
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <UploadZone onAnalyze={handleAnalyze} />
              <InfoSections />
            </motion.div>
          )}

          {view === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoadingSpinner />
            </motion.div>
          )}

          {view === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ResultsDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <BackToTop />
    </div>
  )
}
