import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Architecture files to include in the download bundle
const ARCHITECTURE_FILES = [
  // Core system files
  { file: 'rally_master.json', label: 'Master Config', category: 'Core' },
  { file: 'rally_knowledge_vault.json', label: 'Knowledge Vault', category: 'Core' },
  { file: 'rally_best_content.txt', label: 'Best Content', category: 'Core' },
  { file: 'rally_pattern_cache.json', label: 'Pattern Cache', category: 'Core' },
  { file: 'rally_learning_log.jsonl', label: 'Learning Log', category: 'Core' },
  { file: 'rally_intel_cache.json', label: 'Intel Cache', category: 'Core' },
  { file: 'rally_qna.json', label: 'Q&A Data', category: 'Core' },
  { file: 'rally_task_queue.json', label: 'Task Queue', category: 'Core' },
  { file: 'rally_worklog.md', label: 'Rally Worklog', category: 'Core' },
  { file: 'RALLY_README.txt', label: 'README', category: 'Core' },
  // Pipeline outputs
  { file: 'current_variations.json', label: 'Current Variations', category: 'Pipeline' },
  { file: 'rally_all_variations.json', label: 'All Variations (Legacy)', category: 'Pipeline' },
  { file: 'rally_all_variations_new.json', label: 'All Variations (New)', category: 'Pipeline' },
  { file: 'cycle3_consensus.json', label: 'Cycle 3 Consensus', category: 'Pipeline' },
  { file: 'cycle3_final.json', label: 'Cycle 3 Final', category: 'Pipeline' },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // 'json' (single bundle) or 'list' (file manifest)

    const basePath = path.join(process.cwd(), 'download', 'rally_system')

    if (format === 'list') {
      // Return manifest of all architecture files with sizes
      const manifest = await Promise.all(
        ARCHITECTURE_FILES.map(async (item) => {
          try {
            const filePath = path.join(basePath, item.file)
            const stat = await fs.stat(filePath)
            return {
              ...item,
              exists: true,
              sizeBytes: stat.size,
              sizeLabel: formatBytes(stat.size),
              lastModified: stat.mtime.toISOString(),
            }
          } catch {
            return { ...item, exists: false, sizeBytes: 0, sizeLabel: '—', lastModified: null }
          }
        })
      )

      // Also check for latest_report.json if it exists
      try {
        const reportPath = path.join(basePath, 'latest_report.json')
        const stat = await fs.stat(reportPath)
        manifest.unshift({
          file: 'latest_report.json',
          label: 'Latest Pipeline Report',
          category: 'Pipeline',
          exists: true,
          sizeBytes: stat.size,
          sizeLabel: formatBytes(stat.size),
          lastModified: stat.mtime.toISOString(),
        })
      } catch { /* no latest report yet */ }

      const totalSize = manifest.filter(f => f.exists).reduce((sum, f) => sum + f.sizeBytes, 0)

      return NextResponse.json({
        format: 'manifest',
        generatedAt: new Date().toISOString(),
        totalFiles: manifest.filter(f => f.exists).length,
        totalSizeBytes: totalSize,
        totalSizeLabel: formatBytes(totalSize),
        files: manifest,
      })
    }

    // format === 'json' → Download all as a single JSON bundle
    const bundle: Record<string, unknown> = {
      _meta: {
        type: 'rally-architecture-bundle',
        version: '15.0',
        generatedAt: new Date().toISOString(),
        totalFiles: 0,
        totalSizeBytes: 0,
        includedFiles: [] as string[],
        missingFiles: [] as string[],
      },
    }

    let totalSize = 0

    for (const item of ARCHITECTURE_FILES) {
      try {
        const filePath = path.join(basePath, item.file)
        const content = await fs.readFile(filePath, 'utf-8')
        const ext = item.file.split('.').pop()?.toLowerCase()

        // Parse JSON files, keep text files as strings
        if (ext === 'json') {
          try {
            bundle[item.file] = JSON.parse(content)
          } catch {
            bundle[item.file] = content
          }
        } else {
          bundle[item.file] = content
        }

        bundle._meta.includedFiles.push(item.file)
        bundle._meta.totalFiles++
        totalSize += Buffer.byteLength(content, 'utf-8')
      } catch {
        bundle._meta.missingFiles.push(item.file)
        bundle[item.file] = null
      }
    }

    // Also include latest_report.json if exists
    try {
      const reportPath = path.join(basePath, 'latest_report.json')
      const content = await fs.readFile(reportPath, 'utf-8')
      try {
        bundle['latest_report.json'] = JSON.parse(content)
      } catch {
        bundle['latest_report.json'] = content
      }
      bundle._meta.includedFiles.push('latest_report.json')
      bundle._meta.totalFiles++
      totalSize += Buffer.byteLength(content, 'utf-8')
    } catch { /* no latest report yet */ }

    bundle._meta.totalSizeBytes = totalSize

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rally-architecture-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    console.error('Architecture download error:', error)
    return NextResponse.json(
      { error: 'Failed to generate architecture bundle', details: String(error) },
      { status: 500 }
    )
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
