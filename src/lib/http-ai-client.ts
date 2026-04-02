/**
 * Direct AI HTTP Client for Rally Pipeline v3
 *
 * Rate Limit-Aware AI calling with intelligent bucket scheduling.
 *
 * Key improvements over v2:
 * - PROACTIVE bucket selection: Always picks best available bucket BEFORE making request
 * - NO error-based switching: acquireSlot() handles all routing internally
 * - Smart bounded waiting: Waits only until next bucket resets (not 120s flat)
 * - Server-aware budget tracking: Uses ip-10min-remaining headers aggressively
 * - Graceful degradation: Falls back gracefully when all buckets exhausted
 *
 * Architecture:
 * - 11 tokens across multiple userIds
 * - 2 gateways × N userIds = many rate limit buckets (10 req/10min each)
 * - QPS limit: 2 req/sec global
 * - acquireSlot() is the SINGLE point of rate limit management
 */

export interface TokenData {
  token: string;
  chatId: string;
  userId: string;
  label: string;
  _remainingDaily?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enableSearch?: boolean;
  enableThinking?: boolean;
  maxRetries?: number;
  /** Force a specific token index for judge isolation */
  forceTokenIndex?: number;
}

interface ChatResponse {
  content: string;
  thinking: string | null;
  gateway: string;
  bucketKey: string;
  remaining10min?: number;
}

/** Result from acquireSlot — a reserved rate limit slot */
interface AcquiredSlot {
  gateway: string;
  tokenData: TokenData;
  bucketKey: string;
  tokenIndex: number;
}

