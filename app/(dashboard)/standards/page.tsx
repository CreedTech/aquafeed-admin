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
  Loader2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Target,
  Activity,
  ArrowDownAZ,
  ArrowUpAZ,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PaginationBar } from '@/components/ui/PaginationBar';

interface Nutrient {
  min: number;
  max: number;
}

interface FeedStandard {
  _id: string;
  name: string;
  feedType?: 'fish' | 'poultry';
  feedCategory: 'Catfish' | 'Poultry';
  poultryType?: 'Broiler' | 'Layer';
  fishSubtype?: string;
  stage: string;
  description?: string;
  targetNutrients: {
    protein: Nutrient;
    fat: Nutrient;
    carbohydrate?: Nutrient;
    energy?: Nutrient;
    fiber: Nutrient;
    ash: Nutrient;
    lysine: Nutrient;
    methionine: Nutrient;
    calcium: Nutrient;
    phosphorous: Nutrient;
  };
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface StageCategory {
  _id: string;
  name: string;
  displayName: string;
}

type StandardsResponse = {
  standards: FeedStandard[];
  filteredTotal?: number;
  summary?: {
    total: number;
    fish: number;
    poultry: number;
    active: number;
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

type SortKey = 'name' | 'feedType' | 'stage' | 'protein' | 'status';
type SortDirection = 'asc' | 'desc';

export default function StandardsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [feedTypeFilter, setFeedTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<FeedStandard | null>(
    null,
  );
  const [viewingStandard, setViewingStandard] = useState<FeedStandard | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: stageCategories = [] } = useQuery({
    queryKey: ['admin-stage-categories'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories?type=stage');
      return (data.categories as StageCategory[]) || [];
    },
  });

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [
      'admin-standards',
      debouncedSearch,
      feedTypeFilter,
      stageFilter,
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
      if (stageFilter) params.append('stage', stageFilter);
      if (statusFilter) {
        params.append('active', statusFilter === 'active' ? 'true' : 'false');
      }
      params.append('sortKey', sortKey);
      params.append('sortDirection', sortDirection);
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      const { data } = await api.get(`/admin/standards?${params.toString()}`);
      return data as StandardsResponse;
    },
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<FeedStandard>) =>
      api.post('/admin/standards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-standards'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeedStandard> }) =>
      api.put(`/admin/standards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-standards'] });
      setIsModalOpen(false);
      setEditingStandard(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/standards/${id}`),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-standards'] });
      setDeletingId(null);
      if (viewingStandard?._id === id) {
        setViewingStandard(null);
      }
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
      Promise.all(ids.map((id) => api.delete(`/admin/standards/${id}`))),
    onSuccess: (_response, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin-standards'] });
      setSelectedIds(new Set());
      setIsBulkDeleting(false);
      if (viewingStandard && ids.includes(viewingStandard._id)) {
        setViewingStandard(null);
      }
    },
  });

  const paginatedData = useMemo(
    () => data?.standards ?? [],
    [data?.standards],
  );
  const totalItems = data?.meta?.total ?? data?.filteredTotal ?? paginatedData.length;
  const totalPages = Math.max(1, data?.meta?.pages ?? 1);
  const currentPage = Math.min(page, totalPages);

  const stageOptions = useMemo(() => {
    if (stageCategories.length > 0) {
      return stageCategories.map((stage) => ({
        value: stage.displayName || stage.name,
        label: stage.displayName || stage.name,
      }));
    }

    const discovered = Array.from(
      new Set((data?.standards || []).map((standard) => standard.stage).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return discovered.map((stage) => ({ value: stage, label: stage }));
  }, [data?.standards, stageCategories]);

  const visibleSelectedCount = useMemo(
    () =>
      paginatedData.reduce(
        (count, standard) => count + (selectedIds.has(standard._id) ? 1 : 0),
        0,
      ),
    [paginatedData, selectedIds],
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
    if (paginatedData.length === 0) return;
    if (visibleSelectedCount === paginatedData.length) {
      const next = new Set(selectedIds);
      paginatedData.forEach((standard) => next.delete(standard._id));
      setSelectedIds(next);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach((standard) => next.add(standard._id));
    setSelectedIds(next);
  };

  // Stats
  const stats = {
    total: data?.summary?.total || 0,
    fish: data?.summary?.fish || 0,
    poultry: data?.summary?.poultry || 0,
    active: data?.summary?.active || 0,
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex relative">
      <div
        className={`flex-1 space-y-6 transition-all ${
          viewingStandard ? 'lg:mr-[450px]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Feed Standards
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage nutritional standards for feed formulations
            </p>
          </div>
          <button
            onClick={() => {
              setEditingStandard(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Add Standard</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Total Standards</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Fish</p>
            <p className="text-2xl font-bold text-gray-900">{stats.fish}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Poultry</p>
            <p className="text-2xl font-bold text-gray-900">{stats.poultry}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
        </div>

        {/* Toolbar */}
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
              placeholder="Search standards..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={feedTypeFilter}
              onChange={(e) => {
                setFeedTypeFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:w-[160px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="">All Feed Types</option>
              <option value="fish">Fish</option>
              <option value="poultry">Poultry</option>
            </select>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:w-[140px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="">All Stages</option>
              {stageOptions.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:w-[140px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
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
              className="flex-1 sm:w-[180px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="name:asc">Name (A-Z)</option>
              <option value="name:desc">Name (Z-A)</option>
              <option value="stage:asc">Stage (A-Z)</option>
              <option value="protein:desc">Protein Min (High-Low)</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div
          className={`hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity ${
            isPlaceholderData ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px] lg:min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={
                        paginatedData.length > 0 &&
                        visibleSelectedCount === paginatedData.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort('name')}
                    >
                      Name
                      {sortKey === 'name' && sortDirection === 'asc' ? (
                        <ArrowDownAZ size={14} />
                      ) : null}
                      {sortKey === 'name' && sortDirection === 'desc' ? (
                        <ArrowUpAZ size={14} />
                      ) : null}
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
                      onClick={() => setSort('stage')}
                    >
                      Stage
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort('protein')}
                    >
                      Protein Range
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
                {paginatedData.map((standard) => (
                  <tr
                    key={standard._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      viewingStandard?._id === standard._id
                        ? 'bg-primary/5'
                        : ''
                    }`}
                    onClick={() => setViewingStandard(standard)}
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedIds.has(standard._id)}
                        onChange={() => handleSelectOne(standard._id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Target size={16} />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {standard.name}
                          </span>
                          {standard.isDefault && (
                            <span className="ml-2 text-xs text-primary">
                              ★ Default
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {(standard.feedType || '').toLowerCase() === 'poultry' ||
                        standard.feedCategory === 'Poultry'
                          ? `Poultry${standard.poultryType ? ` (${standard.poultryType})` : ''}`
                          : `Fish${standard.fishSubtype ? ` (${standard.fishSubtype})` : ''}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        <Activity size={12} />
                        {standard.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {standard.targetNutrients?.protein?.min}% -{' '}
                      {standard.targetNutrients?.protein?.max}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          standard.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {standard.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingStandard(standard);
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(standard._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      No standards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {paginatedData.map((standard: FeedStandard) => (
            <div
              key={standard._id}
              onClick={() => setViewingStandard(standard)}
              className={`bg-white p-4 rounded-xl border transition-all active:scale-[0.98] ${
                viewingStandard?._id === standard._id
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <Target size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {standard.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {standard.isDefault && (
                        <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                          ★ Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    standard.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {standard.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase">
                  {(standard.feedType || '').toLowerCase() === 'poultry' ||
                  standard.feedCategory === 'Poultry'
                    ? `Poultry${standard.poultryType ? ` (${standard.poultryType})` : ''}`
                    : `Fish${standard.fishSubtype ? ` (${standard.fishSubtype})` : ''}`}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-700 text-[10px] font-bold uppercase">
                  <Activity size={10} />
                  {standard.stage}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Protein Range
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-900">
                    {standard.targetNutrients?.protein?.min}% -{' '}
                    {standard.targetNutrients?.protein?.max}%
                  </p>
                </div>
                <div
                  className="flex items-center justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditingStandard(standard);
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingId(standard._id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {paginatedData.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No standards found</p>
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
          itemLabel="standards"
        />
      </div>

      {/* Details Side Panel */}
      {viewingStandard && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-in fade-in"
            onClick={() => setViewingStandard(null)}
          />
          <StandardDetailDrawer
            standard={viewingStandard}
            onClose={() => setViewingStandard(null)}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <StandardModal
          standard={editingStandard}
          onClose={() => {
            setIsModalOpen(false);
            setEditingStandard(null);
          }}
          onSubmit={(data) => {
            if (editingStandard)
              updateMutation.mutate({ id: editingStandard._id, data });
            else createMutation.mutate(data);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        isLoading={deleteMutation.isPending}
        title="Delete Standard"
        message="Are you sure you want to delete this standard? This action cannot be undone."
        confirmText="Delete Standard"
      />

      {/* Bulk Toolbar + Modal */}
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
        title={`Delete ${selectedIds.size} Standards?`}
        message="This will permanently remove all selected standards."
        confirmText="Delete All"
      />
    </div>
  );
}

function StandardDetailDrawer({
  standard,
  onClose,
}: {
  standard: FeedStandard;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-gray-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {standard.name}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
              {(standard.feedType || '').toLowerCase() === 'poultry' ||
              standard.feedCategory === 'Poultry'
                ? `Poultry${standard.poultryType ? ` - ${standard.poultryType}` : ''}`
                : `Fish${standard.fishSubtype ? ` - ${standard.fishSubtype}` : ''}`}
            </span>
            <span className="text-gray-300">/</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
              {standard.stage}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status & Default Badge */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
              standard.isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
          >
            {standard.isActive ? 'Active Status' : 'Inactive'}
          </span>
          {standard.isDefault && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-100">
              ★ Default Standard
            </span>
          )}
        </div>

        {/* Description */}
        {standard.description && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100/50 italic">
            <p className="text-sm text-gray-600 leading-relaxed">
              &ldquo;{standard.description}&rdquo;
            </p>
          </div>
        )}

        {/* Target Nutrients */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            Target Nutrient Ranges (%)
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(standard.targetNutrients || {}).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-primary/20 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                    {key}
                  </span>
                  <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 gap-3">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                        Min
                      </p>
                      <p className="font-mono text-sm font-bold text-gray-900">
                        {value?.min ?? 0}%
                      </p>
                    </div>
                    <div className="text-gray-300 font-light">|</div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                        Max
                      </p>
                      <p className="font-mono text-sm font-bold text-gray-900">
                        {value?.max ?? 0}%
                      </p>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-bold uppercase tracking-wider">
              Created Date
            </span>
            <span className="text-gray-700 font-medium">
              {new Date(standard.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="border-t border-gray-200/50 pt-3 flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">
              Standard Unique Identifier
            </span>
            <span className="font-mono text-[10px] text-gray-400 text-center break-all uppercase">
              {standard._id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StandardModal({
  standard,
  onClose,
  onSubmit,
  isLoading,
}: {
  standard: FeedStandard | null;
  onClose: () => void;
  onSubmit: (data: Partial<FeedStandard>) => void;
  isLoading: boolean;
}) {
  const defaultNutrients = {
    protein: { min: 0, max: 0 },
    fat: { min: 0, max: 0 },
    fiber: { min: 0, max: 0 },
    ash: { min: 0, max: 0 },
    lysine: { min: 0, max: 0 },
    methionine: { min: 0, max: 0 },
    calcium: { min: 0, max: 0 },
    phosphorous: { min: 0, max: 0 },
  };

  const [form, setForm] = useState({
    name: standard?.name || '',
    feedCategory: standard?.feedCategory || 'Catfish',
    poultryType: standard?.poultryType || 'Broiler',
    stage: standard?.stage || 'Fry',
    description: standard?.description || '',
    isActive: standard?.isActive ?? true,
    isDefault: standard?.isDefault ?? false,
    targetNutrients: standard?.targetNutrients || {
      ...defaultNutrients,
      carbohydrate: { min: 0, max: 0 },
      energy: { min: 0, max: 0 },
    },
  });

  const updateNutrient = (key: string, field: 'min' | 'max', value: number) => {
    setForm({
      ...form,
      targetNutrients: {
        ...form.targetNutrients,
        [key]: {
          ...form.targetNutrients[key as keyof typeof form.targetNutrients],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {standard ? 'Edit Standard' : 'Add Standard'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="p-6 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Feed Category
              </label>
              <select
                value={form.feedCategory}
                onChange={(e) =>
                  setForm({
                    ...form,
                    feedCategory: e.target.value as 'Catfish' | 'Poultry',
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="Catfish">Fish</option>
                <option value="Poultry">Poultry</option>
              </select>
            </div>
            {form.feedCategory === 'Poultry' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Poultry Type
                </label>
                <select
                  value={form.poultryType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      poultryType: e.target.value as 'Broiler' | 'Layer',
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="Broiler">Broiler</option>
                  <option value="Layer">Layer</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Stage
              </label>
              {form.feedCategory === 'Catfish' ? (
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="Fry">Fry</option>
                  <option value="Fingerling">Fingerling</option>
                  <option value="Grower">Grower</option>
                  <option value="Finisher">Finisher</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  placeholder="Starter, Finisher, etc."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Target Nutrient Ranges (%)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(form.targetNutrients).map((key) => (
                <div key={key} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500 capitalize">
                    {key}
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      value={
                        form.targetNutrients[
                          key as keyof typeof form.targetNutrients
                        ]?.min || ''
                      }
                      onChange={(e) =>
                        updateNutrient(key, 'min', Number(e.target.value))
                      }
                      className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      value={
                        form.targetNutrients[
                          key as keyof typeof form.targetNutrients
                        ]?.max || ''
                      }
                      onChange={(e) =>
                        updateNutrient(key, 'max', Number(e.target.value))
                      }
                      className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Default Standard
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={16} />}
              {standard ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
