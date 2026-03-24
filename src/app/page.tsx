'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, TrendingUp, Info,
  Star, Zap, Target, Award, Loader2, Sparkles, FileText,
  Trophy, BarChart3, RefreshCw, Flag, BookOpen,
  FolderKanban, Users, Calendar, Clock, ChevronDown, ChevronUp,
  Check, Send, Medal, Crown, Coins, ExternalLink, Globe,
  Twitter, Verified, AlertCircle, DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

// Types matching Rally API
interface RallyCampaign {
  id: string
  title: string
  intelligentContractAddress: string
  creator: string
  creatorUsername: string
  creatorAvatar: string
  creatorProfile: string
  creatorVerified: boolean
  brief: string
  organizationName: string
  organizationWebsite: string
  organizationLogo: string
  startDate: string
  endDate: string
  campaignDurationPeriods: number
  periodLengthDays: number
  missionCount: number
  participantCount: number
  token: string
  tokenAddress: string
  tokenLogo: string
  tokenUsdPrice: number
  chainId: number
  totalReward: number
  rewards: any[]
  minimumFollowers: number
  maximumFollowers: number
  onlyVerifiedUsers: boolean
  headerImageUrl: string
  participating: boolean
  userMissionProgress: number
  missions?: RallyMission[]
}

interface RallyMission {
  id: string
  title: string
  description: string
  rules: string
  active: boolean
  participantsCount?: number
}

interface LeaderboardEntry {
  rank: number
  username: string
  displayName?: string
  avatar?: string
  verified?: boolean
  totalPoints: number
  topPercent: number
  followersCount?: number
  totalSubmissions?: number
}

// Grade configuration matching Rally's scoring
const GRADE_CONFIG: { min: number; grade: string; color: string; label: string }[] = [
  { min: 8.0, grade: 'S+', color: 'text-yellow-400', label: 'Exceptional' },
  { min: 7.5, grade: 'S', color: 'text-amber-400', label: 'Outstanding' },
  { min: 7.0, grade: 'A+', color: 'text-green-400', label: 'Excellent' },
  { min: 6.5, grade: 'A', color: 'text-emerald-400', label: 'Very Good' },
  { min: 6.0, grade: 'B+', color: 'text-teal-400', label: 'Good' },
  { min: 5.5, grade: 'B', color: 'text-cyan-400', label: 'Above Average' },
  { min: 5.0, grade: 'C+', color: 'text-blue-400', label: 'Average' },
  { min: 4.0, grade: 'C', color: 'text-gray-400', label: 'Below Average' },
  { min: 0, grade: 'F', color: 'text-red-400', label: 'Fail' }
]

const getGrade = (points: number) => {
  return GRADE_CONFIG.find(g => points >= g.min) || GRADE_CONFIG[GRADE_CONFIG.length - 1]
}

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Analysis Card Component
const AnalysisCard = ({ 
  title, score, maxScore, analysis, icon: Icon 
}: { 
  title: string
  score: number
  maxScore: number
  analysis: string
  icon: React.ElementType
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const percentage = (score / maxScore) * 100
  const scoreColor = percentage >= 80 ? 'text-green-400' : percentage >= 50 ? 'text-yellow-400' : 'text-red-400'
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${scoreColor}`} />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${scoreColor} bg-gray-700/50 text-xs`}>
            {score.toFixed(1)}/{maxScore}
          </Badge>
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">{analysis}</p>
        </div>
      )}
    </div>
  )
}

