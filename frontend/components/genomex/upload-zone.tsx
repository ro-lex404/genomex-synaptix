"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Upload, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UploadZoneProps {
  onAnalyze: (uploadedFiles: File[]) => void
}

export function UploadZone({ onAnalyze }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center"
      >
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Genomic Variant Analysis
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          AI-powered clinical triage for rapid sequence interpretation
        </p>

        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={{
            borderColor: isDragOver ? "var(--primary)" : "var(--border)",
            backgroundColor: isDragOver ? "rgba(59, 130, 246, 0.05)" : "transparent",
          }}
          className="relative mb-6 rounded-2xl border-2 border-dashed p-12 transition-all"
        >
          <input
            type="file"
            accept=".vcf,.csv"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ scale: isDragOver ? 1.1 : 1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
            >
              <Upload className="h-8 w-8 text-primary" />
            </motion.div>
            <div>
              <p className="text-lg font-medium text-foreground">
                Upload .VCF or .CSV sequence files for instant triage
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag and drop or click to browse
              </p>
            </div>
          </div>
        </motion.div>

        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 rounded-lg border border-border bg-card p-4"
          >
            <p className="mb-3 text-sm font-medium text-foreground">Selected Files</p>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <Button
          onClick={() => onAnalyze(files)}
          size="lg"
          className="px-8 py-6 text-lg font-semibold"
        >
          Analyze Sequences
        </Button>
      </motion.div>
    </div>
  )
}
