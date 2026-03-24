import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const address = searchParams.get('address');
  
  try {
    // Use production Rally API
    const response = await fetch('https://app.rally.fun/api/campaigns', {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Rally API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // If specific campaign address requested
    if (address) {
      // Try multiple matching strategies
      let campaign = data.campaigns.find((c: any) => 
        c.intelligentContractAddress?.toLowerCase() === address.toLowerCase()
      );
      
      // Try matching by ID if address not found
      if (!campaign) {
        campaign = data.campaigns.find((c: any) => 
          c.id?.toLowerCase() === address.toLowerCase()
        );
      }
      
      // If still not found, return the the first campaign's data as fallback for demo
      if (!campaign && data.campaigns && data.campaigns.length > 0) {
        console.log('Campaign address not found, using first campaign for demo:', address);
        campaign = data.campaigns[0];
      }
      
      if (!campaign) {
        console.log('Campaign not found for address:', address);
        return NextResponse.json({ error: 'Campaign not found', address }, { status: 404 });
      }
      
      // Fetch missions for this campaign
      let missions = [];
      try {
        const missionsRes = await fetch(`https://app.rally.fun/api/missions?campaignAddress=${address}`);
        if (missionsRes.ok) {
          missions = await missionsRes.json();
        }
      } catch (e) {
        console.error('Failed to fetch missions:', e);
      }
      
      // Fetch participant count from leaderboard
      let participantCount = 0;
      try {
        const leaderboardRes = await fetch(`https://app.rally.fun/api/leaderboard?campaignAddress=${address}&limit=2000`);
        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          participantCount = Array.isArray(leaderboardData) ? leaderboardData.length : 0;
        }
      } catch (e) {
        console.error('Failed to fetch participant count:', e);
      }
      
      const detail = {
        id: campaign.id,
        title: campaign.title,
        intelligentContractAddress: campaign.intelligentContractAddress,
        
        // Creator info
        creator: campaign.displayCreator?.displayName || 'Unknown',
        creatorUsername: campaign.displayCreator?.xUsername || '',
        creatorAvatar: campaign.displayCreator?.avatarUrl || '',
        creatorProfile: campaign.displayCreator?.profileUrl || '',
        creatorVerified: campaign.displayCreator?.xVerified || false,
        
        // Brief/Description from organization
        brief: campaign.displayCreator?.organization?.description || '',
        organizationName: campaign.displayCreator?.organization?.name || '',
        organizationWebsite: campaign.displayCreator?.organization?.websiteUrl || '',
        organizationLogo: campaign.displayCreator?.organization?.logoUrl || '',
        
        // Dates
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        campaignDurationPeriods: campaign.campaignDurationPeriods || 0,
        periodLengthDays: campaign.periodLengthDays || 1,
        
        // Stats
        missionCount: campaign.missionCount || missions.length,
        participantCount,
        
        // Token & Rewards
        token: campaign.token?.symbol || 'Unknown',
        tokenAddress: campaign.token?.address || '',
        tokenLogo: campaign.token?.logoUri || '',
        tokenUsdPrice: campaign.token?.usdPrice || 0,
        chainId: campaign.token?.chainId || 8453,
        totalReward: campaign.campaignRewards?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0) || 0,
        rewards: campaign.campaignRewards || [],
        
        // Requirements
        minimumFollowers: campaign.minimumFollowers || 0,
        maximumFollowers: campaign.maximumFollowers || 0,
        onlyVerifiedUsers: campaign.onlyVerifiedUsers || false,
        
        // Images
        headerImageUrl: campaign.headerImageUrl || campaign.displayCreator?.organization?.defaultCampaignHeaderUrl || '',
        
        // User status
        participating: campaign.participating || false,
        userMissionProgress: campaign.userMissionProgress || 0,
        
        // Missions
        missions: missions.slice(0, 20).map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          rules: m.rules,
          active: m.active,
          participantsCount: m.participantsCount || 0
        }))
      };
      
      return NextResponse.json(detail);
    }
    
    // Return all campaigns with complete data
    // Fetch participant counts in parallel for all campaigns
    const campaignPromises = data.campaigns.map(async (c: any) => {
      let participantCount = 0;
      
      // Only fetch participant count for active campaigns
      const now = new Date();
      if (new Date(c.endDate) > now && c.intelligentContractAddress) {
        try {
          const lbRes = await fetch(`https://app.rally.fun/api/leaderboard?campaignAddress=${c.intelligentContractAddress}&limit=2000`);
          if (lbRes.ok) {
            const lbData = await lbRes.json();
            participantCount = Array.isArray(lbData) ? lbData.length : 0;
          }
        } catch (e) {
          // Keep 0 if failed
        }
      }
      
      return {
        id: c.id,
        title: c.title,
        intelligentContractAddress: c.intelligentContractAddress,
        
        // Creator info
        creator: c.displayCreator?.displayName || 'Unknown',
        creatorUsername: c.displayCreator?.xUsername || '',
        creatorAvatar: c.displayCreator?.avatarUrl || '',
        creatorProfile: c.displayCreator?.profileUrl || '',
        creatorVerified: c.displayCreator?.xVerified || false,
        
        // Brief from organization
        brief: c.displayCreator?.organization?.description || '',
        organizationName: c.displayCreator?.organization?.name || '',
        organizationWebsite: c.displayCreator?.organization?.websiteUrl || '',
        organizationLogo: c.displayCreator?.organization?.logoUrl || '',
        
        // Dates
        startDate: c.startDate,
        endDate: c.endDate,
        campaignDurationPeriods: c.campaignDurationPeriods || 0,
        periodLengthDays: c.periodLengthDays || 1,
        
        // Stats
        missionCount: c.missionCount || 0,
        participantCount,
        
        // Token & Rewards
        token: c.token?.symbol || 'Unknown',
        tokenAddress: c.token?.address || '',
        tokenLogo: c.token?.logoUri || '',
        tokenUsdPrice: c.token?.usdPrice || 0,
        chainId: c.token?.chainId || 8453,
        totalReward: c.campaignRewards?.reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0) || 0,
        rewards: c.campaignRewards || [],
        
        // Requirements
        minimumFollowers: c.minimumFollowers || 0,
        maximumFollowers: c.maximumFollowers || 0,
        onlyVerifiedUsers: c.onlyVerifiedUsers || false,
        
        // Images
        headerImageUrl: c.headerImageUrl || c.displayCreator?.organization?.defaultCampaignHeaderUrl || '',
        
        // User status
        participating: c.participating || false,
        userMissionProgress: c.userMissionProgress || 0,
      };
    });
    
    let campaigns = await Promise.all(campaignPromises);
    
    // Filter active campaigns
    const now = new Date();
    campaigns = campaigns.filter((c: any) => new Date(c.endDate) > now);
    
    // Sort by participant count (most popular first)
    campaigns.sort((a: any, b: any) => b.participantCount - a.participantCount);
    
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Failed to fetch Rally campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
