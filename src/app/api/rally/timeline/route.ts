import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const worklogPath = path.join(process.cwd(), 'download/rally_system/rally_worklog.md');
    const worklog = fs.existsSync(worklogPath)
      ? fs.readFileSync(worklogPath, 'utf-8')
      : '';

    const masterPath = path.join(process.cwd(), 'download/rally_system/rally_master.json');
    const master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));

    // Parse worklog entries
    const blocks = worklog.split(/\n---\n/).filter(Boolean);
    const entries = blocks.map(block => {
      const lines = block.trim().split('\n');
      const taskId = lines.find(l => l.startsWith('Task ID:'))?.replace('Task ID:', '').trim() || '';
      const agent = lines.find(l => l.startsWith('Agent:'))?.replace('Agent:', '').trim() || '';
      const task = lines.find(l => l.startsWith('Task:'))?.replace('Task:', '').trim() || '';
      const rawTimestamp = lines.find(l => l.startsWith('Timestamp:'))?.replace('Timestamp:', '').trim() || '';
      // Extract just the ISO date portion (first ISO date string)
      const isoMatch = rawTimestamp.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      const timestamp = isoMatch ? isoMatch[1] : '';
      const summaryIdx = lines.findIndex(l => l.startsWith('Stage Summary:'));
      const summaryLines: string[] = [];
      if (summaryIdx >= 0) {
        for (let i = summaryIdx + 1; i < lines.length; i++) {
          if (lines[i].startsWith('-')) {
            summaryLines.push(lines[i].replace(/^- /, ''));
          }
        }
      }

      // Determine event type
      let type = 'pipeline';
      if (taskId.includes('BUILD') && !taskId.includes('CRON-START')) type = 'build_complete';
      else if (taskId.includes('MONITOR')) type = 'monitor_check';
      else if (taskId.includes('OVERHAUL') || taskId.includes('AUDIT')) type = 'pipeline';
      else if (taskId.includes('UPGRADE')) type = 'pipeline';

      // Extract score from summary if present
      const scoreMatch = block.match(/(\d+(?:\.\d+)?)\/18/);

      return {
        task_id: taskId,
        agent: agent.split('(')[0].trim(),
        task: task.substring(0, 120),
        timestamp,
        type,
        summary: summaryLines.slice(0, 5),
        score: scoreMatch ? parseFloat(scoreMatch[1]) : null,
      };
    }).reverse();

    // Campaign milestones
    const pipeline = master.pipeline_state;
    const campaign = master.active_campaign;

    const milestones = [
      {
        label: 'System Initialized',
        completed: true,
        timestamp: master.created,
      },
      {
        label: 'Campaign Set',
        completed: true,
        timestamp: campaign.set_at,
      },
      {
        label: 'First Build',
        completed: (pipeline.total_builds || 0) >= 1,
        timestamp: pipeline.last_build_at,
      },
      {
        label: '18/18 Achieved (prev campaign)',
        completed: true,
        timestamp: '2026-04-09T07:00:00.000Z',
      },
      {
        label: 'Current Best: 14.2/18',
        completed: true,
        timestamp: '2026-04-10T13:00:00.000Z',
      },
      {
        label: 'Target: 18/18',
        completed: false,
        timestamp: null,
      },
    ];

    return NextResponse.json({
      events: entries,
      milestones,
      total_events: entries.length,
      pipeline_status: pipeline.status,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error loading rally timeline:', error);
    return NextResponse.json(
      { error: 'Failed to load rally timeline data' },
      { status: 500 }
    );
  }
}
