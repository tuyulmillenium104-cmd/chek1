'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Brain, Sparkles, Gavel, Zap } from 'lucide-react';
import { CampaignBrowser } from '@/components/campaign-browser';
import { LearnPanel } from '@/components/learn-panel';
import { GeneratePanel } from '@/components/generate-panel';
import { JudgePanel } from '@/components/judge-panel';
import { KnowledgeStats } from '@/components/knowledge-stats';
import type { RallyCampaign, PipelineResult } from '@/lib/types';

export default function Home() {
  const [selectedCampaign, setSelectedCampaign] = useState<RallyCampaign | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  const handleSelectCampaign = (campaign: RallyCampaign) => {
    setSelectedCampaign(campaign);
    setPipelineResult(null);
  };

  const handleClearCampaign = () => {
    setSelectedCampaign(null);
    setPipelineResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {/* Header */}
      <header className="bg-zinc-900 text-white border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">Rally Brain v8</h1>
            </div>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700 hidden sm:inline-flex">
              AI Content Engine
            </Badge>
          </div>

          {selectedCampaign && (
            <div className="flex items-center gap-2 max-w-[60vw]">
              <Badge variant="outline" className="bg-zinc-800 border-zinc-600 text-zinc-200 truncate max-w-[200px] sm:max-w-xs">
                {selectedCampaign.title}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCampaign}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-7 w-7 p-0"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="campaigns" className="gap-1.5">
              <Zap className="size-3.5" />
              <span className="hidden sm:inline">Campaigns</span>
            </TabsTrigger>
            <TabsTrigger value="learn" className="gap-1.5" disabled={!selectedCampaign}>
              <Brain className="size-3.5" />
              <span className="hidden sm:inline">Learn</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-1.5" disabled={!selectedCampaign}>
              <Sparkles className="size-3.5" />
              <span className="hidden sm:inline">Generate & Judge</span>
            </TabsTrigger>
            <TabsTrigger value="judge" className="gap-1.5" disabled={!selectedCampaign}>
              <Gavel className="size-3.5" />
              <span className="hidden sm:inline">Judge</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Campaigns */}
          <TabsContent value="campaigns">
            <CampaignBrowser
              onSelectCampaign={handleSelectCampaign}
              selectedAddress={selectedCampaign?.intelligentContractAddress || null}
            />
          </TabsContent>

          {/* Tab 2: Learn */}
          <TabsContent value="learn">
            {selectedCampaign ? (
              <div className="space-y-4">
                <LearnPanel campaignAddress={selectedCampaign.intelligentContractAddress} />
                <KnowledgeStats campaignAddress={selectedCampaign.intelligentContractAddress} />
              </div>
            ) : (
              <EmptyState
                icon={<Brain className="size-10" />}
                title="Select a Campaign"
                description="Go to the Campaigns tab and select a campaign to start learning from its submissions."
                onAction={() => setActiveTab('campaigns')}
                actionLabel="Browse Campaigns"
              />
            )}
          </TabsContent>

          {/* Tab 3: Generate & Judge */}
          <TabsContent value="generate">
            {selectedCampaign ? (
              <div className="space-y-4">
                <GeneratePanel
                  campaign={selectedCampaign}
                  onResult={setPipelineResult}
                />
                {selectedCampaign && (
                  <KnowledgeStats campaignAddress={selectedCampaign.intelligentContractAddress} />
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Sparkles className="size-10" />}
                title="Select a Campaign"
                description="Go to the Campaigns tab and select a campaign to generate content for."
                onAction={() => setActiveTab('campaigns')}
                actionLabel="Browse Campaigns"
              />
            )}
          </TabsContent>

          {/* Tab 4: Judge */}
          <TabsContent value="judge">
            {selectedCampaign ? (
              <JudgePanel campaignAddress={selectedCampaign.intelligentContractAddress} />
            ) : (
              <EmptyState
                icon={<Gavel className="size-10" />}
                title="Select a Campaign"
                description="Go to the Campaigns tab and select a campaign to judge content against."
                onAction={() => setActiveTab('campaigns')}
                actionLabel="Browse Campaigns"
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Rally Brain v8 — AI Content Engine for Rally.fun</span>
          <span>3-Session Pipeline: Learner → Generator → Judge</span>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  onAction,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-muted-foreground/30 mx-auto mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      <Button variant="outline" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
