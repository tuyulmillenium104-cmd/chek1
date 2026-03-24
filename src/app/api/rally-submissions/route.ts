import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://rally-staging.vercel.app/api/submissions', {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Rally API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return top 15 submissions with relevant data
    const submissions = data.slice(0, 15).map((sub: any) => ({
      id: sub.id,
      xUsername: sub.xUsername,
      atemporalPoints: sub.atemporalPoints,
      temporalPoints: sub.temporalPoints,
      analysis: sub.analysis,
      mission: sub.mission
    }));
    
    return NextResponse.json(submissions);
  } catch (error) {
    console.error('Failed to fetch Rally submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Rally data' },
      { status: 500 }
    );
  }
}
