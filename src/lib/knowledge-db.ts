/**
 * Knowledge DB — Persistent file-based storage layer for Rally Brain v8
 *
 * Accumulates learn data across sessions. Stores submissions (append-only JSONL),
 * extracted patterns (JSON), and cron scheduling config (JSON) per campaign.
 *
 * All writes are atomic (temp file → rename). All operations survive server restarts.
 *
 * Backend-only module. No React, no Next.js imports.
 */

import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Base directory
// ---------------------------------------------------------------------------

const BASE_DIR = join(process.cwd(), "campaign_data", "knowledge");

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/** Category score keys (exact set used by the Rally scoring engine). */
export type CategoryKey =
  | "originality"
  | "alignment"
  | "accuracy"
  | "compliance"
  | "engagement"
  | "technical"
  | "reply_quality";

/** Numeric scores per category. */
export interface CategoryScores {
  originality: number;
  alignment: number;
  accuracy: number;
  compliance: number;
  engagement: number;
  technical: number;
  reply_quality: number;
}

/** Per-category qualitative analysis text. */
export interface CategoryAnalysis {
  originality: string;
  alignment: string;
  accuracy: string;
  compliance: string;
  engagement: string;
  technical: string;
  reply_quality: string;
}

/** A single learned submission record stored in submissions.jsonl. */
export interface SubmissionRecord {
  id: string;
  campaign_address: string;
  campaign_name: string;
  x_username: string;
  tweet_id: string;
  tweet_url: string;
  content_hash: string;
  total_score: number;
  max_score: number;
  content_quality_score: number;
  content_quality_pct: number;
  category_scores: CategoryScores;
  category_analysis: CategoryAnalysis;
  is_valid: boolean;
  learned_at: string; // ISO-8601
}

/** Aggregated stats for a campaign's submissions. */
export interface SubmissionStats {
  total: number;
  valid: number;
  invalid: number;
  avg_score: number;
  max_score_seen: number;
  min_score_seen: number;
  unique_users: number;
  first_learned_at: string | null;
  last_learned_at: string | null;
}

/** Input shape that callers pass when adding submissions (id generated if missing). */
export type SubmissionInput = Omit<SubmissionRecord, "id" | "learned_at"> & {
  id?: string;
  learned_at?: string;
};

// -- Pattern types ----------------------------------------------------------

export interface StrengthPattern {
  pattern: string;
  source: string;
  frequency_in_winners: number;
  frequency_in_losers: number;
  examples: string[];
  category: string;
  extracted_from_submission_count: number;
}

export interface WeaknessPattern {
  pattern: string;
  source: string;
  frequency_in_losers: number;
  frequency_in_winners: number;
  red_flag_phrases: string[];
  category: string;
  extracted_from_submission_count: number;
}

export interface BannedPhrase {
  phrase: string;
  reason: string;
  source_submissions: string[];
  category: string;
}

export interface ScoringBenchmark {
  winner_avg: number;
  loser_avg: number;
  target: number;
}

export interface ScoringBenchmarks {
  originality: ScoringBenchmark;
  alignment: ScoringBenchmark;
  accuracy: ScoringBenchmark;
  compliance: ScoringBenchmark;
  engagement: ScoringBenchmark;
  technical: ScoringBenchmark;
  reply_quality: ScoringBenchmark;
}

export interface TopExample {
  rank: number;
  x_username: string;
  score: number;
  tweet_url: string;
  key_strengths: string[];
}

export interface CategoryInsight {
  what_winners_do: string;
  what_losers_do: string;
  key_differentiator: string;
  rally_judge_expects: string;
}

export interface LearnSession {
  timestamp: string;
  new_submissions: number;
  patterns_extracted: number;
}

/** Full pattern data stored in patterns.json. */
export interface PatternData {
  campaign_address: string;
  campaign_name: string;
  total_submissions_analyzed: number;
  last_updated: string;
  strength_patterns: StrengthPattern[];
  weakness_patterns: WeaknessPattern[];
  banned_phrases: BannedPhrase[];
  scoring_benchmarks: ScoringBenchmarks;
  top_examples: TopExample[];
  category_insights: Record<string, CategoryInsight>;
  learn_sessions: LearnSession[];
}

