'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Loader2,
  Download,
  Search,
  TrendingUp,
  Brain,
  Calculator,
  Filter,
  X,
} from 'lucide-react';

type OverviewResponse = {
  summary: {
    totalMixes: number;
    unlockedMixes: number;
    unlockConversionPct: number;
    compliantMixes: number;
    complianceRatePct: number;
    avgQualityMatch: number;
    minCostPerKg: number;
    avgCostPerKg: number;
    maxCostPerKg: number;
    totalCost: number;
  };
  feedTypeBreakdown: { fish: number; poultry: number };
  stagePerformance: Array<{
    stageCode: string;
    stageLabel: string;
    count: number;
    avgQualityMatch: number;
    avgCostPerKg: number;
    complianceRatePct: number;
  }>;
  topCostDrivers: Array<{
    ingredientName: string;
    usageCount: number;
    qtyKgTotal: number;
    lineCostTotal: number;
    avgPriceAtMoment: number;
    costSharePct: number;
  }>;
  nutrientMissFrequency: Array<{
    nutrient: string;
    evaluatedCount: number;
    belowCount: number;
    aboveCount: number;
    missRatePct: number;
  }>;
};

type TrendsResponse = {
  metric: 'costPerKg' | 'qualityMatch' | 'complianceRate';
  interval: 'day' | 'week';
  points: Array<{ bucket: string; value: number; sampleCount: number }>;
};

