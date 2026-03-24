import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const campaignAddress = searchParams.get('campaignAddress');
  
  try {
    const response = await fetch('https://rally-staging.vercel.app/api/missions', {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Rally API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter by campaign address if provided
    let missions = data;
    if (campaignAddress) {
      missions = data.filter((m: any) => 
        m.campaignAddress?.toLowerCase() === campaignAddress.toLowerCase()
      );
    }
    
    // Transform to simpler format
    const result = missions.slice(0, 20).map((m: any) => ({
      id: m.id,
      campaignAddress: m.campaignAddress,
      title: m.title,
      description: m.description,
      rules: m.rules,
      active: m.active,
      participantsCount: m.participantsCount || 0
    }));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch missions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch missions' },
      { status: 500 }
    );
  }
}
