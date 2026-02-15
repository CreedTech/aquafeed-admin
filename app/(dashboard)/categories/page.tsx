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
  Activity,
  Database,
  Edit2,
  Fish,
  Loader2,
  Plus,
  Search,
  Shapes,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { useDebounce } from '@/hooks/useDebounce';
import { PaginationBar } from '@/components/ui/PaginationBar';

interface Category {
  _id: string;
  name: string;
  displayName: string;
  type: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

type SortKey = 'name' | 'displayName' | 'type' | 'sortOrder' | 'status';
type SortDirection = 'asc' | 'desc';

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge: string;
  }
> = {
  ingredient: {
    label: 'Ingredient',
    icon: Database,
    badge: 'bg-blue-50 text-blue-700',
  },
  fish_type: {
    label: 'Fish Type',
    icon: Fish,
    badge: 'bg-emerald-50 text-emerald-700',
  },
  stage: {
    label: 'Feed Stage',
    icon: Activity,
    badge: 'bg-amber-50 text-amber-700',
  },
  other: {
    label: 'Other',
    icon: Shapes,
    badge: 'bg-gray-100 text-gray-700',
  },
};

const DEFAULT_TYPE_STYLE = {
  label: 'Other',
  icon: Shapes,
  badge: 'bg-gray-100 text-gray-700',
};