// ─── Token Pool ──────────────────────────────────────────────────────
// Embedded token pool — 11 tokens (index 0 is null/auto-config, indices 1-10 are manual)
const EMBEDDED_TOKENS: (TokenData | null)[] = [
  null, // Token 0: Auto-config
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtNTQ5ZmI5MTEtZWM0NS00NGJiLTg5YjEtMWY2MTljNTEzN2QzIn0.M6IQTOXasSbEw98a4R6p3LEPwJPCWyRZiJSUo8lr2PM',
    chatId: 'chat-549fb911-ec45-44bb-89b1-1f619c5137d3',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    label: 'Akun A #1',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtMTAyYTlkMGUtYTVkNy00MmY2LTk3ZjctNDk5NzFiNzcwNjVhIn0.6cDfQbTc2HHdtKXBfaUvpBsNLPbbjYkpJp6br0rYteA',
    chatId: 'chat-102a9d0e-a5d7-42f6-97f7-49971b77065a',
    userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
    label: 'Akun B #1',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtMDAyOWJjNDYtZGI3Ny00ZmZkLWI4ZDItM2RlYzFlNWVkNDU3In0.CMthZytUFBpnqW3K52Q1AAgB9uvhyXf3AG-FQvaDoYI',
    chatId: 'chat-0029bc46-db77-4ffd-b8d2-3dec1e5ed457',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    label: 'Akun A #2',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtOTZlZTk1NmItMGYxMi00MGUxLWE0MzYtYTk4YmQwZjk0YzJhIn0.PgpMEiUr8a6Cu2vl9zFMggRsxQrx3JwkUCOjZCUIJnw',
    chatId: 'chat-96ee956b-0f12-40e1-a436-a98bd0f94c2a',
    userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
    label: 'Akun B #2',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtOWJiMzAzOTMtYWE3Mi00Y2QzLWJkNzktYzJkZmI0ODVmNzgyIn0.jb35oqGKPB2FLC-X_mozORmvbBilwRc_pSZEkbyaRfw',
    chatId: 'chat-9bb30393-aa72-4cd3-bd79-c2dfb485f782',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    label: 'Akun A #3',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtYjAyYTlhMmUtZTg5My00NGMwLWEzMTktNTZlYTk0YzRkOTQxIn0.GQLbTpxXn-gcONVhEYr6Ozq7sTOdE5NJt5wIiGfVTQM',
    chatId: 'chat-b0b2aa2e-e893-44c0-a319-56ea94c4d941',
    userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
    label: 'Akun B #3',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtZDE3ZGY4ODQtZGNlOC00MmU3LWEzMTctMDQzYjI0YmM3MjdmIn0.W8UQmOxVIqGsAicZc9n4r4jR3IVM5Yj9V-SWv8H_0ac',
    chatId: 'chat-d17df884-dce8-42e7-a317-043b24bc727f',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    label: 'Akun A #4',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYzAwMTI0YWQtODk2Yy00NzBiLWE0OTYtOGFlNTYzMTQ0YTUwIn0.a0UXyTQ3z4D0g0mzHbVLpBMMN6cftW1W_-ELiObLqXY',
    chatId: 'chat-c00124ad-896c-470b-a496-8ae563144a50',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    label: 'Akun C #1',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYmI4MjllYTMtMGQzNy00OTQ0LTg3MDUtMDAwOTBiZGUzNjcxIiwiY2hhdF9pZCI6ImNoYXQtNTRjOTZlMTQtNzMyYy00NjA1LWIyZTQtNWU3NzI1MjlhNTQ3In0.VzXhIi9TLBZ_7H0c5pRP9AL7HSCaL3RwO7-j_dqH4FY',
    chatId: 'chat-54c96e14-732c-4605-b2e4-5e772529a547',
    userId: 'bb829ea3-0d37-4944-8705-00090bde3671',
    label: 'Akun D #1',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTc2MzEyNjMtNWRiYS00ZTE2LWIxMjctMTkyMTJlMDEyYTliIiwiY2hhdF9pZCI6ImNoYXQtYWYxZDE3YWQtZDI1NC00YmFkLWI5ZmMtN2YyOTIwOTExNjExIn0.xG3YxW5PNy_LJrO9JfPgPFv3U0f_46IY4NqxYTZfqIo',
    chatId: 'chat-af1d17ad-d254-4bad-b9fc-7f2920911611',
    userId: '97631263-5dba-4e16-b127-19212e012a9b',
    label: 'Akun E #1',
  },
  {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMWNkY2Y1NzktYzZlNS00ZWY3LTgyZDUtZDg2OWQ4Yzg1YTVlIiwiY2hhdF9pZCI6ImNoYXQtMDQ4YTVhODItZWRhMi00ZTQ0LTk4YWEtZmM5YTk0Y2UyNWZmIn0.asZolcXMp4kvy_2UqeA4BHvYx0gAsw7mNgNrRXKJrtw',
    chatId: 'chat-048a5a82-eda2-4e44-98aa-fc9a94ce25ff',
    userId: '1cdcf579-c6e5-4ef7-82d5-d869d8c85a5e',
    label: 'Extra User #1',
  },
];

// ─── Constants ───────────────────────────────────────────────────────
const GATEWAY_HOSTS = ['172.25.136.193:8080', '172.25.136.210:8080'];
const IP_RATE_LIMIT = 10;       // 10 requests per window per bucket
const IP_RATE_WINDOW = 600000;  // 10 minutes in ms
const DEFAULT_TIMEOUT = 45000; // 45s HTTP timeout (thinking OFF calls complete in <15s, 45s is generous)
const MAX_WAIT_PER_SLOT = 5000; // Max 5s wait for a rate limit slot

// ─── DirectAIClient ──────────────────────────────────────────────────

export class DirectAIClient {
  private tokens: (TokenData | null)[];
  private requestTimes: number[] = [];
  /** Per-bucket request timestamps for 10min window tracking */
  private requestTimes10minMap = new Map<string, number[]>();
  /** Server-reported remaining quota per bucket (from ip-10min-remaining header) */
  private bucketRemainingMap = new Map<string, number>();
  /** Token rotation round-robin index */
  private tokenRoundRobin = 0;
  /** User ID groups for intelligent token selection */
  private userIdGroups: Map<string, number[]> = new Map();
  private userIdList: string[] = [];
  private initialized = false;

