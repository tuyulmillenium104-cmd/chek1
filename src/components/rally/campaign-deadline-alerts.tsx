'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Timer } from 'lucide-react';

interface Campaign {
  title: string;
  endDate: string | null;
  isActive: boolean;
}

const ALERT_24H_MS = 24 * 60 * 60 * 1000;
const ALERT_6H_MS = 6 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

function getRemainingMs(endDate: string): number {
  return new Date(endDate).getTime() - Date.now();
}

function checkDeadlines(
  campaigns: Campaign[],
  alerted: React.MutableRefObject<Set<string>>,
) {
  for (const c of campaigns) {
    if (!c.isActive || !c.endDate) continue;

    const remaining = getRemainingMs(c.endDate);
    if (remaining <= 0) continue;

    const sixHourKey = `${c.title}-6h`;
    const twentyFourHourKey = `${c.title}-24h`;

    if (remaining <= ALERT_6H_MS && !alerted.current.has(sixHourKey)) {
      alerted.current.add(sixHourKey);
      alerted.current.add(twentyFourHourKey);
      toast.error(`${c.title} expires in less than 6 hours!`, {
        icon: <Timer className="h-4 w-4 text-red-500" />,
        description: 'Act now before the campaign closes.',
      });
    } else if (
      remaining <= ALERT_24H_MS &&
      !alerted.current.has(twentyFourHourKey)
    ) {
      alerted.current.add(twentyFourHourKey);
      toast.warning(`${c.title} expires in less than 24 hours`, {
        icon: <Timer className="h-4 w-4 text-yellow-500" />,
        description: 'Deadline approaching soon.',
      });
    }
  }
}

export function CampaignDeadlineAlerts() {
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function fetchAndCheck() {
      try {
        const res = await fetch('/api/rally/campaigns');
        const data = await res.json();
        checkDeadlines(data.campaigns ?? [], alertedRef);
      } catch {
        // Silent — network errors shouldn't spam the user
      }
    }

    fetchAndCheck();
    const interval = setInterval(fetchAndCheck, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