type AiUsageResponse = {
  totals: {
    interactions: number;
    successCount: number;
    fallbackCount: number;
    errorCount: number;
    totalTokens: number;
    estimatedCostUsd: number;
    avgLatencyMs: number;
    verification: { passed: number; failed: number };
  };
  byModel: Array<{
    model: string;
    count: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  daily: Array<{
    date: string;
    count: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
};

type FormulationRow = {
  _id: string;
  batchName: string;
  complianceColor: string;
  qualityMatchPercentage: number;
  costPerKg: number;
  totalCost: number;
  isUnlocked: boolean;
  createdAt: string;
  userId?: { _id: string; email?: string; name?: string };
};

type LedgerResponse = {
  formulationId: string;
  batchName: string;
  feedType: string;
  stageCode?: string;
  stageLabel?: string;
  strategy?: string;
  targetWeightKg: number;
  qualityMatchPercentage: number;
  complianceColor: string;
  equationRows: Array<{
    factId: string;
    label: string;
    equation: string;
    value: number;
    unit: string;
  }>;
  nutrientRows: Array<{
    nutrient: string;
    unit: string;
    targetMin?: number;
    targetMax?: number;
    actual: number;
    deltaToMin?: number;
    deltaToMax?: number;
    status: 'below' | 'within' | 'above' | 'no_target';
  }>;
};

const asCurrency = (amount: number) =>
  `₦${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const asPercent = (value: number) => `${Number(value || 0).toFixed(2)}%`;

const asDateInput = (value: Date) => value.toISOString().slice(0, 10);

const getFilenameFromHeaders = (header: string | undefined, fallback: string) => {
  if (!header) return fallback;
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

export default function FormulationIntelligencePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [feedType, setFeedType] = useState('');
  const [stageCode, setStageCode] = useState('');
  const [metric, setMetric] = useState<'costPerKg' | 'qualityMatch' | 'complianceRate'>('costPerKg');
  const [interval, setInterval] = useState<'day' | 'week'>('week');
  const [from, setFrom] = useState<string>(asDateInput(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)));
  const [to, setTo] = useState<string>(asDateInput(new Date()));
  const [selectedFormulationId, setSelectedFormulationId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (feedType) params.append('feedType', feedType);
    if (stageCode) params.append('stageCode', stageCode.toUpperCase());
    return params.toString();
  }, [from, to, feedType, stageCode]);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['intelligence-overview', filterParams],
    queryFn: async () => {
      const { data } = await api.get<OverviewResponse>(
        `/admin/formulations/analytics/overview?${filterParams}`
      );
      return data;
    },
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['intelligence-trends', filterParams, metric, interval],
    queryFn: async () => {
      const query = new URLSearchParams(filterParams);
      query.set('metric', metric);
      query.set('interval', interval);
      const { data } = await api.get<TrendsResponse>(
        `/admin/formulations/analytics/trends?${query.toString()}`
      );
      return data;
    },
  });

  const { data: aiUsage, isLoading: aiLoading } = useQuery({
    queryKey: ['intelligence-ai-usage', from, to],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const { data } = await api.get<AiUsageResponse>(
        `/admin/ai/usage-summary?${query.toString()}`
      );
      return data;
    },
  });

  const { data: formulationsData, isLoading: formulationsLoading } = useQuery({
    queryKey: ['intelligence-formulations', page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      const { data } = await api.get(`/admin/formulations?${params.toString()}`);
      return data as { data: FormulationRow[]; meta: { page: number; pages: number; total: number } };
    },
    placeholderData: (prev) => prev,
  });

  const { data: ledger, isFetching: ledgerLoading } = useQuery({
    queryKey: ['intelligence-ledger', selectedFormulationId],
    enabled: Boolean(selectedFormulationId),
    queryFn: async () => {
      const { data } = await api.get<LedgerResponse>(
        `/admin/formulations/${selectedFormulationId}/calculation-ledger`
      );
      return data;
    },
  });

  const downloadExport = async (formulationId: string, format: 'csv' | 'pdf') => {
    try {
      setIsDownloading(`${formulationId}:${format}`);
      const response = await api.post(
        `/admin/formulations/${formulationId}/export`,
        { format },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          (format === 'pdf' ? 'application/pdf' : 'text/csv'),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromHeaders(
        response.headers['content-disposition'],
        `formulation-report.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(null);
    }
  };

  const loading = overviewLoading || trendsLoading || aiLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Formulation Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Data-first formulation analytics, explicit calculation ledgers, and AI usage telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Filter size={14} />
          <span>Table-first reporting enabled</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
        <div>
          <label className="text-xs text-gray-500">From</label>
          <input
            type="date"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">To</label>
          <input
            type="date"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Feed Type</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={feedType}
            onChange={(e) => setFeedType(e.target.value)}
          >
            <option value="">All</option>
            <option value="fish">Fish</option>
            <option value="poultry">Poultry</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Stage Code</label>
          <input
            type="text"
            placeholder="e.g BROILER_STARTER"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={stageCode}
            onChange={(e) => setStageCode(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Trend Metric</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={metric}
            onChange={(e) =>
              setMetric(e.target.value as 'costPerKg' | 'qualityMatch' | 'complianceRate')
            }
          >
            <option value="costPerKg">Cost per kg</option>
            <option value="qualityMatch">Quality match</option>
            <option value="complianceRate">Compliance rate</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Trend Interval</label>
          <select
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            value={interval}
            onChange={(e) => setInterval(e.target.value as 'day' | 'week')}
          >
            <option value="week">Weekly</option>
            <option value="day">Daily</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-40 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={26} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <MetricCard label="Total Mixes" value={String(overview?.summary.totalMixes || 0)} />
            <MetricCard
              label="Compliance Rate"
              value={asPercent(overview?.summary.complianceRatePct || 0)}
            />
            <MetricCard
              label="Avg Quality"
              value={asPercent(overview?.summary.avgQualityMatch || 0)}
            />
            <MetricCard
              label="Avg Cost/kg"
              value={asCurrency(overview?.summary.avgCostPerKg || 0)}
            />
            <MetricCard
              label="AI Calls"
              value={String(aiUsage?.totals.interactions || 0)}
              icon={<Brain size={14} />}
            />
            <MetricCard
              label="AI Cost (USD)"
              value={`$${(aiUsage?.totals.estimatedCostUsd || 0).toFixed(4)}`}
            />
            <MetricCard
              label="AI Verify Pass"
              value={String(aiUsage?.totals.verification?.passed || 0)}
            />
            <MetricCard
              label="AI Avg Latency"
              value={`${(aiUsage?.totals.avgLatencyMs || 0).toFixed(0)}ms`}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h2 className="font-semibold text-gray-900">Trend Points</h2>
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Bucket</th>
                      <th className="px-4 py-2 text-left">Value</th>
                      <th className="px-4 py-2 text-left">Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trends?.points || []).map((point) => (
                      <tr key={point.bucket} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-mono text-xs">{point.bucket}</td>
                        <td className="px-4 py-2">
                          {metric === 'costPerKg'
                            ? asCurrency(point.value)
                            : asPercent(point.value)}
                        </td>
                        <td className="px-4 py-2">{point.sampleCount}</td>
                      </tr>
                    ))}
                    {(trends?.points || []).length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-center text-gray-400" colSpan={3}>
                          No trend points in selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <Calculator size={16} className="text-primary" />
                <h2 className="font-semibold text-gray-900">Top Cost Drivers</h2>
              </div>
              <div className="max-h-80 overflow-auto divide-y divide-gray-100">
                {(overview?.topCostDrivers || []).slice(0, 8).map((driver) => (
                  <div key={driver.ingredientName} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm">
                        {driver.ingredientName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {asPercent(driver.costSharePct)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {asCurrency(driver.lineCostTotal)} total line cost
                    </p>
                  </div>
                ))}
                {(overview?.topCostDrivers || []).length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    No cost-driver records found.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DataTable
              title="Nutrient Miss Frequency"
              headers={['Nutrient', 'Below', 'Above', 'Miss rate']}
              rows={(overview?.nutrientMissFrequency || []).slice(0, 10).map((row) => [
                row.nutrient,
                String(row.belowCount),
                String(row.aboveCount),
                asPercent(row.missRatePct),
              ])}
            />
            <DataTable
              title="Stage Performance"
              headers={['Stage', 'Count', 'Avg quality', 'Avg cost/kg']}
              rows={(overview?.stagePerformance || []).slice(0, 10).map((row) => [
                `${row.stageCode || '-'} (${row.stageLabel || '-'})`,
                String(row.count),
                asPercent(row.avgQualityMatch),
                asCurrency(row.avgCostPerKg),
              ])}
            />
          </div>
        </>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h2 className="font-semibold text-gray-900">Formulation Records (Table-First)</h2>
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search batch..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Compliance</th>
                <th className="px-4 py-3 text-left">Quality</th>
                <th className="px-4 py-3 text-left">Cost/kg</th>
                <th className="px-4 py-3 text-left">Total Cost</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formulationsLoading && (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                    <Loader2 className="animate-spin inline mr-2" size={16} />
                    Loading formulations...
                  </td>
                </tr>
              )}
              {!formulationsLoading &&
                (formulationsData?.data || []).map((row) => {
                  const rowId = row._id;
                  return (
                    <tr key={rowId} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{row.batchName || 'Feed Mix'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.userId?.name || row.userId?.email || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">{row.complianceColor}</td>
                      <td className="px-4 py-3">{asPercent(row.qualityMatchPercentage || 0)}</td>
                      <td className="px-4 py-3">{asCurrency(row.costPerKg || 0)}</td>
                      <td className="px-4 py-3">{asCurrency(row.totalCost || 0)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedFormulationId(rowId)}
                            className="px-2 py-1 border border-gray-200 rounded text-xs hover:bg-gray-100"
                          >
                            Ledger
                          </button>
                          <button
                            onClick={() => void downloadExport(rowId, 'csv')}
                            className="px-2 py-1 border border-gray-200 rounded text-xs hover:bg-gray-100 flex items-center gap-1"
                          >
                            <Download size={12} />
                            CSV
                          </button>
                          <button
                            onClick={() => void downloadExport(rowId, 'pdf')}
                            className="px-2 py-1 border border-gray-200 rounded text-xs hover:bg-gray-100 flex items-center gap-1"
                          >
                            <Download size={12} />
                            PDF
                          </button>
                          {isDownloading?.startsWith(`${rowId}:`) && (
                            <Loader2 size={13} className="animate-spin text-gray-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
          <span>Total: {formulationsData?.meta?.total || 0}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={(formulationsData?.meta?.page || 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-200 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {formulationsData?.meta?.page || 1} /{' '}
              {Math.max(formulationsData?.meta?.pages || 1, 1)}
            </span>
            <button
              disabled={(formulationsData?.meta?.page || 1) >= (formulationsData?.meta?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-gray-200 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedFormulationId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Calculation Ledger</h3>
              <button
                onClick={() => setSelectedFormulationId(null)}
                className="p-2 hover:bg-gray-100 rounded"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {ledgerLoading ? (
              <div className="p-6 text-gray-500">
                <Loader2 className="animate-spin inline mr-2" size={16} />
                Loading ledger...
              </div>
            ) : !ledger ? (
              <div className="p-6 text-gray-500">Ledger not available.</div>
            ) : (
              <div className="p-4 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard label="Batch" value={ledger.batchName} compact />
                  <MetricCard label="Feed Type" value={ledger.feedType} compact />
                  <MetricCard
                    label="Quality Match"
                    value={asPercent(ledger.qualityMatchPercentage)}
                    compact
                  />
                  <MetricCard
                    label="Cost/kg"
                    value={asCurrency(
                      ledger.equationRows.find((row) => row.factId === 'eq.cost_per_kg')?.value || 0
                    )}
                    compact
                  />
                </div>

                <DataTable
                  title="Equation Rows"
                  headers={['Label', 'Equation', 'Value', 'Unit']}
                  rows={ledger.equationRows.map((row) => [
                    row.label,
                    row.equation,
                    row.value.toFixed(4),
                    row.unit,
                  ])}
                />

                <DataTable
                  title="Nutrient Rows"
                  headers={['Nutrient', 'Target', 'Actual', 'Status']}
                  rows={ledger.nutrientRows.map((row) => [
                    row.nutrient,
                    `${row.targetMin ?? '-'} to ${row.targetMax ?? '-'}`,
                    `${row.actual} ${row.unit}`,
                    row.status,
                  ])}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  compact = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        {icon}
      </div>
      <p className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-gray-900 mt-1`}>
        {value}
      </p>
    </div>
  );
}

function DataTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 text-left">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-t border-gray-100">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${index}-${cellIndex}`} className="px-4 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-400" colSpan={headers.length}>
                  No records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
