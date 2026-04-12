import { NextResponse } from 'next/server';
import { getWorklog, getLearningLog, buildTimeline } from '@/lib/rally-data';
import { getMaster } from '@/lib/rally-data';

export async function GET() {
  try {
    const worklogText = getWorklog();
    const learningLog = getLearningLog(100);
    const master = getMaster();
    const timeline = buildTimeline(learningLog, master);

    // Parse worklog into entries if available
    let worklogEntries: string[] = [];
    if (worklogText) {
      worklogEntries = worklogText
        .split('\n')
        .filter((line) => line.trim().length > 0);
    }

    // Categorize learning log entries by type
    const entriesByType: Record<string, any[]> = {};
    for (const entry of learningLog) {
      const type = entry.type || 'unknown';
      if (!entriesByType[type]) entriesByType[type] = [];
      entriesByType[type].push(entry);
    }

    // Summary stats
    const totalEntries = learningLog.length;
    const typeCounts = Object.fromEntries(
      Object.entries(entriesByType).map(([k, v]) => [k, v.length])
    );

    const data = {
      worklog: {
        raw: worklogText,
        line_count: worklogEntries.length,
      },
      learning_log: {
        entries: learningLog,
        total: totalEntries,
        by_type: entriesByType,
        type_counts: typeCounts,
      },
      timeline: {
        events: timeline,
        total: timeline.length,
      },
      pipeline_state: master?.pipeline_state || null,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load worklog', message: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
