"use client"

import { motion } from "framer-motion"
import { FileSearch, Brain, ClipboardList, BarChart3, Clock, Target, Lightbulb } from "lucide-react"

const steps = [
  {
    icon: FileSearch,
    title: "Parse Sequence",
    description: "Upload VCF or CSV files for automated variant extraction and quality checks",
  },
  {
    icon: Brain,
    title: "Deep Learning Inference",
    description: "Neural network classifies variants using clinical database training",
  },
  {
    icon: ClipboardList,
    title: "Clinical Triage",
    description: "Prioritized results with pathogenic variants flagged for review",
  },
]

const stats = [
  { icon: BarChart3, value: "10,000+", label: "Variants Analyzed" },
  { icon: Target, value: "98.2%", label: "Model Accuracy" },
  { icon: Clock, value: "40+", label: "Hours Saved" },
]

export function InfoSections() {
  return (
    <div className="bg-secondary/50">
      {/* How it Works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How GenomeX Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to clinical-grade variant analysis
            </p>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="mb-4 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* By The Numbers */}
      <section className="border-y border-border bg-card py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              By The Numbers
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explainable AI */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explainable AI
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Our model doesn&apos;t just classify—it explains. Every prediction includes highlighted
              base-pair mutations that contributed to the classification, giving clinicians the
              context they need to make informed decisions. Transparency is at the core of our
              approach to genomic AI.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