  constructor() {
    this.tokens = EMBEDDED_TOKENS.map((t) =>
      t ? { ...t, _remainingDaily: 300 } : null
    );
    this.initUserIdGroups();
  }

  // ─── Initialization ───────────────────────────────────────────────

  private initUserIdGroups() {
    this.userIdGroups.clear();
    this.userIdList = [];
    this.tokens.forEach((t, i) => {
      if (t && t.token && t.userId) {
        if (!this.userIdGroups.has(t.userId)) {
          this.userIdGroups.set(t.userId, []);
          this.userIdList.push(t.userId);
        }
        this.userIdGroups.get(t.userId)!.push(i);
      }
    });
    this.initialized = true;
  }

  // ─── Core: Bucket Remaining Calculation ───────────────────────────

  /**
   * Calculate effective remaining capacity for a bucket.
   * Uses BOTH client-side tracking AND server-reported remaining (whichever is lower).
   */
  private getBucketRemaining(bucketKey: string): number {
    // Client-side: count recent requests in the window
    const times = this.requestTimes10minMap.get(bucketKey);
    let clientRemaining = IP_RATE_LIMIT;
    if (times) {
      const now = Date.now();
      const recent = times.filter(t => now - t < IP_RATE_WINDOW);
      clientRemaining = IP_RATE_LIMIT - recent.length;
    }

    // Server-side: trust the server's remaining count
    const serverRemaining = this.bucketRemainingMap.get(bucketKey);
    if (serverRemaining !== undefined && serverRemaining >= 0) {
      return Math.min(clientRemaining, serverRemaining);
    }

    return clientRemaining;
  }

  /**
   * Get total remaining budget across ALL buckets.
   * Useful for pipeline to know if it can proceed.
   */
  getTotalBudget(): number {
    let total = 0;
    for (const gw of GATEWAY_HOSTS) {
      for (const userId of this.userIdList) {
        total += this.getBucketRemaining(`${gw}:${userId}`);
      }
    }
    return total;
  }

  /**
   * Get number of active buckets (with remaining > 0).
   */
  getActiveBucketCount(): number {
    let count = 0;
    for (const gw of GATEWAY_HOSTS) {
      for (const userId of this.userIdList) {
        if (this.getBucketRemaining(`${gw}:${userId}`) > 0) count++;
      }
    }
    return count;
  }

  // ─── Core: Find Best Bucket ───────────────────────────────────────

  /**
   * Find the bucket with the most remaining capacity.
   * Also finds the best token for that bucket's userId.
   */
  private findBestBucket(): { gateway: string; tokenIndex: number; bucketKey: string; remaining: number } | null {
    if (!this.initialized) this.initUserIdGroups();

    let bestBucket: { gateway: string; tokenIndex: number; bucketKey: string; remaining: number } | null = null;
    let bestRemaining = 0;

    for (const gw of GATEWAY_HOSTS) {
      for (const userId of this.userIdList) {
        const bucketKey = `${gw}:${userId}`;
        const remaining = this.getBucketRemaining(bucketKey);

        if (remaining > bestRemaining) {
          bestRemaining = remaining;

          // Find best token for this userId (highest daily remaining)
          const tokenIndices = this.userIdGroups.get(userId) || [];
          let bestTokenIdx = -1;
          let bestDaily = -1;
          for (const idx of tokenIndices) {
            const t = this.tokens[idx];
            if (t && (t._remainingDaily || 300) > bestDaily) {
              bestDaily = t._remainingDaily || 300;
              bestTokenIdx = idx;
            }
          }

          if (bestTokenIdx >= 0) {
            bestBucket = { gateway: gw, tokenIndex: bestTokenIdx, bucketKey, remaining };
          }
        }
      }
    }

    return bestBucket;
  }

