/**
 * GET /api/rally/search?q=campaign_name
 *
 * Searches Rally.fun campaigns by name.
 * Strategy: Fetch all campaigns and filter client-side (Rally.fun API has no search endpoint).
 * Returns list of matching campaigns with ALL relevant fields for the card view.
 */

import { NextRequest, NextResponse } from 'next/server';

const RALLY_API_BASE = 'https://app.rally.fun/api';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface RallyCampaign {
  title: string;
  description: string;
  goal: string;
  intelligentContractAddress: string;
  campaignUrl: string;
  url: string;
  style: string;
  rules: string;
  requirements: string;
  knowledgeBase: string;
  knowledge_base: string;
  additionalInfo: string;
  missions: unknown[];
  status: string;
  endDate: string;
  startDate: string;
  category: string;
  contentType: string;
  content_type: string;
  characterLimit: number | null;
  character_limit: number | null;
  campaignRewards: unknown[];
  prohibitedItems: string;
  adminNotice: string;
  // other fields we don't need for search results
  [key: string]: unknown;
}

// Simple in-memory cache (5 min TTL)
let _cache: { data: RallyCampaign[]; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchAllCampaigns(limit = 200): Promise<RallyCampaign[]> {
  // Check cache first
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL) {
    return _cache.data;
  }

  const url = `${RALLY_API_BASE}/campaigns?limit=${limit}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Rally API returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const campaigns: RallyCampaign[] = result.campaigns || [];

    // Cache the result
    _cache = { data: campaigns, fetchedAt: Date.now() };

    return campaigns;
  } catch (error) {
    clearTimeout(timeoutId);

    // If cache exists but is stale, use stale data as fallback
    if (_cache) {
      console.warn('[Rally Search] Using stale cache due to fetch error');
      return _cache.data;
    }

    throw error;
  }
}

function searchCampaigns(
  campaigns: RallyCampaign[],
  query: string
): RallyCampaign[] {
  const searchLower = query.toLowerCase().trim();

  // 1. Exact match
  let matches = campaigns.filter(
    (c) => c.title?.toLowerCase() === searchLower
  );

  // 2. Partial match (title contains query or query contains title)
  if (matches.length === 0) {
    matches = campaigns.filter(
      (c) =>
        c.title?.toLowerCase().includes(searchLower) ||
        searchLower.includes(c.title?.toLowerCase())
    );
  }

  // 3. Word match (any word >2 chars matches)
  if (matches.length === 0) {
    const searchWords = searchLower.split(/\s+/);
    matches = campaigns.filter((c) => {
      const titleLower = c.title?.toLowerCase() || '';
      const descLower = (c.description || c.goal || '').toLowerCase();
      return searchWords.some(
        (word) =>
          word.length > 2 &&
          (titleLower.includes(word) || descLower.includes(word))
      );
    });
  }

  return matches;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing query parameter "q"' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Fetch all campaigns
    const allCampaigns = await fetchAllCampaigns();

    // Filter matching campaigns
    const matches = searchCampaigns(allCampaigns, query);

    // Return campaign cards with comprehensive data
    const results = matches.map((c) => ({
      title: c.title || 'Untitled Campaign',
      description:
        c.description || c.goal || 'No description available',
      address: c.intelligentContractAddress || '',
      url: c.campaignUrl || c.url || '',
      status: c.status || 'active',
      endDate: c.endDate || null,
      startDate: c.startDate || null,
      category: c.category || '',
      contentType: c.contentType || c.content_type || '',
      characterLimit: c.characterLimit || c.character_limit || null,
      // Rewards summary
      rewards: (c.campaignRewards || []).map((r: Record<string, unknown>) => ({
        totalAmount: r.totalAmount || 0,
        tokenSymbol: (r.token as Record<string, unknown>)?.symbol || '',
      })),
      // Count missions
      missionCount: Array.isArray(c.missions) ? c.missions.length : 0,
      activeMissionCount: Array.isArray(c.missions)
        ? c.missions.filter((m: Record<string, unknown>) => m.active !== false).length
        : 0,
    }));

    return NextResponse.json({
      success: true,
      query,
      totalResults: results.length,
      results,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API] Rally search error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to search campaigns: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}
