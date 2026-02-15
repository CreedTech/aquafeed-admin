'use client';

import { useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Loader2,
  Plus,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PaginationBar } from '@/components/ui/PaginationBar';

interface Ingredient {
  _id: string;
  name: string;
}

interface Rule {
  _id: string;
  originalIngredientId: { _id: string; name: string };
  alternativeIngredientId: { _id: string; name: string };
  feedType: 'fish' | 'poultry' | 'both';
  maxBlendPercent: number;
  notes?: string;
  isActive: boolean;
}

interface RuleForm {
  originalIngredientId: string;
  alternativeIngredientId: string;
  feedType: 'fish' | 'poultry' | 'both';
  maxBlendPercent: number;
  notes?: string;
  isActive: boolean;
}

type SortKey =
  | 'original'
  | 'alternative'
  | 'feedType'
  | 'maxBlendPercent'
  | 'status';
type SortDirection = 'asc' | 'desc';

type RulesResponse = {
  rules: Rule[];
  filteredTotal?: number;
  summary?: {
    total: number;
    active: number;
    inactive: number;
    fish: number;
    poultry: number;
    both: number;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export default function AlternativesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [feedTypeFilter, setFeedTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('original');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: ingredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: ['admin-ingredients-lite'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ingredients');
      return (data.ingredients as Ingredient[]) || [];
    },
  });

  const {
    data: rulesResponse,
    isLoading: rulesLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: [
      'admin-alternative-rules',
      debouncedSearch,
      feedTypeFilter,
      statusFilter,
      sortKey,
      sortDirection,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (feedTypeFilter) params.append('feedType', feedTypeFilter);
      if (statusFilter) {
        params.append('active', statusFilter === 'active' ? 'true' : 'false');
      }
      params.append('sortKey', sortKey);
      params.append('sortDirection', sortDirection);
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const { data } = await api.get(`/admin/alternatives/rules?${params.toString()}`);
      return data as RulesResponse;
    },
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: RuleForm) =>
      api.post('/admin/alternatives/rules', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alternative-rules'] });
      setIsOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RuleForm }) =>
      api.put(`/admin/alternatives/rules/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alternative-rules'] });
      setIsOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/alternatives/rules/${id}`),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-alternative-rules'] });
      setDeletingId(null);
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => api.delete(`/admin/alternatives/rules/${id}`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alternative-rules'] });
      setIsBulkDeleting(false);
      setSelectedIds(new Set());
    },
  });

  const paginatedRules = useMemo(
    () => rulesResponse?.rules ?? [],
    [rulesResponse?.rules],
  );
  const totalItems =
    rulesResponse?.meta?.total ??
    rulesResponse?.filteredTotal ??
    paginatedRules.length;
  const totalPages = Math.max(1, rulesResponse?.meta?.pages ?? 1);
  const currentPage = Math.min(page, totalPages);

  const visibleSelectedCount = useMemo(
    () =>
      paginatedRules.reduce(
        (count, rule) => count + (selectedIds.has(rule._id) ? 1 : 0),
        0,
      ),
    [paginatedRules, selectedIds],
  );

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (paginatedRules.length === 0) return;
    if (visibleSelectedCount === paginatedRules.length) {
      const next = new Set(selectedIds);
      paginatedRules.forEach((rule) => next.delete(rule._id));
      setSelectedIds(next);
      return;
    }
    const next = new Set(selectedIds);
    paginatedRules.forEach((rule) => next.add(rule._id));
    setSelectedIds(next);
  };

  const stats = {
    total: rulesResponse?.summary?.total || 0,
    active: rulesResponse?.summary?.active || 0,
    fish: rulesResponse?.summary?.fish || 0,
    poultry: rulesResponse?.summary?.poultry || 0,
    both: rulesResponse?.summary?.both || 0,
  };

  if ((rulesLoading && !rulesResponse) || ingredientsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Alternative Rules
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure one-to-one ingredient alternatives for fish and poultry formulation.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setIsOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors w-full sm:w-auto"
        >
          <Plus size={18} />
          Add Rule
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Total Rules
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Active
          </p>
          <p className="text-2xl font-bold text-primary">{stats.active}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Fish
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.fish}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Poultry
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.poultry}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Both
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.both}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by original or alternative ingredient..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        <select
          value={feedTypeFilter}
          onChange={(e) => {
            setFeedTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">All Feed Types</option>
          <option value="fish">Fish</option>
          <option value="poultry">Poultry</option>
          <option value="both">Both</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={`${sortKey}:${sortDirection}`}
          onChange={(e) => {
            const [key, direction] = e.target.value.split(':') as [
              SortKey,
              SortDirection,
            ];
            setSortKey(key);
            setSortDirection(direction);
            setPage(1);
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="original:asc">Original (A-Z)</option>
          <option value="alternative:asc">Alternative (A-Z)</option>
          <option value="maxBlendPercent:desc">Max Blend (High-Low)</option>
        </select>
        <div className="text-sm text-gray-500">{totalItems} rules</div>
      </div>

      <div
        className={`hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity ${
          isPlaceholderData ? 'opacity-60' : 'opacity-100'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[820px] md:min-w-0">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={
                      paginatedRules.length > 0 &&
                      visibleSelectedCount === paginatedRules.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('original')}
                  >
                    Original
                    {sortKey === 'original' && sortDirection === 'asc' ? (
                      <ArrowDownAZ size={14} />
                    ) : null}
                    {sortKey === 'original' && sortDirection === 'desc' ? (
                      <ArrowUpAZ size={14} />
                    ) : null}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('alternative')}
                  >
                    Alternative
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('feedType')}
                  >
                    Feed Type
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('maxBlendPercent')}
                  >
                    Max Blend
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('status')}
                  >
                    Status
                  </button>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRules.map((rule) => (
                <tr key={rule._id}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedIds.has(rule._id)}
                      onChange={() => handleSelectOne(rule._id)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{rule.originalIngredientId?.name}</td>
                  <td className="px-6 py-4 text-gray-700">{rule.alternativeIngredientId?.name}</td>
                  <td className="px-6 py-4 uppercase text-xs font-semibold">{rule.feedType}</td>
                  <td className="px-6 py-4">{rule.maxBlendPercent}%</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                        rule.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(rule);
                          setIsOpen(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingId(rule._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedRules.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No alternative rules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:hidden space-y-4">
        {paginatedRules.map((rule) => (
          <div
            key={rule._id}
            className="bg-white p-4 rounded-xl border border-gray-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">
                  {rule.originalIngredientId?.name}
                </p>
                <p className="text-xs text-gray-500">
                  Alternative: {rule.alternativeIngredientId?.name}
                </p>
              </div>
              <span
                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  rule.isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {rule.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
              <span className="uppercase font-semibold">{rule.feedType}</span>
              <span className="font-mono">{rule.maxBlendPercent}% max</span>
            </div>
            <div className="flex justify-end gap-1 mt-3">
              <button
                onClick={() => {
                  setEditing(rule);
                  setIsOpen(true);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeletingId(rule._id)}
                className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {paginatedRules.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">No alternative rules found</p>
          </div>
        )}
      </div>

      <PaginationBar
        page={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        itemLabel="rules"
      />

      {isOpen && (
        <RuleModal
          ingredients={ingredients}
          rule={editing}
          isLoading={createMutation.isPending || updateMutation.isPending}
          onClose={() => {
            setIsOpen(false);
            setEditing(null);
          }}
          onSubmit={(payload) => {
            if (editing) {
              updateMutation.mutate({ id: editing._id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        isLoading={deleteMutation.isPending}
        title="Delete Alternative Rule"
        message="Are you sure you want to delete this alternative rule? This action cannot be undone."
        confirmText="Delete Rule"
      />

      <BulkActionToolbar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          {
            label: 'Delete Selected',
            onClick: () => setIsBulkDeleting(true),
            variant: 'danger',
          },
        ]}
      />
      <ConfirmModal
        isOpen={isBulkDeleting}
        onClose={() => setIsBulkDeleting(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        isLoading={bulkDeleteMutation.isPending}
        title={`Delete ${selectedIds.size} Rules?`}
        message="This will permanently remove all selected alternative rules."
        confirmText="Delete All"
      />
    </div>
  );
}

function RuleModal({
  ingredients,
  rule,
  isLoading,
  onClose,
  onSubmit,
}: {
  ingredients: Ingredient[];
  rule: Rule | null;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (payload: RuleForm) => void;
}) {
  const [form, setForm] = useState<RuleForm>({
    originalIngredientId: rule?.originalIngredientId?._id || '',
    alternativeIngredientId: rule?.alternativeIngredientId?._id || '',
    feedType: rule?.feedType || 'both',
    maxBlendPercent: rule?.maxBlendPercent || 100,
    notes: rule?.notes || '',
    isActive: rule?.isActive ?? true,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{rule ? 'Edit Rule' : 'Add Rule'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Original Ingredient</label>
            <select
              required
              value={form.originalIngredientId}
              onChange={(e) => setForm({ ...form, originalIngredientId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">Select ingredient</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient._id} value={ingredient._id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Alternative Ingredient</label>
            <select
              required
              value={form.alternativeIngredientId}
              onChange={(e) => setForm({ ...form, alternativeIngredientId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">Select ingredient</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient._id} value={ingredient._id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Feed Type</label>
              <select
                value={form.feedType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    feedType: e.target.value as 'fish' | 'poultry' | 'both',
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
              >
                <option value="both">Both</option>
                <option value="fish">Fish</option>
                <option value="poultry">Poultry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Blend %</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.maxBlendPercent}
                onChange={(e) =>
                  setForm({ ...form, maxBlendPercent: Number(e.target.value) })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Rule is active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
