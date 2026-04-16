'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ExternalLink, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RallyCampaign } from '@/lib/types';

interface CampaignBrowserProps {
  onSelectCampaign: (campaign: RallyCampaign) => void;
  selectedAddress: string | null;
}

export function CampaignBrowser({ onSelectCampaign, selectedAddress }: CampaignBrowserProps) {
  const [campaigns, setCampaigns] = useState<RallyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCampaigns(page);
  }, [page]);

  const fetchCampaigns = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rally/campaigns?page=${p}&limit=12`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCampaigns(data.campaigns || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filtered = campaigns.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.displayCreator?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.token?.symbol?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns by name, creator, or token..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="gap-0">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No campaigns found</p>
          <p className="text-sm mt-1">Try adjusting your search or loading a different page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((campaign) => {
            const isSelected = selectedAddress === campaign.intelligentContractAddress;
            const totalReward = campaign.campaignRewards?.reduce((sum, r) => sum + r.totalAmount, 0) || 0;
            const rewardToken = campaign.campaignRewards?.[0]?.token?.symbol || campaign.token?.symbol || '';
            const isActive = new Date(campaign.endDate) > new Date();

            return (
              <Card
                key={campaign.id}
                className={`cursor-pointer transition-all hover:shadow-md gap-0 ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-emerald-500/50'
                    : 'hover:border-zinc-400'
                }`}
                onClick={() => onSelectCampaign(campaign)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug line-clamp-2">{campaign.title}</CardTitle>
                    <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-emerald-600 text-white' : ''}>
                      {isActive ? 'Active' : 'Ended'}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    @{campaign.displayCreator?.xUsername || 'unknown'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {campaign.goal && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{campaign.goal}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {totalReward > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{totalReward.toLocaleString()}</span> {rewardToken}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDate(campaign.startDate)}
                    </span>
                    {campaign.lastSyncedSubmissionCount != null && (
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {campaign.lastSyncedSubmissionCount} subs
                      </span>
                    )}
                  </div>

                  {campaign.missions?.filter(m => m.active).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {campaign.missions.filter(m => m.active).length} active mission{campaign.missions.filter(m => m.active).length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {isSelected && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <ExternalLink className="size-3" />
                      Selected — switch tabs to Learn or Generate
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