  // ─── Core: acquireSlot — THE SINGLE POINT OF RATE LIMIT MANAGEMENT ─

  /**
   * Acquire a rate limit slot — finds the best available bucket and returns
   * gateway + token info. If all buckets are full, waits for the shortest
   * bucket reset time (bounded by maxWaitMs).
   *
   * This replaces the old error-based bucket switching approach.
   * The caller NEVER needs to handle "switch bucket" errors.
   *
   * @param maxWaitMs - Maximum time to wait for a slot (default 30s)
   * @param forceTokenIndex - If specified, use this token and find best gateway for its userId
   */
  private async acquireSlot(
    maxWaitMs: number = MAX_WAIT_PER_SLOT,
    forceTokenIndex?: number
  ): Promise<AcquiredSlot> {
    // ── LAYER 1: QPS limit (2 req/sec) — GLOBAL ──
    await this.enforceQPSLimit();

    // ── LAYER 2: Find best available bucket ──
    const slot = this.findAvailableSlot(forceTokenIndex);
    if (slot) {
      this.recordBucketUsage(slot.bucketKey);
      return slot;
    }

    // ── LAYER 3: No immediate slot — calculate smart wait ──
    const waitMs = this.calculateShortestReset(forceTokenIndex);
    const boundedWait = Math.min(waitMs, maxWaitMs);

    if (boundedWait <= 0) {
      // Wait completed or negligible — try again immediately
      const retry = this.findAvailableSlot(forceTokenIndex);
      if (retry) {
        this.recordBucketUsage(retry.bucketKey);
        return retry;
      }
      // Tracking might be stale — force reset and retry
      return this.forceAcquire(forceTokenIndex);
    }

    const label = forceTokenIndex !== undefined
      ? `token#${forceTokenIndex}`
      : 'any';
    console.log(`[RateLimit] All buckets full for ${label}. Waiting ${Math.round(boundedWait / 1000)}s for next reset...`);

    await new Promise(r => setTimeout(r, boundedWait));

    // After waiting, clean up stale entries and try again
    this.cleanStaleBucketEntries();

    const afterWait = this.findAvailableSlot(forceTokenIndex);
    if (afterWait) {
      this.recordBucketUsage(afterWait.bucketKey);
      return afterWait;
    }

    // Still nothing — force through (tracking was stale)
    return this.forceAcquire(forceTokenIndex);
  }

