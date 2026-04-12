'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, RotateCcw, Zap, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface CampaignData {
  id: string
  dbId: string
  title: string
  creator: string
  xUsername: string
  rewardPool: string
  startDate: string
  endDate: string
  status: string
  description: string
  contractAddress: string
  campaignUrl: string
  // Pipeline fields
  knowledgeBase: string | null
  missionsJson: string | null
  rulesJson: string | null
  proposedAnglesJson: string | null
  style: string | null
  goal: string | null
}

interface CampaignEditDialogProps {
  campaign: CampaignData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function CampaignEditDialog({ campaign, open, onOpenChange, onSaved }: CampaignEditDialogProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    creator: '',
    xUsername: '',
    rewardPool: '',
    startDate: '',
    endDate: '',
    status: 'active',
    description: '',
    knowledgeBase: '',
    missionTitle: '',
    missionDirective: '',
    missionReward: '',
    style: '',
    goal: '',
    rulesText: '',
    anglesText: '',
  })

  // Populate form when campaign changes
  useEffect(() => {
    if (!campaign) return

    let parsedMissions: any[] = []
    try { parsedMissions = campaign.missionsJson ? JSON.parse(campaign.missionsJson) : [] } catch {}
    let parsedRules: string[] = []
    try { parsedRules = campaign.rulesJson ? JSON.parse(campaign.rulesJson) : [] } catch {}
    let parsedAngles: string[] = []
    try { parsedAngles = campaign.proposedAnglesJson ? JSON.parse(campaign.proposedAnglesJson) : [] } catch {}

    setForm({
      title: campaign.title || '',
      creator: campaign.creator || '',
      xUsername: campaign.xUsername || '',
      rewardPool: campaign.rewardPool || '',
      startDate: (campaign.startDate || '').substring(0, 16),
      endDate: (campaign.endDate || '').substring(0, 16),
      status: campaign.status || 'active',
      description: campaign.description || '',
      knowledgeBase: campaign.knowledgeBase || '',
      missionTitle: parsedMissions[0]?.title || '',
      missionDirective: parsedMissions[0]?.directive || '',
      missionReward: parsedMissions[0]?.reward || '',
      style: campaign.style || '',
      goal: campaign.goal || '',
      rulesText: parsedRules.join('\n'),
      anglesText: parsedAngles.join('\n'),
    })
  }, [campaign])

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!campaign?.dbId) return
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)
    try {
      // Build missions array
      const missions = form.missionTitle ? [{
        id: 0,
        title: form.missionTitle.trim(),
        directive: form.missionDirective.trim(),
        reward: form.missionReward.trim(),
        rules: form.rulesText.split('\n').map(r => r.trim()).filter(Boolean),
        proposed_angles: form.anglesText.split('\n').map(a => a.trim()).filter(Boolean),
        status: 'built',
        build_count: 0,
        content_count: 0,
      }] : []

      const body: any = {
        id: campaign.dbId,
        title: form.title.trim(),
        creator: form.creator.trim(),
        xUsername: form.xUsername.trim(),
        rewardPool: form.rewardPool.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status,
        description: form.description.trim(),
        knowledgeBase: form.knowledgeBase.trim() || null,
        missionsJson: missions.length > 0 ? JSON.stringify(missions) : null,
        rulesJson: form.rulesText.split('\n').map(r => r.trim()).filter(Boolean).length > 0
          ? JSON.stringify(form.rulesText.split('\n').map(r => r.trim()).filter(Boolean))
          : null,
        proposedAnglesJson: form.anglesText.split('\n').map(a => a.trim()).filter(Boolean).length > 0
          ? JSON.stringify(form.anglesText.split('\n').map(a => a.trim()).filter(Boolean))
          : null,
        style: form.style.trim() || null,
        goal: form.goal.trim() || null,
      }

      const res = await fetch('/api/rally/campaign-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      toast.success(`Campaign "${form.title}" updated successfully`)
      onOpenChange(false)
      onSaved?.()
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!campaign) return
    setForm({
      title: campaign.title || '',
      creator: campaign.creator || '',
      xUsername: campaign.xUsername || '',
      rewardPool: campaign.rewardPool || '',
      startDate: (campaign.startDate || '').substring(0, 16),
      endDate: (campaign.endDate || '').substring(0, 16),
      status: campaign.status || 'active',
      description: campaign.description || '',
      knowledgeBase: campaign.knowledgeBase || '',
      missionTitle: '',
      missionDirective: '',
      missionReward: '',
      style: campaign.style || '',
      goal: campaign.goal || '',
      rulesText: '',
      anglesText: '',
    })
  }

  // Calculate data completeness
  const totalFields = 12
  let filledFields = 0
  if (form.title) filledFields++
  if (form.creator) filledFields++
  if (form.rewardPool) filledFields++
  if (form.startDate || form.endDate) filledFields++
  if (form.description) filledFields++
  if (campaign?.contractAddress) filledFields++
  if (form.knowledgeBase) filledFields++
  if (form.rulesText.trim()) filledFields++
  if (form.anglesText.trim()) filledFields++
  if (form.missionTitle) filledFields++
  if (form.style) filledFields++
  if (form.goal) filledFields++
  const completenessPct = Math.round((filledFields / totalFields) * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Edit Campaign</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Update campaign details and pipeline data
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                {completenessPct}% complete
              </Badge>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset to original">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator className="opacity-50" />

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="edit-title" className="text-xs">Title *</Label>
                  <Input
                    id="edit-title"
                    value={form.title}
                    onChange={e => updateField('title', e.target.value)}
                    placeholder="Campaign title"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-creator" className="text-xs">Creator</Label>
                  <Input
                    id="edit-creator"
                    value={form.creator}
                    onChange={e => updateField('creator', e.target.value)}
                    placeholder="e.g. Rally"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-xusername" className="text-xs">X Username</Label>
                  <Input
                    id="edit-xusername"
                    value={form.xUsername}
                    onChange={e => updateField('xUsername', e.target.value)}
                    placeholder="@handle"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-reward" className="text-xs">Reward Pool</Label>
                  <Input
                    id="edit-reward"
                    value={form.rewardPool}
                    onChange={e => updateField('rewardPool', e.target.value)}
                    placeholder="e.g. 75,000 RLP"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status" className="text-xs">Status</Label>
                  <select
                    id="edit-status"
                    value={form.status}
                    onChange={e => updateField('status', e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="ended">Ended</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-start" className="text-xs">Start Date</Label>
                  <Input
                    id="edit-start"
                    type="datetime-local"
                    value={form.startDate}
                    onChange={e => updateField('startDate', e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end" className="text-xs">End Date</Label>
                  <Input
                    id="edit-end"
                    type="datetime-local"
                    value={form.endDate}
                    onChange={e => updateField('endDate', e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-desc" className="text-xs">Description</Label>
                  <Textarea
                    id="edit-desc"
                    value={form.description}
                    onChange={e => updateField('description', e.target.value)}
                    placeholder="Campaign description..."
                    rows={2}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Pipeline Data */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Pipeline Data</h4>
                <span className="text-[10px] text-muted-foreground">Used by the content generation pipeline</span>
              </div>
              <div className="space-y-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.02] p-3">
                {/* Knowledge Base */}
                <div>
                  <Label htmlFor="edit-kb" className="text-xs font-medium">Knowledge Base</Label>
                  <Textarea
                    id="edit-kb"
                    value={form.knowledgeBase}
                    onChange={e => updateField('knowledgeBase', e.target.value)}
                    placeholder="Context about the campaign, project, or protocol for AI content generation..."
                    rows={3}
                    className="mt-1 text-sm font-mono"
                  />
                </div>

                {/* Mission Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-mission-title" className="text-xs">Mission Title</Label>
                    <Input
                      id="edit-mission-title"
                      value={form.missionTitle}
                      onChange={e => updateField('missionTitle', e.target.value)}
                      placeholder="e.g. Creators are the New Distribution"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-mission-reward" className="text-xs">Mission Reward</Label>
                    <Input
                      id="edit-mission-reward"
                      value={form.missionReward}
                      onChange={e => updateField('missionReward', e.target.value)}
                      placeholder="e.g. 75,000 RLP shared pool"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-mission-directive" className="text-xs">Mission Directive</Label>
                  <Textarea
                    id="edit-mission-directive"
                    value={form.missionDirective}
                    onChange={e => updateField('missionDirective', e.target.value)}
                    placeholder="What the content should achieve..."
                    rows={2}
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-style" className="text-xs">Writing Style</Label>
                    <Input
                      id="edit-style"
                      value={form.style}
                      onChange={e => updateField('style', e.target.value)}
                      placeholder="e.g. Visionary and confident"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-goal" className="text-xs">Campaign Goal</Label>
                    <Input
                      id="edit-goal"
                      value={form.goal}
                      onChange={e => updateField('goal', e.target.value)}
                      placeholder="Primary objective..."
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-rules" className="text-xs">Rules (one per line)</Label>
                    <Textarea
                      id="edit-rules"
                      value={form.rulesText}
                      onChange={e => updateField('rulesText', e.target.value)}
                      placeholder={"Original content in any language\nMust mention @RallyOnChain\nNo em-dashes allowed"}
                      rows={3}
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-angles" className="text-xs">Proposed Angles (one per line)</Label>
                    <Textarea
                      id="edit-angles"
                      value={form.anglesText}
                      onChange={e => updateField('anglesText', e.target.value)}
                      placeholder={"Contrast transparency of on-chain model\nCreator-driven distribution as a moat\nQuality over follower count"}
                      rows={3}
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Completeness bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Data Completeness</span>
                <span className="text-[10px] font-mono font-medium">{completenessPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 score-bar-fill"
                  style={{
                    width: `${completenessPct}%`,
                    background: completenessPct === 100
                      ? 'linear-gradient(90deg, #10b981, #14b8a6, #06b6d4)'
                      : completenessPct >= 75
                        ? '#10b981'
                        : completenessPct >= 50
                          ? '#f59e0b'
                          : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator className="opacity-50" />

        <DialogFooter className="px-6 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 text-sm hover-glow-emerald"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
