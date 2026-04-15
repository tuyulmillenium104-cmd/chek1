/**
 * GET /api/rally-cli/status
 *
 * Read current generation status from log/status file.
 */
import { NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const RALLY_DIR = '/home/z/my-project/download/rally-brain';
const STATUS_FILE = join(RALLY_DIR, 'campaign_data', '.current_job.json');
const LOG_FILE = '/tmp/rally_run.log';

export async function GET() {
  try {
    // Check if there's a running job
    let jobStatus: Record<string, unknown> = {};
    if (existsSync(STATUS_FILE)) {
      try {
        const stat = statSync(STATUS_FILE);
        const age = Date.now() - stat.mtimeMs;
        // If status file is older than 10 minutes, consider it stale
        if (age < 600000) {
          jobStatus = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
          jobStatus.stale = false;
        } else {
          jobStatus = { status: 'idle', stale: true };
        }
      } catch {
        jobStatus = { status: 'idle' };
      }
    } else {
      jobStatus = { status: 'idle' };
    }

    // Read last 20 lines of log
    let logLines: string[] = [];
    if (existsSync(LOG_FILE)) {
      try {
        const log = readFileSync(LOG_FILE, 'utf-8');
        logLines = log.split('\n').filter(l => l.trim()).slice(-20);
      } catch {}
    }

    return NextResponse.json({
      ...jobStatus,
      logTail: logLines,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
