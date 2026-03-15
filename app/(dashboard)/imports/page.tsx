'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';

type ImportRun = {
  _id: string;
  sourceFile: string;
  sourceVersion: string;
  status: 'previewed' | 'applied' | 'rolled_back' | 'failed';
  diffSummary: {
    standardsCreated: number;
    standardsUpdated: number;
    ingredientsCreated: number;
    ingredientsUpdated: number;
    flagged: number;
  };
  flaggedItems: Array<{
    entityType: 'ingredient' | 'standard';
    key: string;
    reasons: string[];
    severity: 'warning' | 'error';
  }>;
  changes: Array<{
    entityType: 'ingredient' | 'standard';
    key: string;
    action: 'create' | 'update' | 'skip';
    notes?: string[];
  }>;
  createdAt: string;
  appliedAt?: string;
  rolledBackAt?: string;
};

const statusClass: Record<ImportRun['status'], string> = {
  previewed: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
  rolled_back: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DataImportsPage() {
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-imports-poultry-workbook'],
    queryFn: async () => {
      const { data } = await api.get('/admin/imports/poultry-workbook');
      return data as { runs: ImportRun[] };
    },
  });

  const selectedRun = useMemo(() => {
    const runs = data?.runs || [];
    if (selectedRunId) {
      return runs.find((run) => run._id === selectedRunId) || runs[0] || null;
    }
    return runs[0] || null;
  }, [data?.runs, selectedRunId]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/imports/poultry-workbook/preview');
      return data.run as ImportRun;
    },
    onSuccess: (run) => {
      setSelectedRunId(run._id);
      queryClient.invalidateQueries({ queryKey: ['admin-imports-poultry-workbook'] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (runId?: string) => {
      const { data } = await api.post('/admin/imports/poultry-workbook/apply', {
        ...(runId ? { runId } : {}),
      });
      return data.run as ImportRun;
    },
    onSuccess: (run) => {
      setSelectedRunId(run._id);
      queryClient.invalidateQueries({ queryKey: ['admin-imports-poultry-workbook'] });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { data } = await api.post(`/admin/imports/poultry-workbook/rollback/${runId}`);
      return data.run as ImportRun;
    },
    onSuccess: (run) => {
      setSelectedRunId(run._id);
      queryClient.invalidateQueries({ queryKey: ['admin-imports-poultry-workbook'] });
    },
  });

  const isBusy =
    previewMutation.isPending || applyMutation.isPending || rollbackMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Data Imports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fish + poultry workbook preview, apply, and rollback operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching || isBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => previewMutation.mutate()}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {previewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Generate Preview
          </button>
          <button
            onClick={() => applyMutation.mutate(selectedRun?._id)}
            disabled={isBusy || !selectedRun || selectedRun.status === 'applied'}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {applyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Apply Preview
          </button>
          <button
            onClick={() => selectedRun && rollbackMutation.mutate(selectedRun._id)}
            disabled={isBusy || !selectedRun || selectedRun.status !== 'applied'}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {rollbackMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Rollback
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Import History</h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {(data?.runs || []).map((run) => (
                <button
                  key={run._id}
                  onClick={() => setSelectedRunId(run._id)}
                  className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    selectedRun?._id === run._id ? 'bg-primary/5' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{run.sourceVersion}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass[run.status]}`}>
                      {run.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{new Date(run.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-gray-600">
                    {run.diffSummary.standardsCreated + run.diffSummary.standardsUpdated} standards,{' '}
                    {run.diffSummary.ingredientsCreated + run.diffSummary.ingredientsUpdated} ingredients
                  </p>
                </button>
              ))}
              {(data?.runs || []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">No imports yet.</div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            {selectedRun ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedRun.sourceFile}</h2>
                      <p className="text-sm text-gray-500">Version {selectedRun.sourceVersion}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass[selectedRun.status]}`}>
                      {selectedRun.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <SummaryTile label="Std Created" value={selectedRun.diffSummary.standardsCreated} />
                    <SummaryTile label="Std Updated" value={selectedRun.diffSummary.standardsUpdated} />
                    <SummaryTile label="Ing Created" value={selectedRun.diffSummary.ingredientsCreated} />
                    <SummaryTile label="Ing Updated" value={selectedRun.diffSummary.ingredientsUpdated} />
                    <SummaryTile label="Flagged" value={selectedRun.diffSummary.flagged} tone="warning" />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Flagged Items</h3>
                    <span className="text-xs text-gray-500">{selectedRun.flaggedItems.length}</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {selectedRun.flaggedItems.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-gray-500">No flagged items.</p>
                    ) : (
                      selectedRun.flaggedItems.map((item, index) => (
                        <div key={`${item.key}-${index}`} className="border-b border-gray-100 px-4 py-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              size={16}
                              className={item.severity === 'error' ? 'text-red-500' : 'text-amber-500'}
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{item.entityType}: {item.key}</p>
                              <ul className="mt-1 list-disc pl-4 text-xs text-gray-600">
                                {item.reasons.map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Planned Changes</h3>
                    <span className="text-xs text-gray-500">{selectedRun.changes.length}</span>
                  </div>
                  <div className="max-h-[28rem] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Entity</th>
                          <th className="px-4 py-3">Key</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedRun.changes.map((change, index) => (
                          <tr key={`${change.key}-${index}`}>
                            <td className="px-4 py-3 text-gray-700">{change.entityType}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{change.key}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                                change.action === 'create'
                                  ? 'bg-green-100 text-green-700'
                                  : change.action === 'update'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                              }`}>
                                {change.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {change.notes && change.notes.length > 0
                                ? change.notes.join('; ')
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                Generate a preview to start migration.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'warning';
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${tone === 'warning' ? 'text-amber-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