export default function RallyScoreAnalyzer() {
  const [activeTab, setActiveTab] = useState('campaigns')
  
  // Campaigns
  const [campaigns, setCampaigns] = useState<RallyCampaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<RallyCampaign | null>(null)
  
  // Missions
  const [missions, setMissions] = useState<RallyMission[]>([])
  const [selectedMission, setSelectedMission] = useState<RallyMission | null>(null)
  
  // Content & Analysis
  const [content, setContent] = useState('')
  const [campaignContext, setCampaignContext] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  
  // Engagement projection
  const [engagement, setEngagement] = useState({
    likes: 50, replies: 5, retweets: 3, impressions: 1000, followersOfRepliers: 5000
  })
  
  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  
  // Fetch Campaigns
  const fetchCampaigns = useCallback(async () => {
    setIsLoadingCampaigns(true)
    try {
      const response = await fetch('/api/rally-campaigns')
      if (!response.ok) throw new Error('Failed to fetch campaigns')
      const data = await response.json()
      setCampaigns(data)
      toast.success(`${data.length} campaigns loaded from Rally.fun!`)
    } catch (error) {
      console.error('Fetch campaigns error:', error)
      toast.error('Failed to fetch campaigns from Rally')
    } finally {
      setIsLoadingCampaigns(false)
    }
  }, [])
  
  // Select Campaign
  const selectCampaign = useCallback(async (campaign: RallyCampaign) => {
    setSelectedCampaign(campaign)
    setAnalysisResult(null)
    
    if (campaign.intelligentContractAddress) {
      try {
        const response = await fetch(`/api/rally-campaigns?address=${campaign.intelligentContractAddress}`)
        if (response.ok) {
          const fullCampaign = await response.json()
          setSelectedCampaign(fullCampaign)
          
          const missionList = fullCampaign.missions || []
          setMissions(missionList)
          
          if (missionList.length > 0) {
            setSelectedMission(missionList[0])
            setCampaignContext([
              fullCampaign.brief ? `Brief: ${fullCampaign.brief}` : '',
              missionList[0].description ? `Mission: ${missionList[0].description}` : '',
              missionList[0].rules ? `Rules: ${missionList[0].rules}` : ''
            ].filter(Boolean).join('\n\n'))
          }
          toast.success('Campaign loaded!')
        }
      } catch (error) {
        console.error('Error loading campaign:', error)
      }
    }
    setActiveTab('analyze')
  }, [])
  
  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true)
    try {
      const campaignAddress = selectedCampaign?.intelligentContractAddress || ''
      const url = campaignAddress 
        ? `/api/rally-leaderboard?campaignAddress=${campaignAddress}&limit=100`
        : '/api/rally-leaderboard?limit=100'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
      setTotalParticipants(data.total || 0)
      toast.success(`Leaderboard loaded! (${data.total || 0} participants)`)
    } catch (error) {
      console.error('Fetch leaderboard error:', error)
      toast.error('Failed to fetch leaderboard')
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }, [selectedCampaign])
  
  // Analyze Content
  const analyzeContent = useCallback(async () => {
    if (!content.trim()) {
      toast.error('Masukkan konten untuk dianalisis')
      return
    }
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: content.trim(), 
          campaignContext: campaignContext || undefined,
          engagement: engagement
        })
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Analisis gagal')
      
      const gates = data.analysis.gates
      const quality = data.analysis.quality
      
      // Calculate scores using Rally's formula
      const gateSum = gates.contentAlignment.score + gates.informationAccuracy.score +
                      gates.campaignCompliance.score + gates.originality.score
      const qualitySum = quality.engagementPotential.score + quality.technicalQuality.score + quality.replyQuality.score
      
      // Atemporal formula (calibrated from Rally data)
      let atemporalPoints = (gateSum / 8) * (qualitySum / 15) * 2.5
      const minGate = Math.min(gates.contentAlignment.score, gates.informationAccuracy.score, 
                               gates.campaignCompliance.score, gates.originality.score)
      if (minGate === 0) atemporalPoints *= 0.5
      atemporalPoints = Math.min(atemporalPoints, 2.43)
      
      // Temporal formula (calibrated from Rally data)
      const likesContrib = Math.log10(engagement.likes + 1) * 0.18
      const repliesContrib = Math.log10(engagement.replies + 1) * 0.22
      const retweetsContrib = Math.log10(engagement.retweets + 1) * 0.15
      const impressionsContrib = Math.log10(engagement.impressions + 1) * 0.025
      const followersContrib = Math.log10(engagement.followersOfRepliers + 1) * 0.41
      const baseTemporal = 1.12
      
      let temporalPoints = baseTemporal + likesContrib + repliesContrib + retweetsContrib + impressionsContrib + followersContrib
      const totalPoints = atemporalPoints + temporalPoints
      const grade = getGrade(totalPoints)
      
      setAnalysisResult({
        gates, quality, engagement,
        atemporalPoints: Math.round(atemporalPoints * 100) / 100,
        temporalPoints: Math.round(temporalPoints * 100) / 100,
        totalPoints: Math.round(totalPoints * 100) / 100,
        grade,
        analysisMethod: data.analysis.metadata?.analysisMethod || 'llm-enhanced'
      })
      
      toast.success('Analysis complete!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }, [content, campaignContext, engagement])
  
  // Auto-fetch campaigns on mount
  useEffect(() => {
    if (campaigns.length === 0) fetchCampaigns()
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/20">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Rally Score Analyzer
              </h1>
              <p className="text-gray-400 text-sm flex items-center gap-2">
                Connected to Rally.fun API
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 flex items-center gap-1">
            <Globe className="w-3 h-3" /> LIVE DATA
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <FolderKanban className="w-4 h-4 mr-2" /> Campaigns
            </TabsTrigger>
            <TabsTrigger value="analyze" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <Send className="w-4 h-4 mr-2" /> Analyze
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <Trophy className="w-4 h-4 mr-2" /> Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Active Rally Campaigns</h2>
              <Button onClick={fetchCampaigns} disabled={isLoadingCampaigns} variant="outline" className="border-gray-600 text-gray-300">
                {isLoadingCampaigns ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
            
            {isLoadingCampaigns && campaigns.length === 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-gray-400">Loading campaigns from Rally.fun...</p>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <Card 
                  key={campaign.id}
                  onClick={() => selectCampaign(campaign)}
                  className={`cursor-pointer transition-all hover:scale-[1.02] overflow-hidden ${
                    selectedCampaign?.id === campaign.id 
                      ? 'bg-amber-600/20 border-amber-500' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {/* Header Image */}
                  {campaign.headerImageUrl && (
                    <div className="h-24 w-full overflow-hidden">
                      <img src={campaign.headerImageUrl} alt="" className="w-full h-full object-cover opacity-60" />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base text-white truncate">{campaign.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {campaign.creatorAvatar && (
                            <img src={campaign.creatorAvatar} alt="" className="w-5 h-5 rounded-full" />
                          )}
                          <p className="text-xs text-gray-500 truncate">
                            by {campaign.creator}
                            {campaign.creatorVerified && <Verified className="w-3 h-3 inline ml-1 text-blue-400" />}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {campaign.tokenLogo && (
                          <img src={campaign.tokenLogo} alt="" className="w-5 h-5 rounded-full" />
                        )}
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                          {campaign.token}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Brief */}
                    {campaign.brief && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{campaign.brief}</p>
                    )}
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-700/30 p-2 rounded flex flex-col items-center">
                        <FolderKanban className="w-4 h-4 text-blue-400 mb-1" />
                        <p className="text-gray-400">Missions</p>
                        <p className="text-white font-bold text-sm">{campaign.missionCount || 0}</p>
                      </div>
                      <div className="bg-gray-700/30 p-2 rounded flex flex-col items-center">
                        <Users className="w-4 h-4 text-green-400 mb-1" />
                        <p className="text-gray-400">Members</p>
                        <p className="text-white font-bold text-sm">{formatNumber(campaign.participantCount || 0)}</p>
                      </div>
                      <div className="bg-gray-700/30 p-2 rounded flex flex-col items-center">
                        <DollarSign className="w-4 h-4 text-amber-400 mb-1" />
                        <p className="text-gray-400">Rewards</p>
                        <p className="text-white font-bold text-sm">{formatNumber(campaign.totalReward || 0)}</p>
                      </div>
                    </div>
                    
                    {/* Chain & Requirements */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-400 flex items-center gap-1">
                          {campaign.chainId === 8453 ? '🔵 Base' : campaign.chainId === 84532 ? '🔷 Base Sepolia' : `Chain ${campaign.chainId}`}
                        </Badge>
                        {campaign.onlyVerifiedUsers && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
                            <Verified className="w-3 h-3 mr-1" /> Verified Only
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>Ends: {new Date(campaign.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Follower Requirements */}
                    {campaign.minimumFollowers > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Min {formatNumber(campaign.minimumFollowers)} followers required</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {!isLoadingCampaigns && campaigns.length === 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12 flex flex-col items-center gap-3">
                  <FolderKanban className="w-8 h-8 text-gray-500" />
                  <p className="text-gray-400">No active campaigns found</p>
                  <Button onClick={fetchCampaigns} className="bg-amber-600 hover:bg-amber-700">
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analyze Tab */}
          <TabsContent value="analyze" className="space-y-4">
            {selectedCampaign && (
              <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedCampaign.creatorAvatar && (
                        <img src={selectedCampaign.creatorAvatar} alt="" className="w-10 h-10 rounded-full" />
                      )}
                      <div>
                        <p className="text-xs text-gray-400">Selected Campaign</p>
                        <p className="text-white font-bold">{selectedCampaign.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>{formatNumber(selectedCampaign.participantCount)} members</span>
                          <span>•</span>
                          <span>{selectedCampaign.missionCount} missions</span>
                          {selectedCampaign.totalReward > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">{formatNumber(selectedCampaign.totalReward)} {selectedCampaign.token} rewards</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(`https://rally.fun/campaign/${selectedCampaign.intelligentContractAddress}`, '_blank')}
                        className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" /> Open in Rally
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('campaigns')} className="border-gray-600 text-gray-300">
                        Change
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Campaign Details */}
            {selectedCampaign && selectedCampaign.brief && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" /> Campaign Brief
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-300">
                  <p>{selectedCampaign.brief}</p>
                  {selectedCampaign.organizationWebsite && (
                    <a 
                      href={selectedCampaign.organizationWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-amber-400 hover:text-amber-300"
                    >
                      <Globe className="w-3 h-3" /> {selectedCampaign.organizationWebsite}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
            
            {selectedMission && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" /> Mission Briefing
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-300 space-y-2">
                  <p><strong>Title:</strong> {selectedMission.title}</p>
                  {selectedMission.description && <p><strong>Description:</strong> {selectedMission.description}</p>}
                  {selectedMission.rules && <p><strong>Rules:</strong> {selectedMission.rules}</p>}
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input */}
              <div className="space-y-4">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" /> Content to Analyze
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste your tweet/content here..."
                      className="bg-gray-700/50 border-gray-600 text-white min-h-[120px] resize-none"
                    />
                    <Button
                      onClick={analyzeContent}
                      disabled={isAnalyzing || !content.trim()}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50"
                    >
                      {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze with AI</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Engagement Projection */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-400" /> Engagement Projection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs">Likes</label>
                        <Input type="number" min={0} value={engagement.likes}
                          onChange={(e) => setEngagement(prev => ({ ...prev, likes: parseInt(e.target.value) || 0 }))}
                          className="bg-gray-700/50 border-gray-600 text-white h-9" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs">Replies</label>
                        <Input type="number" min={0} value={engagement.replies}
                          onChange={(e) => setEngagement(prev => ({ ...prev, replies: parseInt(e.target.value) || 0 }))}
                          className="bg-gray-700/50 border-gray-600 text-white h-9" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs">Retweets</label>
                        <Input type="number" min={0} value={engagement.retweets}
                          onChange={(e) => setEngagement(prev => ({ ...prev, retweets: parseInt(e.target.value) || 0 }))}
                          className="bg-gray-700/50 border-gray-600 text-white h-9" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs">Impressions</label>
                        <Input type="number" min={0} value={engagement.impressions}
                          onChange={(e) => setEngagement(prev => ({ ...prev, impressions: parseInt(e.target.value) || 0 }))}
                          className="bg-gray-700/50 border-gray-600 text-white h-9" />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs">Followers of Repliers (main driver)</label>
                      <Input type="number" min={0} value={engagement.followersOfRepliers}
                        onChange={(e) => setEngagement(prev => ({ ...prev, followersOfRepliers: parseInt(e.target.value) || 0 }))}
                        className="bg-gray-700/50 border-gray-600 text-white h-9" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {analysisResult ? (
                  <>
                    {/* Score Card */}
                    <Card className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-gray-700 overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" /> Estimated Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-4">
                          <div className={`text-5xl font-bold ${analysisResult.grade.color} mb-2`}>
                            {analysisResult.totalPoints.toFixed(2)}
                          </div>
                          <div className="flex items-center justify-center gap-3">
                            <Badge className={`${analysisResult.grade.color} bg-gray-700/50 text-lg px-3 py-1`}>
                              {analysisResult.grade.grade}
                            </Badge>
                            <span className="text-gray-400 text-sm">{analysisResult.grade.label}</span>
                          </div>
                        </div>
                        
                        <Separator className="bg-gray-700 my-4" />
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Atemporal Points</span>
                            <span className="font-bold text-cyan-400">{analysisResult.atemporalPoints.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Temporal Points</span>
                            <span className="font-bold text-green-400">{analysisResult.temporalPoints.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gate Scores */}
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="w-4 h-4 text-cyan-400" /> Gate Scores (0-2)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <AnalysisCard title="Content Alignment" score={analysisResult.gates.contentAlignment.score} maxScore={2} analysis={analysisResult.gates.contentAlignment.reason} icon={Check} />
                        <AnalysisCard title="Information Accuracy" score={analysisResult.gates.informationAccuracy.score} maxScore={2} analysis={analysisResult.gates.informationAccuracy.reason} icon={Info} />
                        <AnalysisCard title="Campaign Compliance" score={analysisResult.gates.campaignCompliance.score} maxScore={2} analysis={analysisResult.gates.campaignCompliance.reason} icon={Flag} />
                        <AnalysisCard title="Originality" score={analysisResult.gates.originality.score} maxScore={2} analysis={analysisResult.gates.originality.reason} icon={Star} />
                      </CardContent>
                    </Card>

                    {/* Quality Scores */}
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Star className="w-4 h-4 text-purple-400" /> Quality Scores (0-5)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <AnalysisCard title="Engagement Potential" score={analysisResult.quality.engagementPotential.score} maxScore={5} analysis={analysisResult.quality.engagementPotential.reason} icon={Zap} />
                        <AnalysisCard title="Technical Quality" score={analysisResult.quality.technicalQuality.score} maxScore={5} analysis={analysisResult.quality.technicalQuality.reason} icon={FileText} />
                        <AnalysisCard title="Reply Quality" score={analysisResult.quality.replyQuality.score} maxScore={5} analysis={analysisResult.quality.replyQuality.reason} icon={TrendingUp} />
                      </CardContent>
                    </Card>

                    {/* Formula Breakdown */}
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-amber-400" /> Formula Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        {/* Atemporal */}
                        <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/30">
                          <p className="text-cyan-400 font-medium mb-1">Atemporal Points</p>
                          <p className="text-gray-400">
                            = (gate_sum / 8) × (quality_sum / 15) × 2.5
                          </p>
                          <p className="text-white mt-1 font-mono">
                            = ({analysisResult.gates.contentAlignment.score + analysisResult.gates.informationAccuracy.score + analysisResult.gates.campaignCompliance.score + analysisResult.gates.originality.score} / 8) 
                            × ({analysisResult.quality.engagementPotential.score + analysisResult.quality.technicalQuality.score + analysisResult.quality.replyQuality.score} / 15) × 2.5
                          </p>
                          <p className="text-cyan-300 font-bold mt-1">= {analysisResult.atemporalPoints.toFixed(2)}</p>
                        </div>
                        
                        {/* Temporal */}
                        <div className="p-2 bg-green-500/10 rounded border border-green-500/30">
                          <p className="text-green-400 font-medium mb-1">Temporal Points</p>
                          <p className="text-gray-400">
                            = base + log(likes)×0.18 + log(replies)×0.22 + log(retweets)×0.15 + log(impressions)×0.025 + log(followers)×0.41
                          </p>
                          <p className="text-white mt-1 font-mono">
                            = 1.12 + {Math.log10(engagement.likes + 1).toFixed(2)}×0.18 + {Math.log10(engagement.replies + 1).toFixed(2)}×0.22 + {Math.log10(engagement.retweets + 1).toFixed(2)}×0.15 + {Math.log10(engagement.impressions + 1).toFixed(2)}×0.025 + {Math.log10(engagement.followersOfRepliers + 1).toFixed(2)}×0.41
                          </p>
                          <p className="text-green-300 font-bold mt-1">= {analysisResult.temporalPoints.toFixed(2)}</p>
                        </div>
                        
                        {/* Total */}
                        <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30">
                          <p className="text-amber-400 font-medium mb-1">Total Points</p>
                          <p className="text-white font-mono">
                            {analysisResult.atemporalPoints.toFixed(2)} + {analysisResult.temporalPoints.toFixed(2)} = <span className="font-bold text-lg">{analysisResult.totalPoints.toFixed(2)}</span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="py-12 flex flex-col items-center gap-3">
                      <Calculator className="w-8 h-8 text-gray-500" />
                      <p className="text-gray-400 text-center">Paste your content and click Analyze<br/>to see your estimated Rally score</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Leaderboard</h2>
                {selectedCampaign && (
                  <p className="text-sm text-gray-400">{selectedCampaign.title} • {totalParticipants} participants</p>
                )}
              </div>
              <Button onClick={fetchLeaderboard} disabled={isLoadingLeaderboard} variant="outline" className="border-gray-600 text-gray-300">
                {isLoadingLeaderboard ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>
            
            {isLoadingLeaderboard && leaderboard.length === 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-gray-400">Loading leaderboard...</p>
                </CardContent>
              </Card>
            )}
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 text-xs text-gray-400 border-b border-gray-700 bg-gray-700/30">
                <div className="col-span-1">#</div>
                <div className="col-span-5">User</div>
                <div className="col-span-2 text-right">Points</div>
                <div className="col-span-2 text-right">Top %</div>
                <div className="col-span-2 text-right">Submissions</div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.rank} className={`grid grid-cols-12 gap-2 p-3 text-sm items-center ${idx % 2 === 0 ? 'bg-gray-800/30' : ''} hover:bg-gray-700/30`}>
                    <div className="col-span-1">
                      {entry.rank <= 3 ? (
                        <span className={entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : 'text-amber-600'}>
                          {entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank === 2 ? <Medal className="w-4 h-4" /> : <Medal className="w-4 h-4" />}
                        </span>
                      ) : (
                        <span className="text-gray-500">{entry.rank}</span>
                      )}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      {entry.avatar && <img src={entry.avatar} alt="" className="w-6 h-6 rounded-full" />}
                      <div>
                        <p className="text-white font-medium truncate">{entry.displayName || entry.username}</p>
                        <p className="text-xs text-gray-500">@{entry.username}</p>
                      </div>
                      {entry.verified && <Verified className="w-3 h-3 text-blue-400" />}
                    </div>
                    <div className="col-span-2 text-right font-mono text-green-400">{entry.totalPoints.toFixed(2)}</div>
                    <div className="col-span-2 text-right text-xs text-gray-400">Top {entry.topPercent.toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-xs text-gray-400">{entry.totalSubmissions || 1}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {!isLoadingLeaderboard && leaderboard.length === 0 && (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-12 flex flex-col items-center gap-3">
                  <Trophy className="w-8 h-8 text-gray-500" />
                  <p className="text-gray-400">Select a campaign to view leaderboard</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
