'use client';

import { SetStateAction, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Target as TargetIcon,
  ShieldCheck,
  Activity,
  Play,
  Plus,
  Link as LinkIcon,
  KeyRound,
  RefreshCw,
  Check,
  AlertTriangle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

type Scan = {
  id: string;
  status: string;
  overall_score: number | null;
  started_at: string;
  finished_at: string | null;
};
type Target = { id: string; name: string; endpoint_url: string };

export default function Dashboard() {
  const { toast } = useToast();

  const [scans, setScans] = useState<Scan[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // form state
  const [name, setName] = useState('My Target');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // action loading states
  const [creating, setCreating] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  async function refresh() {
    try {
      const [s, t] = await Promise.all([
        fetch('/api/scans').then((r) => r.json()),
        fetch('/api/targets').then((r) => r.json()),
      ]);
      setScans(s.scans || []);
      setTargets(t.targets || []);
    } catch {
      // soft-fail UI
    } finally {
      setInitialLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  const lastScanScore = useMemo(() => {
    if (!scans.length) return null;
    const sorted = [...scans].sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    const lastDone = sorted.find((s) => s.status === 'done' || s.status === 'finished');
    return lastDone?.overall_score ?? null;
  }, [scans]);

  // We don’t have per-finding severity here, so show “Open Scans” as a proxy metric
  const openHighCrit = useMemo(() => scans.filter((s) => s.status === 'running').length, [scans]);

  const createTarget = async () => {
    if (!name.trim() || !endpoint.trim()) {
      toast({ title: 'Missing fields', description: 'Name and Endpoint are required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const r = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, endpoint_url: endpoint, api_key: apiKey }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to create target');
      }
      setApiKey('');
      toast({ title: 'Target saved', description: 'You can run a scan now.' });
      await refresh();
    } catch (e: any) {
      toast({ title: 'Create failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const startScan = async (id: string) => {
    setScanningId(id);
    try {
      const r = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target_id: id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(j.error || 'Failed to start scan');
      toast({ title: 'Scan started', description: `Scan ${j.scan_id?.slice(0, 8) ?? ''}…` });
      await refresh();
    } catch (e: any) {
      toast({ title: 'Scan failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setScanningId(null);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Run automated AI pen tests and track results across your targets.
          </p>
        </div>
        <Button
          variant="default"
          className="rounded-full px-4 gap-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow hover:opacity-90"
          onClick={refresh}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <MetricCard
          label="Total Targets"
          value={initialLoading ? '—' : targets.length}
          icon={<TargetIcon className="h-5 w-5 opacity-80" />}
        />
        <MetricCard
          label="Last Scan Score"
          value={initialLoading ? '—' : (lastScanScore ?? '—')}
          icon={<ShieldCheck className="h-5 w-5 opacity-80" />}
          valueNode={
            lastScanScore !== null ? <ScoreBadge score={lastScanScore} /> : <span className="text-slate-300">—</span>
          }
        />
        <MetricCard
          label="Open Scans"
          value={initialLoading ? '—' : openHighCrit}
          icon={<Activity className="h-5 w-5 opacity-80" />}
        />
      </motion.div>

      <Separator className="my-8" />

      {/* Add Target */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.03 }}
      >
        <Card className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Target
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="t-name">Target name</Label>
                <Input
                  id="t-name"
                  placeholder="Customer Chatbot"
                  value={name}
                  onChange={(e: { target: { value: SetStateAction<string>; }; }) => setName(e.target.value)}
                />
                <p className="text-xs text-slate-400">A short name for this endpoint.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="t-endpoint">Endpoint URL</Label>
                <div className="relative">
                  <Input
                    id="t-endpoint"
                    placeholder="https://api.example.com/ai"
                    value={endpoint}
                    onChange={(e: { target: { value: SetStateAction<string>; }; }) => setEndpoint(e.target.value)}
                    className="pl-9"
                  />
                  <LinkIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <p className="text-xs text-slate-400">
                  Must accept <code className="text-slate-300">{'{ input }'}</code> in a JSON POST.
                </p>
              </div>

              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="t-apikey">API Key (stored encrypted)</Label>
                <CopyField
                  value={apiKey}
                  masked={!showKey}
                  onChange={(v) => setApiKey(v)}
                  onToggleMask={() => setShowKey((s) => !s)}
                />
                <p className="text-xs text-slate-400">
                  We AES-GCM encrypt keys at rest and decrypt only during scans.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Button
                onClick={createTarget}
                disabled={creating}
                className="rounded-full px-5 gap-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold shadow hover:opacity-90"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Target
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Targets */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.05 }}
        className="mt-6"
      >
        <Card className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle>Targets</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {initialLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : targets.length === 0 ? (
              <EmptyState
                icon={<TargetIcon className="h-6 w-6 text-slate-400" />}
                title="No targets yet"
                subtitle="Add your first target to start scanning."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-56">Name</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="w-40 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((t) => (
                      <TargetRow
                        key={t.id}
                        target={t}
                        scanning={scanningId === t.id}
                        onRun={() => startScan(t.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Scans */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: 0.07 }}
        className="mt-6"
      >
        <Card className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {initialLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : scans.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6 text-slate-400" />}
                title="No scans yet"
                subtitle="Run your first scan from the Targets table."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[280px]">Scan</TableHead>
                      <TableHead className="w-40">Status</TableHead>
                      <TableHead className="w-40">Score</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="w-28 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.map((s) => (
                      <ScanRow key={s.id} scan={s} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}

/* ------------------------------- Subcomponents ------------------------------- */

function MetricCard({
  label,
  value,
  icon,
  valueNode,
}: {
  label: string;
  value?: number | string | null;
  icon?: React.ReactNode;
  valueNode?: React.ReactNode;
}) {
  return (
    <Card className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl hover:shadow-lg transition">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">
          {valueNode ?? <span>{value ?? '—'}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let variant = 'default';
  if (score >= 90) variant = 'good';
  else if (score >= 70) variant = 'ok';
  else if (score >= 40) variant = 'warn';
  else variant = 'crit';

  const cls =
    variant === 'good'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      : variant === 'ok'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : variant === 'warn'
      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      : 'bg-red-500/20 text-red-300 border-red-500/30';

  return (
    <Badge className={`rounded-full border ${cls}`}>
      {score}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    running: {
      label: 'Running',
      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />,
    },
    finished: {
      label: 'Finished',
      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: <Check className="h-3.5 w-3.5 mr-1.5" />,
    },
    done: {
      label: 'Finished',
      cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: <Check className="h-3.5 w-3.5 mr-1.5" />,
    },
    error: {
      label: 'Error',
      cls: 'bg-red-500/20 text-red-300 border-red-500/30',
      icon: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
    },
  };
  const { label, cls, icon } = map[s] ?? {
    label: status,
    cls: 'bg-slate-500/20 text-slate-300 border-slate-600/30',
    icon: <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />,
  };
  return (
    <Badge className={`rounded-full border inline-flex items-center ${cls}`}>
      {icon}
      {label}
    </Badge>
  );
}

function CopyField({
  value,
  masked = true,
  onChange,
  onToggleMask,
}: {
  value: string;
  masked?: boolean;
  onChange: (v: string) => void;
  onToggleMask: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const type = masked ? 'password' : 'text';
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  return (
    <div className="flex gap-2">
      <Input
        id="t-apikey"
        type={type}
        placeholder="sk_live_***"
        value={value}
        onChange={(e: { target: { value: string; }; }) => onChange(e.target.value)}
        className="flex-1"
      />
      <Button
        type="button"
        variant="secondary"
        className="rounded-full"
        onClick={onToggleMask}
        title={masked ? 'Show' : 'Hide'}
      >
        {masked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="rounded-full"
        onClick={onCopy}
        title="Copy"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function TargetRow({
  target,
  onRun,
  scanning,
}: {
  target: Target;
  onRun: () => void;
  scanning: boolean;
}) {
  return (
    <TableRow className="hover:bg-slate-800/30">
      <TableCell className="font-medium">{target.name}</TableCell>
      <TableCell className="text-slate-400">
        <span className="inline-flex items-center gap-2 max-w-[520px] truncate">
          <LinkIcon className="h-4 w-4 opacity-70" />
          <span className="truncate">{target.endpoint_url}</span>
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Button
          onClick={onRun}
          disabled={scanning}
          className="rounded-full px-4 gap-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold hover:opacity-90"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Scan
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ScanRow({ scan }: { scan: Scan }) {
  const canView = scan.status === 'done' || scan.status === 'finished';
  return (
    <TableRow className="hover:bg-slate-800/30">
      <TableCell className="font-mono text-xs md:text-sm">
        <span className="block truncate">{scan.id}</span>
      </TableCell>
      <TableCell>
        <StatusBadge status={scan.status} />
      </TableCell>
      <TableCell>
        {scan.overall_score !== null ? <ScoreBadge score={scan.overall_score} /> : <span className="text-slate-300">—</span>}
      </TableCell>
      <TableCell className="text-slate-300">
        {new Date(scan.started_at).toLocaleString()}
      </TableCell>
      <TableCell className="text-right">
        {canView ? (
          <Button asChild variant="outline" className="rounded-full">
            <Link href={`/scans/${scan.id}`}>View</Link>
          </Button>
        ) : (
          <span className="text-slate-500 text-sm">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="py-10 text-center text-slate-300">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/60">
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-slate-400">{subtitle}</div>
    </div>
  );
}
