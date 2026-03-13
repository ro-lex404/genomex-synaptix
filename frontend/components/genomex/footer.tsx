export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GenomeX. Research use only.</p>
          <a
            href="#"
            className="text-xs hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Developer / System Status
          </a>
        </div>
      </div>
    </footer>
  )
}