  /**
   * Enforce global QPS limit (2 requests per second).
   */
  private async enforceQPSLimit(): Promise<void> {
    const now = Date.now();
    // Clean old entries (older than 1 second)
    while (this.requestTimes.length > 0 && now - this.requestTimes[0] > 1000) {
      this.requestTimes.shift();
    }
    if (this.requestTimes.length >= 5) {
      const waitMs = 1000 - (now - this.requestTimes[0]) + 50; // 50ms buffer
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
    this.requestTimes.push(Date.now());
  }

  /**
   * Find an immediately available slot.
   */
  private findAvailableSlot(forceTokenIndex?: number): AcquiredSlot | null {
    if (forceTokenIndex !== undefined && forceTokenIndex !== null && forceTokenIndex >= 0) {
      // Forced token: find best gateway for this token's userId
      const token = this.tokens[forceTokenIndex];
      if (!token) return null;

      let bestGw: string | null = null;
      let bestRemaining = 0;
      let bestBucketKey = '';

      for (const gw of GATEWAY_HOSTS) {
        const bucketKey = `${gw}:${token.userId}`;
        const remaining = this.getBucketRemaining(bucketKey);
        if (remaining > bestRemaining) {
          bestRemaining = remaining;
          bestGw = gw;
          bestBucketKey = bucketKey;
        }
      }

      if (bestGw && bestRemaining > 0) {
        return {
          gateway: bestGw,
          tokenData: { ...token, chatId: this.generateUniqueChatId() },
          bucketKey: bestBucketKey,
          tokenIndex: forceTokenIndex,
        };
      }
      return null; // No capacity for forced token on any gateway
    }

    // Free selection: find globally best bucket
    const bestBucket = this.findBestBucket();
    if (bestBucket && bestBucket.remaining > 0 && bestBucket.tokenIndex >= 0) {
      const token = this.tokens[bestBucket.tokenIndex];
      if (token) {
        return {
          gateway: bestBucket.gateway,
          tokenData: { ...token, chatId: this.generateUniqueChatId() },
          bucketKey: bestBucket.bucketKey,
          tokenIndex: bestBucket.tokenIndex,
        };
      }
    }
    return null;
  }

  /**
   * Calculate the shortest wait time until ANY relevant bucket resets.
   */
  private calculateShortestReset(forceTokenIndex?: number): number {
    let shortest = Infinity;
    const now = Date.now();

    const bucketsToCheck: string[] = [];

    if (forceTokenIndex !== undefined && forceTokenIndex !== null && forceTokenIndex >= 0) {
      const token = this.tokens[forceTokenIndex];
      if (token) {
        for (const gw of GATEWAY_HOSTS) {
          bucketsToCheck.push(`${gw}:${token.userId}`);
        }
      }
    } else {
      // Check ALL known buckets
      for (const gw of GATEWAY_HOSTS) {
        for (const userId of this.userIdList) {
          bucketsToCheck.push(`${gw}:${userId}`);
        }
      }
    }

    for (const bucketKey of bucketsToCheck) {
      const times = this.requestTimes10minMap.get(bucketKey);
      if (times) {
        const recent = times.filter(t => now - t < IP_RATE_WINDOW);
        if (recent.length >= IP_RATE_LIMIT && recent.length > 0) {
          const resetAt = recent[0] + IP_RATE_WINDOW;
          const wait = resetAt - now + 500; // 500ms buffer
          if (wait > 0 && wait < shortest) shortest = wait;
        }
      }

      // Also check server-reported remaining
      const serverRemaining = this.bucketRemainingMap.get(bucketKey);
      if (serverRemaining !== undefined && serverRemaining <= 0) {
        const times2 = this.requestTimes10minMap.get(bucketKey);
        if (times2 && times2.length > 0) {
          const recent = times2.filter(t => now - t < IP_RATE_WINDOW);
          if (recent.length > 0) {
            const resetAt = recent[0] + IP_RATE_WINDOW;
            const wait = resetAt - now + 1000; // 1s buffer
            if (wait > 0 && wait < shortest) shortest = wait;
          }
        }
      }
    }

    // If we can't determine a reset time, use a reasonable default
    return shortest === Infinity ? 30000 : shortest;
  }

  /**
   * Force acquire a slot when tracking may be stale.
   * Resets all bucket tracking and picks the best available.
   */
  private forceAcquire(forceTokenIndex?: number): AcquiredSlot {
    // Reset tracking — the window may have passed
    this.cleanStaleBucketEntries();
    this.bucketRemainingMap.clear();

    if (forceTokenIndex !== undefined && forceTokenIndex !== null && forceTokenIndex >= 0) {
      const token = this.tokens[forceTokenIndex];
      if (token) {
        const gw = GATEWAY_HOSTS[0];
        const bucketKey = `${gw}:${token.userId}`;
        this.recordBucketUsage(bucketKey);
        return {
          gateway: gw,
          tokenData: { ...token, chatId: this.generateUniqueChatId() },
          bucketKey,
          tokenIndex: forceTokenIndex,
        };
      }
    }

    // Fallback: pick best bucket after reset
    const best = this.findBestBucket();
    if (best && best.tokenIndex >= 0) {
      const token = this.tokens[best.tokenIndex];
      if (token) {
        this.recordBucketUsage(best.bucketKey);
        return {
          gateway: best.gateway,
          tokenData: { ...token, chatId: this.generateUniqueChatId() },
          bucketKey: best.bucketKey,
          tokenIndex: best.tokenIndex,
        };
      }
    }

    // Last resort: use first available token on primary gateway
    for (let i = 1; i < this.tokens.length; i++) {
      if (this.tokens[i] && this.tokens[i]!.token) {
        const gw = GATEWAY_HOSTS[0];
        const bucketKey = `${gw}:${this.tokens[i]!.userId}`;
        this.recordBucketUsage(bucketKey);
        return {
          gateway: gw,
          tokenData: { ...this.tokens[i]!, chatId: this.generateUniqueChatId() },
          bucketKey,
          tokenIndex: i,
        };
      }
    }

    throw new Error('No tokens available');
  }

  /**
   * Record that a request was made on a bucket (for 10min window tracking).
   */
  private recordBucketUsage(bucketKey: string): void {
    if (!this.requestTimes10minMap.has(bucketKey)) {
      this.requestTimes10minMap.set(bucketKey, []);
    }
    this.requestTimes10minMap.get(bucketKey)!.push(Date.now());
  }

  /**
   * Clean up stale entries from all bucket tracking maps.
   */
  private cleanStaleBucketEntries(): void {
    const now = Date.now();
    for (const [, times] of this.requestTimes10minMap) {
      const fresh = times.filter(t => now - t < IP_RATE_WINDOW);
      times.length = 0;
      times.push(...fresh);
    }
  }

  // ─── HTTP Request ─────────────────────────────────────────────────

  /**
   * Make a single AI HTTP call using an acquired slot.
   * NO rate limit management here — that's handled by acquireSlot().
   */
  private async makeHTTPRequest(
    slot: AcquiredSlot,
    messages: ChatMessage[],
    maxTokens: number,
    temperature: number,
    options: ChatOptions
  ): Promise<ChatResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer Z.ai',
      'X-Z-AI-From': 'Z',
      'X-Token': slot.tokenData.token,
      'X-User-Id': slot.tokenData.userId,
      'X-Chat-Id': slot.tokenData.chatId,
    };