// -- Cron types -------------------------------------------------------------

export interface CronCampaignConfig {
  campaign_address: string;
  campaign_name: string;
  enabled: boolean;
  interval_hours: number;
  last_run: string | null;
  next_run: string | null;
  total_runs: number;
  total_submissions_collected: number;
}

export interface CronConfig {
  campaigns: CronCampaignConfig[];
}

// -- Utility types ----------------------------------------------------------

export interface KnowledgeDBStats {
  campaign_address: string;
  campaign_name: string;
  data_dir: string;
  submission_count: number;
  has_patterns: boolean;
  has_cron_config: boolean;
  total_submissions_analyzed: number;
  last_pattern_update: string | null;
  learn_session_count: number;
  total_learn_runs: number;
  disk_usage_bytes: number;
}

export interface ExportData {
  campaign_address: string;
  campaign_name: string;
  exported_at: string;
  submissions: SubmissionRecord[];
  patterns: PatternData | null;
  cron_config: CronConfig | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Concurrent write lock keyed by campaign data directory. */
const writeLocks = new Map<string, Promise<void>>();

/**
 * Acquire a per-directory write lock. Returns a release function.
 * While the lock is held, subsequent callers queue up.
 */
async function acquireLock(key: string): Promise<() => void> {
  const existing = writeLocks.get(key);
  if (existing) {
    await existing;
  }
  let release!: () => void;
  const p = new Promise<void>((resolve) => {
    release = () => resolve();
  });
  writeLocks.set(key, p);
  return release;
}

/** Log with consistent prefix. */
function log(campaignAddr: string, msg: string): void {
  const ts = new Date().toISOString();
  console.log(`[KnowledgeDB][${ts}][${campaignAddr.slice(0, 10)}...] ${msg}`);
}

/**
 * Atomic write: write content to `<path>.tmp`, then rename over `<path>`.
 * Ensures the file is never in a half-written state.
 */
async function atomicWrite(
  filePath: string,
  content: string,
  campaignAddr: string,
): Promise<void> {
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  await fs.writeFile(tmpPath, content, "utf-8");
  await fs.rename(tmpPath, filePath);
  log(campaignAddr, `atomic write → ${filePath}`);
}

/**
 * Safely read a JSON file. Returns null if the file does not exist
 * or cannot be parsed.
 */
async function safeReadJson<T>(filePath: string, campaignAddr: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    log(campaignAddr, `warning: failed to read ${filePath}: ${err}`);
    return null;
  }
}

/**
 * Parse a single JSONL line. Returns null for blank / unparseable lines.
 */
function parseJsonlLine<T>(line: string): T | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/**
 * Sanitise a campaign address for use as a directory name.
 * Removes leading "0x", keeps hex chars only, truncates to safe length.
 */
function campaignDirName(address: string): string {
  const cleaned = address.replace(/^0x/i, "").replace(/[^a-fA-F0-9]/g, "");
  return cleaned || "unknown";
}

/** Ensure a directory exists, creating it recursively if needed. */
async function ensureDir(dirPath: string, campaignAddr: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
  log(campaignAddr, `ensured dir ${dirPath}`);
}

// ---------------------------------------------------------------------------
// KnowledgeDB class
// ---------------------------------------------------------------------------

export class KnowledgeDB {
  private readonly campaignAddress: string;
  private readonly campaignName: string;
  private readonly dataDir: string;

  constructor(campaignAddress: string, campaignName?: string) {
    this.campaignAddress = campaignAddress;
    this.campaignName = campaignName ?? campaignAddress;
    this.dataDir = join(BASE_DIR, campaignDirName(campaignAddress));
  }

  // -- Directory helpers -----------------------------------------------------

  /** Return the absolute path to this campaign's data directory. */
  getCampaignDataDir(): string {
    return this.dataDir;
  }

  private submissionsPath(): string {
    return join(this.dataDir, "submissions.jsonl");
  }

