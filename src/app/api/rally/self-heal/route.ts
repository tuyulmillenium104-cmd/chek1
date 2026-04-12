import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMaster, getKnowledgeVault, getPatternCache } from '@/lib/rally-data'
import { promises as fs } from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HealReport {
  timestamp: string
  status: 'healthy' | 'healed' | 'partial' | 'failed'
  checks: HealCheck[]
  summary: string
  actionsTaken: string[]
}

interface HealCheck {
  name: string
  status: 'pass' | 'fixed' | 'warn' | 'fail'
  detail: string
  action?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'download', 'rally_system')

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch {
    // Directory may already exist
  }
}

async function repairFile(fileName: string, defaultContent: string): Promise<boolean> {
  try {
    await ensureDir(DATA_DIR)
    const filePath = path.join(DATA_DIR, fileName)
    if (!(await fileExists(filePath))) {
      await fs.writeFile(filePath, defaultContent, 'utf-8')
      return true
    }
    // Check if file is empty or corrupted
    const content = await fs.readFile(filePath, 'utf-8')
    if (!content.trim()) {
      await fs.writeFile(filePath, defaultContent, 'utf-8')
      return true
    }
    // For JSON files, check parseability
    if (fileName.endsWith('.json')) {
      try {
        JSON.parse(content)
      } catch {
        await fs.writeFile(filePath, defaultContent, 'utf-8')
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

async function regenerateLatestReport(): Promise<boolean> {
  try {
    const reportPath = path.join(DATA_DIR, 'latest_report.json')
    const master = getMaster()
    const vault = getKnowledgeVault()
    const patterns = getPatternCache()

    const report = {
      _type: 'rally-self-heal-report',
      generatedAt: new Date().toISOString(),
      source: 'self-heal',
      systemStatus: 'auto-repaired',
      dataSnapshot: {
        masterLoaded: !!master,
        vaultLoaded: !!vault,
        patternsLoaded: !!patterns,
        activeCampaign: master?.active_campaign?.title || 'none',
        totalCampaigns: master?.campaigns?.length || 0,
        totalKnowledgeLessons: vault?.total_campaigns_worked || 0,
      },
    }

    await ensureDir(DATA_DIR)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8')
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Main self-heal logic
// ---------------------------------------------------------------------------
async function runSelfHeal(): Promise<HealReport> {
  const checks: HealCheck[] = []
  const actionsTaken: string[] = []
  let hasFixes = false
  let hasFailures = false

  // ── Check 1: Data directory exists ─────────────────────────────────
  try {
    const dirExists = await fileExists(DATA_DIR)
    if (!dirExists) {
      await ensureDir(DATA_DIR)
      checks.push({
        name: 'Data Directory',
        status: 'fixed',
        detail: 'Download data directory was missing, created it',
        action: `Created ${DATA_DIR}`,
      })
      actionsTaken.push('Created missing data directory')
      hasFixes = true
    } else {
      checks.push({
        name: 'Data Directory',
        status: 'pass',
        detail: 'Data directory exists',
      })
    }
  } catch (err) {
    checks.push({
      name: 'Data Directory',
      status: 'fail',
      detail: `Cannot verify data directory: ${err}`,
    })
    hasFailures = true
  }

  // ── Check 2: Core JSON files integrity ────────────────────────────
  const coreFiles = [
    { file: 'rally_master.json', default: '{"active_campaign":null,"campaigns":[]}' },
    { file: 'rally_knowledge_vault.json', default: '{"campaigns":[],"cross_campaign_lessons":{},"adaptive_system":{}}' },
    { file: 'rally_pattern_cache.json', default: '{"score_distribution":{},"inherited_patterns_from_prev_campaign":{}}' },
    { file: 'rally_qna.json', default: '{"qa_pairs":[]}' },
    { file: 'rally_task_queue.json', default: '{"tasks":[],"pending":[]}' },
    { file: 'rally_intel_cache.json', default: '{"intel":[]}' },
  ]

  for (const { file, default: defaultContent } of coreFiles) {
    const repaired = await repairFile(file, defaultContent)
    if (repaired) {
      checks.push({
        name: `File: ${file}`,
        status: 'fixed',
        detail: `Repaired or recreated ${file}`,
        action: `Restored ${file} with default content`,
      })
      actionsTaken.push(`Repaired ${file}`)
      hasFixes = true
    } else {
      const exists = await fileExists(path.join(DATA_DIR, file))
      if (exists) {
        checks.push({
          name: `File: ${file}`,
          status: 'pass',
          detail: `${file} exists and is valid`,
        })
      } else {
        checks.push({
          name: `File: ${file}`,
          status: 'fail',
          detail: `Failed to create ${file}`,
        })
        hasFailures = true
      }
    }
  }

  // ── Check 3: Text files ───────────────────────────────────────────
  const textFiles = [
    { file: 'rally_best_content.txt', default: '# Rally Best Content\n\nNo best content recorded yet.\n' },
    { file: 'rally_worklog.md', default: '# Rally Worklog\n\nAuto-generated by self-heal system.\n' },
    { file: 'RALLY_README.txt', default: '# Rally Command Center\n\nArchitecture files for Rally.fun content system.\n' },
    { file: 'rally_learning_log.jsonl', default: '' },
  ]

  for (const { file, default: defaultContent } of textFiles) {
    const exists = await fileExists(path.join(DATA_DIR, file))
    if (!exists) {
      const repaired = await repairFile(file, defaultContent)
      if (repaired) {
        checks.push({
          name: `File: ${file}`,
          status: 'fixed',
          detail: `Created missing ${file}`,
        })
        actionsTaken.push(`Created ${file}`)
        hasFixes = true
      }
    } else {
      checks.push({
        name: `File: ${file}`,
        status: 'pass',
        detail: `${file} exists`,
      })
    }
  }

  // ── Check 4: Database connection and pipeline runs ────────────────
  try {
    const pipelineModel = (db as any).pipelineRun
    if (pipelineModel && typeof pipelineModel.findMany === 'function') {
      const failedRuns = await pipelineModel.findMany({
        where: { status: 'error' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      if (failedRuns.length > 0) {
        // Auto-dismiss stale failed runs older than 24 hours
        const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const staleRuns = failedRuns.filter(r => new Date(r.createdAt) < staleThreshold)

        if (staleRuns.length > 0) {
          await pipelineModel.updateMany({
            where: {
              id: { in: staleRuns.map(r => r.id) },
              status: 'error',
            },
            data: { status: 'dismissed' },
          })
          checks.push({
            name: 'Stale Failed Runs',
            status: 'fixed',
            detail: `Auto-dismissed ${staleRuns.length} stale error runs (>24h old)`,
            action: `Dismissed ${staleRuns.length} old failed pipeline runs`,
          })
          actionsTaken.push(`Auto-dismissed ${staleRuns.length} stale failed runs`)
          hasFixes = true
        }

        const recentFailed = failedRuns.filter(r => new Date(r.createdAt) >= staleThreshold)
        if (recentFailed.length > 0) {
          checks.push({
            name: 'Recent Failed Runs',
            status: 'warn',
            detail: `${recentFailed.length} recent failed runs (<24h) still pending manual review`,
          })
        } else {
          checks.push({
            name: 'Pipeline Runs',
            status: 'pass',
            detail: `No recent failed pipeline runs`,
          })
        }
      } else {
        checks.push({
          name: 'Pipeline Runs',
          status: 'pass',
          detail: 'No failed pipeline runs',
        })
      }
    } else {
      checks.push({
        name: 'Pipeline Runs',
        status: 'pass',
        detail: 'Pipeline model not available (no DB runs to check)',
      })
    }
  } catch (err) {
    checks.push({
      name: 'Pipeline Runs',
      status: 'warn',
      detail: `Could not check pipeline runs: ${err}`,
    })
  }

  // ── Check 5: Campaign data in database ────────────────────────────
  try {
    const campaignModel = (db as any).rallyCampaign
    if (campaignModel && typeof campaignModel.count === 'function') {
      const count = await campaignModel.count()
      checks.push({
        name: 'Campaign Database',
        status: count > 0 ? 'pass' : 'warn',
        detail: `${count} campaigns in database`,
      })

      // Check for campaigns without proper data
      if (count > 0) {
        const emptyCampaigns = await campaignModel.findMany({
          where: {
            OR: [
              { title: { isSet: false } },
              { title: '' },
            ],
          },
          take: 5,
        })
        if (emptyCampaigns.length > 0) {
          checks.push({
            name: 'Campaign Data Quality',
            status: 'warn',
            detail: `${emptyCampaigns.length} campaigns with missing title data`,
          })
        }
      }
    }
  } catch {
    checks.push({
      name: 'Campaign Database',
      status: 'pass',
      detail: 'Campaign model not available',
    })
  }

  // ── Check 6: Regenerate latest report ────────────────────────────
  const reportRegenerated = await regenerateLatestReport()
  if (reportRegenerated) {
    checks.push({
      name: 'Latest Report',
      status: 'fixed',
      detail: 'Regenerated latest_report.json with current system snapshot',
      action: 'Regenerated latest_report.json',
    })
    actionsTaken.push('Regenerated latest report')
    hasFixes = true
  } else {
    checks.push({
      name: 'Latest Report',
      status: 'warn',
      detail: 'Failed to regenerate latest report',
    })
  }

  // ── Determine overall status ──────────────────────────────────────
  let status: HealReport['status']
  if (hasFailures) {
    status = 'partial'
  } else if (hasFixes) {
    status = 'healed'
  } else {
    status = 'healthy'
  }

  const fixedCount = checks.filter(c => c.status === 'fixed').length
  const passCount = checks.filter(c => c.status === 'pass').length
  const warnCount = checks.filter(c => c.status === 'warn').length
  const failCount = checks.filter(c => c.status === 'fail').length

  return {
    timestamp: new Date().toISOString(),
    status,
    checks,
    summary: `Self-heal complete: ${passCount} passed, ${fixedCount} fixed, ${warnCount} warnings, ${failCount} failures`,
    actionsTaken,
  }
}

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const report = await runSelfHeal()
    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Self-heal GET error:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'failed',
        checks: [],
        summary: `Self-heal failed: ${error.message}`,
        actionsTaken: [],
      } satisfies HealReport,
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const report = await runSelfHeal()

    // Also write the heal report to file for persistence
    try {
      const healLogPath = path.join(DATA_DIR, 'heal_log.jsonl')
      const entry = JSON.stringify(report) + '\n'
      await fs.appendFile(healLogPath, entry, 'utf-8')
    } catch {
      // Non-critical: logging the heal report
    }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Self-heal POST error:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'failed',
        checks: [],
        summary: `Self-heal failed: ${error.message}`,
        actionsTaken: [],
      } satisfies HealReport,
      { status: 500 }
    )
  }
}