    const gwUrl = `http://${slot.gateway}/v1/chat/completions`;

    const body = JSON.stringify({
      model: options.model || 'glm-4-plus',
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(options.enableSearch ? { enable_search: true } : {}),
      // Thinking: OFF by default. All current callers use enableThinking: false.
      // When ON, glm-4-plus consumes all tokens for reasoning, leaving content empty.
      ...(options.enableThinking === true ? { enable_thinking: true } : { enable_thinking: false }),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(gwUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      // Track server-side remaining from response headers (on both success and failure)
      const remaining10min = response.headers.get('ip-10min-remaining');
      if (remaining10min) {
        const remaining = parseInt(remaining10min, 10);
        this.bucketRemainingMap.set(slot.bucketKey, remaining);
      }

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited — update tracking and throw a specific error
          const serverRemaining = remaining10min ? parseInt(remaining10min, 10) : -1;
          throw new RateLimitError(
            `Rate limit (429) on ${slot.bucketKey}`,
            slot.bucketKey,
            serverRemaining
          );
        }
        if (response.status === 403) {
          slot.tokenData._remainingDaily = 0;
          throw new AuthError('Auth failed (403)');
        }
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();

      const content = data.choices?.[0]?.message?.content || '';
      const thinking = data.choices?.[0]?.message?.reasoning_content || null;

      if (!content) {
        console.warn(
          `[AI] Empty content from ${slot.gateway}. Model: ${data.model || '?'}, Finish: ${data.choices?.[0]?.finish_reason || '?'}`,
          JSON.stringify(data).substring(0, 300)
        );
      }

      return {
        content,
        thinking,
        gateway: slot.gateway,
        bucketKey: slot.bucketKey,
        remaining10min: remaining10min ? parseInt(remaining10min, 10) : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─── Judge Isolation Methods ──────────────────────────────────────

  /**
   * Make an isolated chat call forcing a specific token index.
   * Used for independent judge evaluations where context isolation is critical.
   */
  async chatIsolated(
    messages: ChatMessage[],
    tokenIndex: number,
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    return this.chat(messages, {
      ...options,
      forceTokenIndex: tokenIndex,
    });
  }

  /**
   * Reserve N guaranteed-different tokens for independent judge calls.
   * Prioritizes tokens from DIFFERENT userIds to maximize bucket isolation.
   */
  reserveTokensForJudges(count: number): (TokenData | null)[] {
    if (!this.initialized) this.initUserIdGroups();

    const reserved: (TokenData | null)[] = [];
    const usedIndices = new Set<number>();

    // First pass: pick one token per unique userId (maximizes bucket diversity)
    for (const userId of this.userIdList) {
      if (reserved.length >= count) break;
      const tokenIndices = this.userIdGroups.get(userId) || [];
      for (const idx of tokenIndices) {
        if (reserved.length >= count) break;
        const t = this.tokens[idx];
        if (t && !usedIndices.has(idx) && (t._remainingDaily || 300) > 0) {
          reserved.push({ ...t });
          usedIndices.add(idx);
        }
      }
    }

    // Second pass: fill remaining with any unused tokens
    if (reserved.length < count) {
      for (let i = 1; i < this.tokens.length && reserved.length < count; i++) {
        const t = this.tokens[i];
        if (t && !usedIndices.has(i) && (t._remainingDaily || 300) > 0) {
          reserved.push({ ...t });
          usedIndices.add(i);
        }
      }
    }

    // If still not enough, clone some tokens with unique chatIds
    while (reserved.length < count) {
      const fallback = this.tokens[1];
      if (fallback) {
        reserved.push({
          ...fallback,
          chatId: `chat-isolated-${crypto.randomUUID()}`,
        });
      } else {
        reserved.push(null);
      }
    }

    return reserved;
  }

  /**
   * Generate a unique chat session ID to prevent context bleeding.
   */
  generateUniqueChatId(): string {
    return `chat-judge-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  // ─── Main Chat Method with Smart Retry ────────────────────────────

  /**
   * Main chat method with intelligent retry logic.
   *
   * Key differences from old version:
   * - Uses acquireSlot() for proactive bucket selection (no error-based switching)
   * - On 429, immediately tries next best bucket (no waiting if alternatives exist)
   * - Only waits when ALL buckets are exhausted
   * - Max 3 retries (reduced from 5 — each retry now uses a different bucket)
   */
  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const maxRetries = options.maxRetries || 3;
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature || 0.7;
    let lastError: Error | null = null;
    const exhaustedBuckets = new Set<string>(); // Track buckets we've tried and failed

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Acquire the best available slot
        const slot = await this.acquireSlot(MAX_WAIT_PER_SLOT, options.forceTokenIndex);
        const bucketKey = slot.bucketKey;

        // Skip if we've already exhausted this bucket (unless forced)
        if (exhaustedBuckets.has(bucketKey) && options.forceTokenIndex === undefined) {
          continue;
        }

        const result = await this.makeHTTPRequest(slot, messages, maxTokens, temperature, options);
        return result;

      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));

        if (lastError instanceof RateLimitError) {
          // Mark this bucket as exhausted
          exhaustedBuckets.add(lastError.bucketKey);
          this.bucketRemainingMap.set(lastError.bucketKey, 0);

          // Log budget status
          const totalBudget = this.getTotalBudget();
          const activeBuckets = this.getActiveBucketCount();
          console.warn(
            `[AI] Rate limited on ${lastError.bucketKey}. ` +
            `Total budget: ${totalBudget}, Active buckets: ${activeBuckets}/${this.userIdList.length * GATEWAY_HOSTS.length}. ` +
            `Attempt ${i + 1}/${maxRetries}`
          );

          // If there's still budget elsewhere, retry immediately (next loop picks best bucket)
          if (totalBudget > 0 || activeBuckets > 0) {
            // Don't wait — just try next best bucket immediately
            continue;
          }

          // ALL buckets truly exhausted — need to wait for reset
          const waitMs = this.calculateShortestReset(options.forceTokenIndex);
          const boundedWait = Math.min(waitMs, 8000); // Max 8s wait
          console.warn(`[AI] ALL buckets exhausted. Waiting ${Math.round(boundedWait / 1000)}s for reset...`);
          await new Promise(r => setTimeout(r, boundedWait));
          exhaustedBuckets.clear(); // Clear after waiting — buckets may have reset
          this.bucketRemainingMap.clear(); // Clear server tracking
          this.cleanStaleBucketEntries();
          continue;
        }

        if (lastError.message.includes('Timeout')) {
          if (i >= 1) throw lastError; // Don't retry timeouts more than once
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        if (lastError instanceof AuthError) {
          // Auth error — rotate and try different token
          continue;
        }

        // Other errors — brief backoff
        const delayMs = Math.min(1000 * (i + 1), 3000);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    throw lastError || new Error('All retries exhausted');
  }

  // ─── Status / Health ──────────────────────────────────────────────

  getTokenPoolStatus(): {
    total: number;
    active: number;
    tokens: {
      index: number;
      label: string;
      userId: string;
      remaining: number;
      status: 'active' | 'depleted' | 'auto';
    }[];
  } {
    return {
      total: this.tokens.length,
      active: this.tokens.filter(
        (t) => t && (t._remainingDaily || 300) > 0
      ).length,
      tokens: this.tokens.map((t, i) => ({
        index: i,
        label: t?.label || 'Auto-Config',
        userId: t?.userId?.substring(0, 8) || 'cfg',
        remaining: t?._remainingDaily || 300,
        status: t ? ((t._remainingDaily || 300) > 0 ? 'active' as const : 'depleted' as const) : 'auto' as const,
      })),
    };
  }

  getBucketStatus(): {
    totalBuckets: number;
    totalBudget: number;
    activeBuckets: number;
    buckets: { key: string; used: number; capacity: number; remaining: number; serverRemaining?: number }[];
  } {
    const buckets: { key: string; used: number; capacity: number; remaining: number; serverRemaining?: number }[] = [];
    for (const gw of GATEWAY_HOSTS) {
      for (const userId of this.userIdList) {
        const key = `${gw}:${userId}`;
        const times = this.requestTimes10minMap.get(key);
        const now = Date.now();
        const recent = times ? times.filter((t) => now - t < IP_RATE_WINDOW) : [];
        const remaining = this.getBucketRemaining(key);
        const serverRemaining = this.bucketRemainingMap.get(key);
        buckets.push({ key, used: recent.length, capacity: IP_RATE_LIMIT, remaining, serverRemaining });
      }
    }
    return {
      totalBuckets: this.userIdList.length * GATEWAY_HOSTS.length,
      totalBudget: this.getTotalBudget(),
      activeBuckets: this.getActiveBucketCount(),
      buckets,
    };
  }

  getCurrentGateway(): string {
    return GATEWAY_HOSTS[0];
  }

  getAllGateways(): string[] {
    return [...GATEWAY_HOSTS];
  }
}

// ─── Custom Error Types ─────────────────────────────────────────────

class RateLimitError extends Error {
  bucketKey: string;
  serverRemaining: number;

  constructor(message: string, bucketKey: string, serverRemaining: number) {
    super(message);
    this.name = 'RateLimitError';
    this.bucketKey = bucketKey;
    this.serverRemaining = serverRemaining;
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let _instance: DirectAIClient | null = null;

export function getAIClient(): DirectAIClient {
  if (!_instance) {
    _instance = new DirectAIClient();
  }
  return _instance;
}