  private patternsPath(): string {
    return join(this.dataDir, "patterns.json");
  }

  private cronConfigPath(): string {
    return join(this.dataDir, "cron_config.json");
  }

  private metaPath(): string {
    return join(this.dataDir, "meta.json");
  }

  /** Ensure data directory + meta file exist. */
  private async initDir(): Promise<void> {
    await ensureDir(this.dataDir, this.campaignAddress);
    // Write meta if not present
    const metaExists = await safeReadJson<{ campaign_address: string; campaign_name: string }>(
      this.metaPath(),
      this.campaignAddress,
    );
    if (!metaExists) {
      await atomicWrite(
        this.metaPath(),
        JSON.stringify(
          { campaign_address: this.campaignAddress, campaign_name: this.campaignName },
          null,
          2,
        ),
        this.campaignAddress,
      );
    }
  }

  // =========================================================================
  // Submissions
  // =========================================================================

  /**
   * Append one or more submissions to the JSONL log.
   * Deduplicates by `content_hash`. Generates `id` and `learned_at` when absent.
   */
  async addSubmissions(
    inputs: SubmissionInput[],
  ): Promise<{ added: number; duplicates: number; total: number }> {
    if (inputs.length === 0) return { added: 0, duplicates: 0, total: 0 };

    const release = await acquireLock(this.dataDir);
    try {
      await this.initDir();

      // Load existing hashes for dedup
      const existing = await this.getAllSubmissions();
      const existingHashes = new Set(existing.map((s) => s.content_hash));

      const newLines: string[] = [];
      let added = 0;
      let duplicates = 0;

      for (const input of inputs) {
        if (existingHashes.has(input.content_hash)) {
          duplicates++;
          continue;
        }

        const record: SubmissionRecord = {
          id: input.id ?? randomUUID(),
          campaign_address: input.campaign_address,
          campaign_name: input.campaign_name,
          x_username: input.x_username,
          tweet_id: input.tweet_id,
          tweet_url: input.tweet_url,
          content_hash: input.content_hash,
          total_score: input.total_score,
          max_score: input.max_score,
          content_quality_score: input.content_quality_score,
          content_quality_pct: input.content_quality_pct,
          category_scores: input.category_scores,
          category_analysis: input.category_analysis,
          is_valid: input.is_valid,
          learned_at: input.learned_at ?? new Date().toISOString(),
        };

        newLines.push(JSON.stringify(record));
        existingHashes.add(input.content_hash);
        added++;
      }

      if (newLines.length > 0) {
        await fs.appendFile(this.submissionsPath(), newLines.join("\n") + "\n", "utf-8");
        log(this.campaignAddress, `appended ${added} submissions (${duplicates} duplicates skipped)`);
      }

      const total = existing.length + added;
      return { added, duplicates, total };
    } finally {
      release();
      writeLocks.delete(this.dataDir);
    }
  }