type CategoriesResponse = {
  categories: Category[];
  filteredTotal?: number;
  summary?: {
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  };
  filterOptions?: {
    types: string[];
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

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [
      'admin-categories',
      debouncedSearch,
      typeFilter,
      statusFilter,
      sortKey,
      sortDirection,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) {
        params.append('active', statusFilter === 'active' ? 'true' : 'false');
      }
      params.append('sortKey', sortKey);
      params.append('sortDirection', sortDirection);
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const { data } = await api.get(`/admin/categories?${params.toString()}`);
      return data as CategoriesResponse;
    },
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Category>) => api.post('/admin/categories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Category> }) =>
      api.put(`/admin/categories/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsModalOpen(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
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
      Promise.all(ids.map((id) => api.delete(`/admin/categories/${id}`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setSelectedIds(new Set());
      setIsBulkDeleting(false);
    },
  });

  const paginatedData = data?.categories || [];
  const totalItems = data?.meta?.total ?? data?.filteredTotal ?? paginatedData.length;
  const totalPages = Math.max(1, data?.meta?.pages ?? 1);
  const currentPage = Math.min(page, totalPages);

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

  const allCurrentSelected =
    paginatedData.length > 0 &&
    paginatedData.every((category) => selectedIds.has(category._id));

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      paginatedData.forEach((category) => next.delete(category._id));
    } else {
      paginatedData.forEach((category) => next.add(category._id));
    }
    setSelectedIds(next);
  };

  const types = useMemo(() => data?.filterOptions?.types || [], [data?.filterOptions?.types]);
  const stats = {
    total: data?.summary?.total || 0,
    active: data?.summary?.active || 0,
    inactive: data?.summary?.inactive || 0,
    ingredient: data?.summary?.byType?.ingredient || 0,
    fishType: data?.summary?.byType?.fish_type || 0,
    stage: data?.summary?.byType?.stage || 0,
  };

  if (isLoading && !data) {
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
            Category Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Centralize ingredient groups, fish types, and feeding stages used
            across app and admin.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors w-full sm:w-auto"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Active" value={stats.active} highlight />
        <StatCard label="Inactive" value={stats.inactive} />
        <StatCard label="Ingredient" value={stats.ingredient} />
        <StatCard label="Fish Type" value={stats.fishType} />
        <StatCard label="Stage" value={stats.stage} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
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
            placeholder="Search by code name, label or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="w-full lg:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">All Types</option>
          {types.map((value) => {
            const config = TYPE_CONFIG[value] || DEFAULT_TYPE_STYLE;
            return (
              <option key={value} value={value}>
                {config.label}
              </option>
            );
          })}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full lg:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
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
          className="w-full lg:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="name:asc">Code Name (A-Z)</option>
          <option value="name:desc">Code Name (Z-A)</option>
          <option value="displayName:asc">Label (A-Z)</option>
          <option value="sortOrder:asc">Sort Order (Low-High)</option>
          <option value="sortOrder:desc">Sort Order (High-Low)</option>
        </select>
      </div>

      <div
        className={`hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity ${
          isPlaceholderData ? 'opacity-60' : 'opacity-100'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[980px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={allCurrentSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('name')}
                  >
                    Code Name
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
                    onClick={() => setSort('displayName')}
                  >
                    Display Label
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('type')}
                  >
                    Type
                  </button>
                </th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setSort('sortOrder')}
                  >
                    Sort Order
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
              {paginatedData.map((category) => {
                const typeConfig =
                  TYPE_CONFIG[category.type] || DEFAULT_TYPE_STYLE;
                const TypeIcon = typeConfig.icon;
                return (
                  <tr key={category._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedIds.has(category._id)}
                        onChange={() => handleSelectOne(category._id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-gray-400" />
                        <span className="font-semibold text-gray-900">
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{category.displayName}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${typeConfig.badge}`}
                      >
                        <TypeIcon size={12} />
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-[280px] truncate">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">
                      {category.sortOrder}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          category.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(category);
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(category._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                    No categories match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sm:hidden space-y-4">
        {paginatedData.map((category) => {
          const typeConfig = TYPE_CONFIG[category.type] || DEFAULT_TYPE_STYLE;
          const TypeIcon = typeConfig.icon;
          return (
            <div key={category._id} className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{category.displayName}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{category.name}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    category.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold ${typeConfig.badge}`}
                >
                  <TypeIcon size={12} />
                  {typeConfig.label}
                </span>
                <span className="text-xs text-gray-500">Order {category.sortOrder}</span>
              </div>

              {category.description && (
                <p className="text-xs text-gray-500 mt-3">{category.description}</p>
              )}

              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setEditingCategory(category);
                    setIsModalOpen(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setDeletingId(category._id)}
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {paginatedData.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">No categories found</p>
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
        itemLabel="categories"
      />

      {isModalOpen && (
        <CategoryModal
          category={editingCategory}
          typeOptions={types}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCategory(null);
          }}
          onSubmit={(payload) => {
            if (editingCategory) {
              updateMutation.mutate({ id: editingCategory._id, payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        isLoading={deleteMutation.isPending}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete Category"
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
        title={`Delete ${selectedIds.size} Categories?`}
        message="This will permanently remove all selected categories."
        confirmText="Delete All"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
        {label}
      </p>
      <p className={`text-2xl font-bold ${highlight ? 'text-primary' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function CategoryModal({
  category,
  typeOptions,
  onClose,
  onSubmit,
  isLoading,
}: {
  category: Category | null;
  typeOptions: string[];
  onClose: () => void;
  onSubmit: (payload: Partial<Category>) => void;
  isLoading: boolean;
}) {
  const allTypeOptions = Array.from(
    new Set(['ingredient', 'fish_type', 'stage', 'other', ...typeOptions]),
  );

  const [form, setForm] = useState({
    name: category?.name || '',
    displayName: category?.displayName || '',
    type: category?.type || 'ingredient',
    description: category?.description || '',
    sortOrder: category?.sortOrder || 0,
    isActive: category?.isActive ?? true,
  });

  const handleSubmit = () => {
    const name = form.name.trim();
    const displayName = form.displayName.trim() || name;
    onSubmit({
      name,
      displayName,
      type: form.type,
      description: form.description.trim(),
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Code Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. PROTEIN"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Display Label
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                required
                placeholder="e.g. Protein Sources"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <input
                type="text"
                list="category-type-options"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="e.g. ingredient, stage"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
              <datalist id="category-type-options">
                {allTypeOptions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Category is active
            </span>
          </label>

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
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
