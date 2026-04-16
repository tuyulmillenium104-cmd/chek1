/**
 * GET /api/rally/campaign/[address]?mission=<number>
 *
 * Fetches full campaign details from Rally.fun API by contract address.
 * Processes missions like the original workflow: auto-selects first active mission
 * and merges mission-specific fields with campaign-level fields.
 *
 * Returns ALL campaign info: description, rules, style, additionalInfo, knowledgeBase,
 * prohibitedItems, missions, adminNotice, endDate, category, rewards, contentType,
 * characterLimit, etc.
 */

import { NextRequest, NextResponse } from 'next/server';

const RALLY_API_BASE = 'https://app.rally.fun/api';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Simple in-memory cache keyed by address+mission (5 min TTL)
const _detailCache = new Map<
  string,
  { data: Record<string, unknown>; fetchedAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

interface MissionData {
  title?: string;
  goal?: string;
  description?: string;
  style?: string;
  rules?: string;
  knowledgeBase?: string;
  knowledge_base?: string;
  adminNotice?: string;
  characterLimit?: number | null;
  character_limit?: number | null;
  contentType?: string;
  content_type?: string;
  active?: boolean;
  prohibitedItems?: string;
  additionalInfo?: string;
  requirements?: string;
  [key: string]: unknown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    // Get optional mission number
    const missionParam = request.nextUrl.searchParams.get('mission');
    const missionNumber = missionParam ? parseInt(missionParam, 10) : null;

    // Cache key includes mission number
    const cacheKey = missionNumber !== null
      ? `${address}:m${missionNumber}`
      : address;

    // Check cache
    const now = Date.now();
    const cached = _detailCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        cached: true,
        campaign: cached.data,
      });
    }

    const url = `${RALLY_API_BASE}/campaigns/${address}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'Campaign not found' },
          { status: 404 }
        );
      }
      throw new Error(`Rally API returned HTTP ${response.status}`);
    }

    const raw = await response.json();

    // ── Process missions (same logic as the workflow) ──
    const missions: MissionData[] = Array.isArray(raw.missions)
      ? raw.missions.map((m: MissionData) => ({
          ...m,
          knowledgeBase: m.knowledgeBase || m.knowledge_base || '',
          characterLimit: m.characterLimit ?? m.character_limit ?? null,
          contentType: m.contentType || m.content_type || '',
        }))
      : [];

    let selectedMission: MissionData | null = null;
    let resolvedMissionNumber: number | null = null;

    if (missionNumber !== null && missions.length > 0) {
      // Specific mission requested
      const missionIndex = missionNumber - 1;
      if (missionIndex >= 0 && missionIndex < missions.length) {
        selectedMission = missions[missionIndex];
        resolvedMissionNumber = missionNumber;
      }
    } else if (missions.length > 0) {
      // Auto-select first active mission
      const activeMissions = missions
        .map((m, i) => ({ ...m, _index: i + 1 }))
        .filter((m) => m.active !== false);

      if (activeMissions.length > 0) {
        selectedMission = activeMissions[0];
        resolvedMissionNumber = activeMissions[0]._index;
      }
    }

    // ── Build normalized campaign (merge mission data with campaign data) ──
    const campaignUrl =
      raw.campaignUrl || raw.url || `https://app.rally.fun/campaign/${address}`;

    const normalized: Record<string, unknown> = {
      // Core identity
      title: raw.title || 'Untitled Campaign',
      intelligentContractAddress: raw.intelligentContractAddress || address,
      status: raw.status || 'active',
      campaignUrl,
      url: campaignUrl,

      // Description: prefer mission goal, then campaign goal, then campaign description
      description: selectedMission?.goal || raw.goal || raw.description || '',
      goal: raw.goal || raw.description || '',

      // Mission info
      missionTitle: selectedMission?.title || null,
      missionGoal: selectedMission?.goal || null,
      missionNumber: resolvedMissionNumber,
      missions: missions,

      // Style & Rules: mission-specific takes precedence
      style: selectedMission?.style || raw.style || '',
      rules: selectedMission?.rules || raw.rules || '',

      // Knowledge base: mission-specific takes precedence
      knowledgeBase:
        selectedMission?.knowledgeBase ||
        raw.knowledgeBase ||
        raw.knowledge_base ||
        '',

      // Requirements & additional info
      requirements:
        selectedMission?.requirements || raw.requirements || '',
      additionalInfo:
        selectedMission?.adminNotice ||
        selectedMission?.additionalInfo ||
        raw.adminNotice ||
        raw.additionalInfo ||
        '',

      // Prohibited items
      prohibitedItems:
        selectedMission?.prohibitedItems || raw.prohibitedItems || '',

      // Admin notice (keep separate)
      adminNotice: raw.adminNotice || '',

      // Content constraints
      contentType:
        selectedMission?.contentType || raw.contentType || raw.content_type || '',
      characterLimit:
        selectedMission?.characterLimit ??
        selectedMission?.character_limit ??
        raw.characterLimit ??
        raw.character_limit ??
        null,

      // Dates
      endDate: raw.endDate || null,
      startDate: raw.startDate || null,

      // Category
      category: raw.category || '',

      // Rewards
      campaignRewards: raw.campaignRewards || [],

      // Raw API response (for any fields we might have missed)
      _raw: raw,
    };

    // Cache the result
    _detailCache.set(cacheKey, {
      data: normalized,
      fetchedAt: Date.now(),
    });

    // Limit cache size
    if (_detailCache.size > MAX_CACHE_SIZE) {
      const oldestKey = _detailCache.keys().next().value;
      if (oldestKey) _detailCache.delete(oldestKey);
    }

    return NextResponse.json({
      success: true,
      cached: false,
      campaign: normalized,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Rally campaign detail error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch campaign: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
