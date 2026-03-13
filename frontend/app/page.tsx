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
  // NEW: State to hold the actual AI prediction data
  const [aiData, setAiData] = useState<any>(null) 

  // UPDATED: Now accepts the files array from UploadZone
  const handleAnalyze = async (files: File[]) => {
    setView("loading")

    try {
      if (!files || files.length === 0) {
        throw new Error("No files uploaded")
      }

      const file = files[0]

      // Prepare FormData for file upload
      const formData = new FormData()
      formData.append("file", file)

      console.log("Sending CSV to AI for analysis")

      // 2. SEND TO YOUR PYTHON FASTAPI
      // const response = await fetch("http://127.0.0.1:8000/analyze_csv", {
      //   method: "POST",
      //   body: formData
      // })
      const response = await fetch("https://kamilah-overgenerous-empirically.ngrok-free.dev/analyze_vcf", {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "69420" // Crucial to bypass the free-tier warning page!
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      // 3. CATCH THE PREDICTIONS AND SHOW RESULTS
      const data = await response.json()
      console.log("AI Predictions Received:", data)
      
      setAiData(data.results) // Save the array of results!
      setView("results")

    } catch (error) {
      console.error("Inference failed:", error)
      alert("Error connecting to the AI backend. Is your Uvicorn server running?")
      setView("home") // Send them back to start if it fails
    }
  }

  const handleReset = () => {
    setView("home")
    setAiData(null) // Clear data on reset
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
              {/* WE WILL PASS THE REAL DATA INTO THIS NEXT! */}
              <ResultsDashboard aiResults = {aiData} /> 
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <BackToTop />
    </div>
  )
}