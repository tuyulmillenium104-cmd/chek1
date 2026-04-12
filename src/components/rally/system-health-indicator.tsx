'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

type Status = 'healthy' | 'healed' | 'partial' | 'failed';

interface HealthResponse {
  status: Status;
  summary: string;
  checks: { status: 'pass' | 'fixed' | 'warn' | 'fail' }[];
}

const CONFIG: Record<Status, { dot: string; cls: string; icon: typeof CheckCircle2 }> = {
  healthy:  { dot: 'bg-emerald-400',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',  icon: CheckCircle2 },
  healed:   { dot: 'bg-amber-400',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    icon: Activity },
  partial:  { dot: 'bg-orange-400',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20',  icon: AlertTriangle },
  failed:   { dot: 'bg-red-400',     cls: 'bg-red-500/10 text-red-400 border-red-500/20',          icon: XCircle },
};

function getLabel(status: Status, checks: HealthResponse['checks']): string {
  if (status === 'healthy') return 'All Systems OK';
  if (status === 'healed') return `${checks.filter(c => c.status === 'fixed').length} Fixed`;
  if (status === 'partial') return `${checks.filter(c => c.status === 'warn').length} Warnings`;
  return 'Issues Found';
}

export function SystemHealthIndicator() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/rally/self-heal');
      if (res.ok) setData(await res.json());
    } catch { /* degrade silently */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 120_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  if (loading) return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <Loader2 className="size-3 animate-spin" />
      <span className="text-xs">Checking…</span>
    </Badge>
  );

  if (!data) return null;
  const { dot, cls, icon: Icon } = CONFIG[data.status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn('gap-1.5', cls)}>
          <span className="relative flex size-2">
            <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-75', dot)} />
            <span className={cn('relative inline-flex size-full rounded-full', dot)} />
          </span>
          <Icon className="size-3" />
          <span className="text-xs">{getLabel(data.status, data.checks)}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        <p>{data.summary}</p>
        <p className="mt-1 text-muted-foreground">
          {data.checks.length} check{data.checks.length !== 1 && 's'} run
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
