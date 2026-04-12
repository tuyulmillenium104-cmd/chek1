'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileJson,
  FileText,
  FolderArchive,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  HardDrive,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ArchFile {
  file: string
  label: string
  category: string
  exists: boolean
  sizeBytes: number
  sizeLabel: string
  lastModified: string | null
}

interface ArchManifest {
  format: string
  generatedAt: string
  totalFiles: number
  totalSizeBytes: number
  totalSizeLabel: string
  files: ArchFile[]
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'json') return <FileJson className="h-3.5 w-3.5 text-amber-400" />
  if (ext === 'txt' || ext === 'md') return <FileText className="h-3.5 w-3.5 text-emerald-400" />
  if (ext === 'jsonl') return <FileJson className="h-3.5 w-3.5 text-blue-400" />
  return <FileText className="h-3.5 w-3.5 text-muted-foreground" />
}

export function ArchitectureDownloader() {
  const [manifest, setManifest] = useState<ArchManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchManifest = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/rally/download-architecture?format=list')
      if (res.ok) {
        const data = await res.json()
        setManifest(data)
      }
    } catch (err) {
      console.error('Failed to fetch architecture manifest:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchManifest()
    const interval = setInterval(fetchManifest, 120000) // refresh every 2 min
    return () => clearInterval(interval)
  }, [fetchManifest])

  const handleDownloadAll = async () => {
    try {
      setDownloading(true)
      const res = await fetch('/api/rally/download-architecture?format=json')
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rally-architecture-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Architecture downloaded!', {
        description: `${manifest?.totalFiles || 0} files bundled into a single JSON file`,
      })
    } catch {
      toast.error('Download failed', {
        description: 'Could not generate architecture bundle',
      })
    } finally {
      setDownloading(false)
    }
  }

  const categories = manifest
    ? Array.from(new Set(manifest.files.map(f => f.category)))
    : []

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-emerald-500/20 bg-card/60 backdrop-blur-sm p-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <FolderArchive className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium">Loading architecture files...</p>
            <div className="h-2 w-32 bg-muted rounded-full mt-1 animate-pulse" />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/20 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <FolderArchive className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Architecture Files</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-emerald-500/10 text-emerald-400 border-0">
                  {manifest?.totalFiles || 0} files
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <HardDrive className="h-3 w-3" />
                {manifest?.totalSizeLabel || '0 B'} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-muted/50"
              onClick={fetchManifest}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-200 hover:shadow-[0_0_16px_rgba(16,185,129,0.4)] hover:scale-[1.03] active:scale-[0.98]"
              onClick={handleDownloadAll}
              disabled={downloading || !manifest || manifest.totalFiles === 0}
            >
              <Download className={cn('h-3 w-3 mr-1.5', downloading && 'animate-bounce')} />
              {downloading ? 'Packaging...' : 'Download All'}
            </Button>
          </div>
        </div>
      </div>

      {/* Expandable file list */}
      <div className="border-t border-border/30">
        <button
          className="w-full px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? 'Hide' : 'Show'} file manifest</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {expanded && manifest && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2 max-h-72 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mb-1 mt-1">
                      {cat}
                    </p>
                    <div className="space-y-0.5">
                      {manifest.files
                        .filter(f => f.category === cat)
                        .map((f) => (
                          <div
                            key={f.file}
                            className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/30 transition-colors group"
                          >
                            <FileIcon filename={f.file} />
                            <span className="text-[11px] font-mono flex-1 truncate group-hover:text-foreground transition-colors">
                              {f.file}
                            </span>
                            {f.exists ? (
                              <>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {f.sizeLabel}
                                </span>
                                <Check className="h-3 w-3 text-emerald-400/60" />
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-muted-foreground/50">
                                  missing
                                </span>
                                <AlertCircle className="h-3 w-3 text-red-400/60" />
                              </>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
