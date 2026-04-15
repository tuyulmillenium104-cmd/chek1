/**
 * POST /api/rally-cli/run
 *
 * Trigger generate.js for a campaign via child_process.
 * Captures output to status file for real-time monitoring.
 */
import { NextResponse } from 'next/server';
import { existsSync, statSync, readFileSync, writeFile, unlink } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

const RALLY_DIR = '/home/z/my-project/download/rally-brain';
const STATUS_FILE = join(RALLY_DIR, 'campaign_data', '.current_job.json');

function writeStatus(data: Record<string, unknown>) {
  writeFile(STATUS_FILE, JSON.stringify(data, null, 2), () => {});
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { campaign } = body;

    if (!campaign || typeof campaign !== 'string') {
      return NextResponse.json(
        { error: 'Parameter "campaign" wajib diisi (contoh: marbmarket-m0)' },
        { status: 400 }
      );
    }

    const jobId = randomUUID().slice(0, 8);
    const startTime = Date.now();

    // Check if there's already a running job
    if (existsSync(STATUS_FILE)) {
      try {
        const stat = statSync(STATUS_FILE);
        const age = Date.now() - stat.mtimeMs;
        if (age < 600000) {
          const current = JSON.parse(readFileSync(STATUS_FILE, 'utf-8'));
          if (current.status === 'running') {
            return NextResponse.json(
              { error: 'Sudah ada job yang berjalan. Tunggu sampai selesai.' },
              { status: 409 }
            );
          }
        }
      } catch { /* ignore stale status file */ }
    }

    // Write initial status
    writeStatus({
      jobId,
      status: 'running',
      campaign,
      startTime: new Date().toISOString(),
      step: 'starting',
    });

    // Remove lock file if exists
    const lockFile = join(RALLY_DIR, 'campaign_data', '.rally_guard.lock');
    if (existsSync(lockFile)) {
      unlink(lockFile, () => {});
    }

    // Spawn generate.js
    const generatePath = join(RALLY_DIR, 'generate.js');

    const child = spawn('node', [generatePath, campaign], {
      cwd: RALLY_DIR,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let outputLines: string[] = [];
    let lastStep = 'starting';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const lines = text.split('\n').filter(l => l.trim());
      outputLines.push(...lines);

      for (const line of lines) {
        if (line.includes('Generating variation')) lastStep = 'generating';
        else if (line.includes('PROGRAMMATIC') || line.includes('JUDGE')) lastStep = 'evaluating';
        else if (line.includes('Q&A') || line.includes('QA')) lastStep = 'qa_generation';
        else if (line.includes('FINAL') || line.includes('DONE')) lastStep = 'finalizing';
      }

      writeStatus({
        jobId,
        status: 'running',
        campaign,
        startTime: new Date(startTime).toISOString(),
        step: lastStep,
        outputLines: outputLines.slice(-10),
        elapsed: Date.now() - startTime,
      });
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      outputLines.push(`[ERR] ${text}`);
    });

    child.on('close', (code) => {
      const exitCode = code ?? -1;
      const processingTime = Date.now() - startTime;

      try {
        const predictionPath = join(RALLY_DIR, 'campaign_data', `${campaign}_output`, 'prediction.json');
        let score: number | null = null;
        let grade: string | null = null;
        let predictionData: Record<string, unknown> | null = null;

        if (existsSync(predictionPath)) {
          predictionData = JSON.parse(readFileSync(predictionPath, 'utf-8'));
          score = predictionData.score as number;
          grade = predictionData.grade as string;
        }

        writeStatus({
          jobId,
          status: exitCode === 0 ? 'completed' : 'failed',
          campaign,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          processingTimeMs: processingTime,
          step: exitCode === 0 ? 'done' : 'error',
          exitCode,
          score,
          grade,
          result: predictionData,
          outputLines: outputLines.slice(-20),
        });

        console.log(`[rally-cli] Job ${jobId} finished: exitCode=${exitCode} score=${score} grade=${grade} time=${processingTime}ms`);
      } catch (err) {
        console.error('[rally-cli] Error writing final status:', err);
      }
    });

    return NextResponse.json({
      success: true,
      jobId,
      campaign,
      status: 'running',
      message: `Campaign "${campaign}" sedang diproses...`,
      pollUrl: '/api/rally-cli/status',
    });
  } catch (error) {
    console.error('[rally-cli] Run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