  /** Read all submissions from the JSONL log, most recent first. */
  async getAllSubmissions(): Promise<SubmissionRecord[]> {
    const filePath = this.submissionsPath();
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const lines = raw.split("\n");
      const records: SubmissionRecord[] = [];
      for (const line of lines) {
        const parsed = parseJsonlLine<SubmissionRecord>(line);
        if (parsed) records.push(parsed);
      }
      // Return in reverse chronological order (latest first)
      records.sort(
        (a, b) => new Date(b.learned_at).getTime() - new Date(a.learned_at).getTime(),
      );
      return records;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      log(this.campaignAddress, `error reading submissions: ${err}`);
      return [];
    }
  }

  /** Compute aggregate statistics over all stored submissions. */
  async getSubmissionStats(): Promise<SubmissionStats> {
    const submissions = await this.getAllSubmissions();
    if (submissions.length === 0) {
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        avg_score: 0,
        max_score_seen: 0,
        min_score_seen: 0,
        unique_users: 0,
        first_learned_at: null,
        last_learned_at: null,
      };
    }

    let valid = 0;
    let invalid = 0;
    let scoreSum = 0;
    let maxScore = -Infinity;
    let minScore = Infinity;
    const users = new Set<string>();
    let firstTs: string | null = null;
    let lastTs: string | null = null;

    for (const s of submissions) {
      if (s.is_valid) valid++;
      else invalid++;
      scoreSum += s.total_score;
      if (s.total_score > maxScore) maxScore = s.total_score;
      if (s.total_score < minScore) minScore = s.total_score;
      users.add(s.x_username);

      const ts = s.learned_at;
      if (!firstTs || ts < firstTs) firstTs = ts;
      if (!lastTs || ts > lastTs) lastTs = ts;
    }

    // If all submissions have the same score, min === max is fine
    if (maxScore === -Infinity) maxScore = 0;
    if (minScore === Infinity) minScore = 0;

    return {
      total: submissions.length,
      valid,
      invalid,
      avg_score: Math.round((scoreSum / submissions.length) * 100) / 100,
      max_score_seen: maxScore,
      min_score_seen: minScore,
      unique_users: users.size,
      first_learned_at: firstTs,
      last_learned_at: lastTs,
    };
  }

  // =========================================================================
  // Patterns
  // =========================================================================

  /** Persist the full pattern data object for this campaign. */
  async updatePatterns(patterns: PatternData): Promise<void> {
    const release = await acquireLock(this.dataDir);
    try {
      await this.initDir();
      const content = JSON.stringify(patterns, null, 2);
      await atomicWrite(this.patternsPath(), content, this.campaignAddress);
    } finally {
      release();
      writeLocks.delete(this.dataDir);
    }
  }

  /** Read the current pattern data, or null if none exists yet. */
  async getPatterns(): Promise<PatternData | null> {
    return safeReadJson<PatternData>(this.patternsPath(), this.campaignAddress);
  }

  // =========================================================================
  // Cron config
  // =========================================================================

  /** Read the cron scheduling config, or null. */
  async getCronConfig(): Promise<CronConfig | null> {
    return safeReadJson<CronConfig>(this.cronConfigPath(), this.campaignAddress);
  }

  /** Write the full cron scheduling config. */
  async updateCronConfig(config: CronConfig): Promise<void> {
    const release = await acquireLock(this.dataDir);
    try {
      await this.initDir();
      const content = JSON.stringify(config, null, 2);
      await atomicWrite(this.cronConfigPath(), content, this.campaignAddress);
    } finally {
      release();
      writeLocks.delete(this.dataDir);
    }
  }

  /**
   * Return all enabled campaigns whose `next_run` is at or before now.
   * Useful for a cron runner to pick up work.
   */
  async getCampaignsDue(): Promise<CronCampaignConfig[]> {
    const config = await this.getCronConfig();
    if (!config) return [];

    const now = Date.now();
    return config.campaigns.filter(
      (c) => c.enabled && c.next_run !== null && new Date(c.next_run).getTime() <= now,
    );
  }

  // =========================================================================
  // Utility
  // =========================================================================

  /** Comprehensive stats about this campaign's knowledge data. */
  async getStats(): Promise<KnowledgeDBStats> {
    await this.initDir();

    const submissions = await this.getAllSubmissions();
    const patterns = await this.getPatterns();
    const cronConfig = await this.getCronConfig();

    // Calculate disk usage
    let diskUsageBytes = 0;
    try {
      const stat = await fs.stat(this.dataDir);
      diskUsageBytes += stat.size;
    } catch {
      // directory may report 0, that's fine
    }

    for (const fileName of ["submissions.jsonl", "patterns.json", "cron_config.json", "meta.json"]) {
      try {
        const fStat = await fs.stat(join(this.dataDir, fileName));
        diskUsageBytes += fStat.size;
      } catch {
        // file may not exist yet
      }
    }

    return {
      campaign_address: this.campaignAddress,
      campaign_name: this.campaignName,
      data_dir: this.dataDir,
      submission_count: submissions.length,
      has_patterns: patterns !== null,
      has_cron_config: cronConfig !== null,
      total_submissions_analyzed: patterns?.total_submissions_analyzed ?? 0,
      last_pattern_update: patterns?.last_updated ?? null,
      learn_session_count: patterns?.learn_sessions?.length ?? 0,
      total_learn_runs: cronConfig?.campaigns?.reduce((sum, c) => sum + c.total_runs, 0) ?? 0,
      disk_usage_bytes: diskUsageBytes,
    };
  }

  /** Export everything for this campaign as a single object. */
  async exportAll(): Promise<ExportData> {
    const submissions = await this.getAllSubmissions();
    const patterns = await this.getPatterns();
    const cronConfig = await this.getCronConfig();

    return {
      campaign_address: this.campaignAddress,
      campaign_name: this.campaignName,
      exported_at: new Date().toISOString(),
      submissions,
      patterns,
      cron_config: cronConfig,
    };
  }

  /** Delete all knowledge data for this campaign. Use with caution. */
  async clearAll(): Promise<void> {
    const release = await acquireLock(this.dataDir);
    try {
      try {
        await fs.rm(this.dataDir, { recursive: true, force: true });
        log(this.campaignAddress, `cleared all data in ${this.dataDir}`);
      } catch (err) {
        log(this.campaignAddress, `clear error: ${err}`);
      }
    } finally {
      release();
      writeLocks.delete(this.dataDir);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/** Instance cache keyed by campaign address. */
const instanceCache = new Map<string, KnowledgeDB>();

/**
 * Get (or create) a KnowledgeDB instance for a campaign.
 * Instances are cached so repeated calls return the same object.
 */
export function getKnowledgeDB(campaignAddress: string, campaignName?: string): KnowledgeDB {
  const cached = instanceCache.get(campaignAddress);
  if (cached) return cached;

  const instance = new KnowledgeDB(campaignAddress, campaignName);
  instanceCache.set(campaignAddress, instance);
  return instance;
}

/**
 * List all campaigns that have knowledge data on disk.
 * Scans the base knowledge directory for subdirectories and reads each meta.json.
 */
export async function listAllCampaigns(): Promise<
  { campaign_address: string; campaign_name?: string; submission_count: number }[]
> {
  // Ensure base dir exists
  try {
    await fs.mkdir(BASE_DIR, { recursive: true });
  } catch {
    // ignore
  }

  let entries: Dirent[];
  try {
    entries = await fs.readdir(BASE_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const campaigns: { campaign_address: string; campaign_name?: string; submission_count: number }[] =
    [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirPath = join(BASE_DIR, entry.name);

    // Read meta to recover campaign address + name
    const meta = await safeReadJson<{ campaign_address: string; campaign_name: string }>(
      join(dirPath, "meta.json"),
      entry.name,
    );

    // Count submissions in JSONL
    let submissionCount = 0;
    try {
      const raw = await fs.readFile(join(dirPath, "submissions.jsonl"), "utf-8");
      const lines = raw.split("\n");
      for (const line of lines) {
        if (parseJsonlLine(line)) submissionCount++;
      }
    } catch {
      // file may not exist
    }

    campaigns.push({
      campaign_address: meta?.campaign_address ?? `0x${entry.name}`,
      campaign_name: meta?.campaign_name,
      submission_count: submissionCount,
    });
  }

  return campaigns;
}

/**
 * Scan ALL campaigns' cron configs and return those whose `next_run` is due.
 * Useful for a global cron runner that manages multiple campaigns.
 */
export async function getCampaignsNeedingLearn(): Promise<CronCampaignConfig[]> {
  const allCampaigns = await listAllCampaigns();
  const dueCampaigns: CronCampaignConfig[] = [];
  const now = Date.now();

  for (const campaign of allCampaigns) {
    const db = getKnowledgeDB(campaign.campaign_address, campaign.campaign_name);
    const due = await db.getCampaignsDue();
    dueCampaigns.push(...due);
  }

  // Sort by next_run ascending (most overdue first)
  dueCampaigns.sort((a, b) => {
    const aTime = a.next_run ? new Date(a.next_run).getTime() : Infinity;
    const bTime = b.next_run ? new Date(b.next_run).getTime() : Infinity;
    return aTime - bTime;
  });

  return dueCampaigns;
}
