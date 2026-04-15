'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Settings,
  RotateCcw,
  Plus,
  Power,
  PowerOff,
  Database,
  Cpu,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Zap,
} from 'lucide-react';
import type { PipelineStatusData, CampaignData } from './dashboard-client';

interface Props {
  pipelineStatus: PipelineStatusData;
  campaigns: CampaignData[];
  onRefresh: () => void;
  formatTimestamp: (iso: string | null) => string;
}

export function SettingsPanel({
  pipelineStatus,
  campaigns,
  onRefresh,
  formatTimestamp,
}: Props) {
  const [autoRun, setAutoRun] = useState(false);
  const [addingCampaign, setAddingCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignAddress, setNewCampaignAddress] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);

  // Aggregate model stats from all campaigns
  const allModels = campaigns
    .filter((c) => c.predictionModel)
    .map((c) => c.predictionModel!);
  const avgMae = allModels.length > 0
    ? allModels.reduce((sum, m) => sum + m.mae, 0) / allModels.length
    : 0;
  const avgR2 = allModels.length > 0
    ? allModels.reduce((sum, m) => sum + m.r2, 0) / allModels.length
    : 0;
  const totalSamples = allModels.reduce((sum, m) => sum + m.sampleCount, 0);

  const handleAddCampaign = async () => {
    if (!newCampaignName.trim()) return;
    setAddLoading(true);
    setAddResult(null);
    try {
      const res = await fetch('/api/v7/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaignName.trim(),
          campaignAddress: newCampaignAddress.trim() || null,
        }),
      });
      const json = await res.json();
      setAddResult({ success: json.success, message: json.message || 'Selesai' });
      if (json.success) {
        setNewCampaignName('');
        setNewCampaignAddress('');
        setTimeout(() => onRefresh(), 500);
      }
    } catch {
      setAddResult({ success: false, message: 'Gagal menghubungi server' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleCampaign = async (campaignId: string) => {
    setTogglingId(campaignId);
    try {
      const res = await fetch('/api/v7/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', campaignId }),
      });
      const json = await res.json();
      if (json.success) setTimeout(() => onRefresh(), 300);
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
    }
  };

  const handleRetrain = async (campaignId: string) => {
    setRetrainingId(campaignId);
    try {
      const res = await fetch('/api/v7/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retrain', campaignId }),
      });
      const json = await res.json();
      if (json.success) setTimeout(() => onRefresh(), 500);
    } catch {
      // ignore
    } finally {
      setRetrainingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pipeline Configuration */}
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" />
            Konfigurasi Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-run Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-sm text-white font-medium">Auto-run Pipeline</p>
                <p className="text-xs text-zinc-500">Jalankan otomatis (cron belum dikonfigurasi)</p>
              </div>
            </div>
            <Switch checked={autoRun} onCheckedChange={setAutoRun} />
          </div>

          {/* Collection Interval */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-sm text-white font-medium">Interval Pengumpulan</p>
                <p className="text-xs text-zinc-500">Frekuensi pengambilan data</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
              Manual
            </Badge>
          </div>

          {/* Last Cron Status */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-sm text-white font-medium">Status Cron Terakhir</p>
                <p className="text-xs text-zinc-500 font-mono">
                  {pipelineStatus.lastRun
                    ? formatTimestamp(pipelineStatus.lastRun)
                    : 'Belum pernah dijalankan'}
                </p>
              </div>
            </div>
            {pipelineStatus.totalRuns > 0 ? (
              pipelineStatus.lastRunSuccess ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Berhasil
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs gap-1">
                  <AlertCircle className="w-3 h-3" /> Gagal
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                —
              </Badge>
            )}
          </div>

          {/* Pipeline Stats */}
          <Separator className="bg-zinc-800" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Eksekusi</span>
              <span className="text-white font-medium">{pipelineStatus.totalRuns}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tingkat Sukses</span>
              <span className="text-emerald-400 font-medium">
                {Math.round(pipelineStatus.successRate * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Campaign Terproses</span>
              <span className="text-white font-medium">{pipelineStatus.campaignsProcessed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Submisi Terkumpul</span>
              <span className="text-white font-medium">{pipelineStatus.totalSubmissionsCollected}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-zinc-400" />
            Konfigurasi Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">MAE Rata-rata</span>
              <p className={`text-xl font-bold mt-1 ${avgMae < 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {allModels.length > 0 ? avgMae.toFixed(2) : '—'}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">R² Rata-rata</span>
              <p className={`text-xl font-bold mt-1 ${avgR2 > 0.5 ? 'text-emerald-400' : avgR2 > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {allModels.length > 0 ? avgR2.toFixed(3) : '—'}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
              <span className="text-[10px] text-zinc-500 uppercase block">Total Sampel</span>
              <p className="text-xl font-bold text-white mt-1">{totalSamples || '—'}</p>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          {/* Per-campaign model status */}
          <div>
            <h4 className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">
              Status Model per Campaign
            </h4>
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <span className="text-sm text-zinc-300">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.predictionModel ? (
                      <>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            c.predictionModel.mae < 2
                              ? 'text-emerald-400 border-emerald-500/20'
                              : 'text-amber-400 border-amber-500/20'
                          }`}
                        >
                          MAE: {c.predictionModel.mae.toFixed(2)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] text-zinc-400 hover:text-white"
                          onClick={() => handleRetrain(c.id)}
                          disabled={retrainingId === c.id}
                        >
                          {retrainingId === c.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3 mr-1" />
                          )}
                          Latih Ulang
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                        Belum ada model
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Management */}
      <Card className="bg-zinc-900 border border-zinc-800 rounded-xl lg:col-span-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-400" />
              Manajemen Campaign ({campaigns.length})
            </CardTitle>
            <Dialog open={addingCampaign} onOpenChange={setAddingCampaign}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Tambah Campaign Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="text-sm text-zinc-300">Nama Campaign *</Label>
                    <Input
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      placeholder="Contoh: Marb Market M2"
                      className="bg-zinc-800 border-zinc-700 text-sm mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-300">Alamat Campaign (opsional)</Label>
                    <Input
                      value={newCampaignAddress}
                      onChange={(e) => setNewCampaignAddress(e.target.value)}
                      placeholder="0x..."
                      className="bg-zinc-800 border-zinc-700 text-sm mt-1.5 font-mono"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Alamat kontrak Rally.fun. Diperlukan untuk mengambil data submisi.
                    </p>
                  </div>

                  {addResult && (
                    <div className={`px-3 py-2 rounded-lg text-sm ${
                      addResult.success
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {addResult.message}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="ghost" className="text-zinc-400">Batal</Button>
                  </DialogClose>
                  <Button
                    onClick={handleAddCampaign}
                    disabled={addLoading || !newCampaignName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  >
                    {addLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Tambah
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-sm text-zinc-500">
                Belum ada campaign. Klik &quot;Tambah Campaign&quot; untuk memulai.
              </div>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      c.isActive ? 'bg-emerald-500/10' : 'bg-zinc-800'
                    }`}>
                      <Database className={`w-4 h-4 ${c.isActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{c.name}</p>
                      <p className="text-xs text-zinc-500">
                        {c.campaignAddress
                          ? `${c.campaignAddress.slice(0, 6)}...${c.campaignAddress.slice(-4)}`
                          : 'Tidak ada alamat'}
                        {' · '}
                        {c.intelligence?.totalSubmissions ?? 0} submisi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        c.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      {c.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleToggleCampaign(c.id)}
                      disabled={togglingId === c.id}
                    >
                      {togglingId === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : c.isActive ? (
                        <PowerOff className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Power className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
