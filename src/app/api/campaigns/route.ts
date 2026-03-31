import { NextRequest, NextResponse } from 'next/server';

const RALLY_API = 'https://app.rally.fun/api';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

// GET /api/campaigns?q=keyword&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50);

    const res = await fetch(`${RALLY_API}/campaigns?limit=50`, { headers: HEADERS });
    if (!res.ok) {
      return NextResponse.json({ error: `Rally API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    let campaigns = data.campaigns || data || [];

    // Helper to extract creator display name
    const getCreatorName = (c: any) => {
      const dc = c.displayCreator;
      if (!dc) return 'Unknown';
      if (typeof dc === 'string') return dc;
      return dc.displayName || dc.name || dc.xUsername || 'Unknown';
    };

    // Filter by keyword if provided
    if (query) {
      campaigns = campaigns.filter((c: any) =>
        (c.title || '').toLowerCase().includes(query) ||
        (c.goal || '').toLowerCase().includes(query) ||
        getCreatorName(c).toLowerCase().includes(query)
      );
    }

    // Map to simplified format
    const mapped = campaigns.slice(0, limit).map((c: any) => ({
      address: c.intelligentContractAddress || c.address || '',
      title: c.title || 'Untitled',
      goal: (c.goal || '').slice(0, 150),
      missionCount: (c.missions || []).length,
      displayCreator: getCreatorName(c),
      startDate: c.startDate || null,
      endDate: c.endDate || null,
      status: c.status || 'active',
    }));

    return NextResponse.json({ success: true, campaigns: mapped, total: mapped.length });
  } catch (error: any) {
    console.error('[CAMPAIGNS ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
