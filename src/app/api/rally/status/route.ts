/**
 * GET /api/rally/status
 * 
 * Returns comprehensive status of the Rally pipeline:
 * - Queue status (pending jobs count)
 * - Recent results
 * - Token pool health
 * - Gateway connectivity
 */

import { NextResponse } from 'next/server';
import { getQueueStatus, listJobs } from '@/lib/rally-jobs';
import { getAIClient } from '@/lib/http-ai-client';

export async function GET() {
  try {
    const client = getAIClient();

    // Get queue status
    const queueStatus = await getQueueStatus();

    // Get token pool status
    const tokenPool = client.getTokenPoolStatus();

    // Get bucket status
    const bucketStatus = client.getBucketStatus();

    // Get gateway info
    const currentGateway = client.getCurrentGateway();
    const allGateways = client.getAllGateways();

    // Check gateway connectivity (quick ping)
    const gatewayHealth: { host: string; status: string }[] = [];
    for (const host of allGateways) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`http://${host}/v1/models`, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer Z.ai',
            'X-Token': tokenPool.tokens[1]?.label ? 'ping' : '',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        gatewayHealth.push({
          host,
          status: response.status < 500 ? 'connected' : 'error',
        });
      } catch {
        gatewayHealth.push({ host, status: 'unreachable' });
      }
    }

    // Calculate capacity info
    const activeBuckets = bucketStatus.buckets.filter(
      (b) => b.used < b.capacity
    ).length;
    const totalCapacity = tokenPool.active * allGateways.length * 10; // tokens × gateways × 10/10min

    return NextResponse.json({
      status: 'online',
      timestamp: new Date().toISOString(),

      queue: {
        pendingJobs: queueStatus.pendingJobs,
        processingJobs: queueStatus.processingJobs,
        totalResults: queueStatus.totalResults,
      },

      tokenPool: {
        total: tokenPool.total,
        active: tokenPool.active,
        tokens: tokenPool.tokens.map((t) => ({
          index: t.index,
          label: t.label,
          userId: t.userId,
          remaining: t.remaining,
          status: t.status,
        })),
      },

      gateways: {
        current: currentGateway,
        all: allGateways,
        health: gatewayHealth,
      },

      rateLimits: {
        activeBuckets,
        totalBuckets: bucketStatus.totalBuckets,
        capacityPer10min: totalCapacity,
        bucketDetails: bucketStatus.buckets,
      },

      recentResults: queueStatus.recentResults.slice(0, 5),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Status error:', errorMsg);

    return NextResponse.json(
      {
        status: 'error',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
