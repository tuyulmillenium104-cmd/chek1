import type { RallyCampaign, RallySubmission } from './types';

const RALLY_API_BASE = 'https://app.rally.fun/api';

async function fetchRally<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${RALLY_API_BASE}${endpoint}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 300 }
  });
  if (!res.ok) {
    throw new Error(`Rally API error: ${res.status} ${res.statusText} for ${endpoint}`);
  }
  return res.json();
}

export async function fetchCampaigns(page = 1, limit = 20): Promise<{
  campaigns: RallyCampaign[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}> {
  return fetchRally(`/campaigns?page=${page}&limit=${limit}`);
}

export async function fetchCampaign(address: string): Promise<RallyCampaign> {
  return fetchRally(`/campaigns/${address}`);
}

export async function fetchSubmissions(campaignAddress: string): Promise<RallySubmission[]> {
  return fetchRally(`/submissions?campaignAddress=${campaignAddress}`);
}
