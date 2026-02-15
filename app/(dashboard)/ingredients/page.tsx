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
  Database,
  ArrowDownAZ,
  ArrowUpAZ,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDebounce } from '@/hooks/useDebounce';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { PaginationBar } from '@/components/ui/PaginationBar';

interface Nutrient {
  protein: number;
  fat: number;
  carbohydrate: number;
  energy: number;
  fiber: number;
  ash: number;
  lysine: number;
  methionine: number;
  calcium: number;
  phosphorous: number;
  phosphorusBioavailability: number;
}

interface Ingredient {
  _id: string;
  name: string;
  category: string;
  defaultPrice: number;
  bagWeight: number | null;
  specificGravity: number | null;
  isAutoCalculated: boolean;
  autoCalcRatio: number | null;
  isActive: boolean;
  nutrients: Nutrient;
  constraints: { max_inclusion?: number; min_inclusion?: number };
  tags: string[];
}

interface IngredientCategory {
  name: string;
  displayName: string;
}

type IngredientsResponse = {
  ingredients: Ingredient[];
  filteredTotal?: number;
  summary?: {
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    byCategoryActive?: Record<string, number>;
  };
  filterOptions?: {
    categories: string[];
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

type SortKey = 'name' | 'category' | 'price' | 'protein' | 'status';
type SortDirection = 'asc' | 'desc';

export default function IngredientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null,
  );
  const [viewingIngredient, setViewingIngredient] = useState<Ingredient | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: ingredientCategories = [] } = useQuery({
    queryKey: ['ingredient-categories'],
    queryFn: async () => {
      const { data } = await api.get('/ingredients/categories?type=ingredient');
      return (data.categories as IngredientCategory[]) || [];
    },
  });

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [
      'admin-ingredients',
      debouncedSearch,
      categoryFilter,
      statusFilter,
      sortKey,
      sortDirection,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) {
        params.append('active', statusFilter === 'active' ? 'true' : 'false');
      }
      params.append('sortKey', sortKey);
      params.append('sortDirection', sortDirection);
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      const { data } = await api.get(`/admin/ingredients?${params.toString()}`);
      return data as IngredientsResponse;
    },
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Ingredient>) =>
      api.post('/admin/ingredients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ingredient> }) =>
      api.put(`/admin/ingredients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setIsModalOpen(false);
      setEditingIngredient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/ingredients/${id}`),
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setDeletingId(null);
      if (viewingIngredient?._id === id) {
        setViewingIngredient(null);
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
      Promise.all(ids.map((id) => api.delete(`/admin/ingredients/${id}`))),
    onSuccess: (_response, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setSelectedIds(new Set());
      setIsBulkDeleting(false);
      if (viewingIngredient && ids.includes(viewingIngredient._id)) {
        setViewingIngredient(null);
      }
    },
  });

  const paginatedData = useMemo(
    () => data?.ingredients ?? [],
    [data?.ingredients],
  );
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

  const visibleSelectedCount = useMemo(
    () =>
      paginatedData.reduce(
        (count, ingredient) => count + (selectedIds.has(ingredient._id) ? 1 : 0),
        0,
      ),
    [paginatedData, selectedIds],
  );

  const handleSelectAll = () => {
    if (paginatedData.length === 0) return;
    if (visibleSelectedCount === paginatedData.length) {
      const next = new Set(selectedIds);
      paginatedData.forEach((ingredient) => next.delete(ingredient._id));
      setSelectedIds(next);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach((ingredient) => next.add(ingredient._id));
    setSelectedIds(next);
  };

  const categoryOptions = useMemo(() => {
    if (ingredientCategories.length > 0) {
      return ingredientCategories.map((category) => ({
        value: category.name,
        label: category.displayName || category.name,
      }));
    }

    const discovered = (
      data?.filterOptions?.categories ||
      Array.from(
        new Set(
          (data?.ingredients || [])
            .map((ingredient) => ingredient.category)
            .filter(Boolean),
        ),
      )
    ).sort((a, b) => a.localeCompare(b));

    return discovered.map((category) => ({ value: category, label: category }));
  }, [ingredientCategories, data?.filterOptions?.categories, data?.ingredients]);

  // Group by category for stats
  const categoryStats = categoryOptions.map((category) => ({
    value: category.value,
    label: category.label,
    count: data?.summary?.byCategory?.[category.value] || 0,
    active: data?.summary?.byCategoryActive?.[category.value] || 0,
  }));

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
          viewingIngredient ? 'lg:mr-[420px]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Ingredients
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage master ingredient list, pricing, and nutrition data
            </p>
          </div>
          <button
            onClick={() => {
              setEditingIngredient(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Add Ingredient</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryStats.map((cat) => (
            <button
              key={cat.value}
              onClick={() =>
                setCategoryFilter((prev) => {
                  const next = prev === cat.value ? '' : cat.value;
                  setPage(1);
                  return next;
                })
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                categoryFilter === cat.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-primary/30'
              }`}
            >
              <p className="text-xs text-gray-500">{cat.label}</p>
              <p className="text-xl font-bold text-gray-900">{cat.count}</p>
              <p className="text-xs text-gray-400">{cat.active} active</p>
            </button>
          ))}
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
              placeholder="Search ingredients..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
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
            <option value="archived">Archived</option>
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
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="price:asc">Price (Low-High)</option>
            <option value="price:desc">Price (High-Low)</option>
            <option value="protein:desc">Protein (High-Low)</option>
          </select>
          <div className="text-sm text-gray-500">
            {totalItems} ingredients
          </div>
        </div>

        {/* Desktop Table View */}
        <div
          className={`hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity ${
            isPlaceholderData ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px] md:min-w-0">
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
                      onClick={() => setSort('category')}
                    >
                      Category
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort('price')}
                    >
                      Price (₦/kg)
                    </button>
                  </th>
                  <th className="px-6 py-4">Bag Weight</th>
                  <th className="px-6 py-4">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => setSort('protein')}
                    >
                      Protein
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
                {paginatedData.map((ingredient) => (
                  <tr
                    key={ingredient._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      viewingIngredient?._id === ingredient._id
                        ? 'bg-primary/5'
                        : ''
                    }`}
                    onClick={() => setViewingIngredient(ingredient)}
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={selectedIds.has(ingredient._id)}
                        onChange={() => handleSelectOne(ingredient._id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Database size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 block truncate">
                            {ingredient.name}
                          </span>
                          {ingredient.tags && ingredient.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ingredient.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1 bg-gray-100 text-gray-400 rounded uppercase font-bold"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {ingredient.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      ₦{ingredient.defaultPrice?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {ingredient.bagWeight
                        ? `${ingredient.bagWeight} kg`
                        : 'Loose'}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {ingredient.nutrients?.protein?.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          ingredient.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {ingredient.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingIngredient(ingredient);
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(ingredient._id)}
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
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                      No ingredients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {paginatedData.map((ingredient: Ingredient) => (
            <div
              key={ingredient._id}
              onClick={() => setViewingIngredient(ingredient)}
              className={`bg-white p-4 rounded-xl border transition-all active:scale-[0.98] ${
                viewingIngredient?._id === ingredient._id
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <Database size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {ingredient.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      {ingredient.category}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    ingredient.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {ingredient.isActive ? 'Active' : 'Archived'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Price
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-900">
                    ₦{ingredient.defaultPrice?.toLocaleString()}/kg
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Protein
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {ingredient.nutrients?.protein?.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-gray-500">
                  {ingredient.bagWeight
                    ? `${ingredient.bagWeight}kg Bag`
                    : 'Loose Quantity'}
                </span>
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditingIngredient(ingredient);
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingId(ingredient._id)}
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
              <p className="text-gray-500 text-sm">No ingredients found</p>
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
          itemLabel="ingredients"
        />
      </div>

      {/* Right Drawer */}
      {viewingIngredient && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-in fade-in"
            onClick={() => setViewingIngredient(null)}
          />
          <IngredientDetailDrawer
            ingredient={viewingIngredient}
            onClose={() => setViewingIngredient(null)}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <IngredientModal
          ingredient={editingIngredient}
          categoryOptions={categoryOptions}
          onClose={() => {
            setIsModalOpen(false);
            setEditingIngredient(null);
          }}
          onSubmit={(data) => {
            if (editingIngredient)
              updateMutation.mutate({ id: editingIngredient._id, data });
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
        title="Delete Ingredient"
        message="Are you sure you want to delete this ingredient? This action cannot be undone."
        confirmText="Delete Ingredient"
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
        title={`Delete ${selectedIds.size} Ingredients?`}
        message="This will permanently remove all selected ingredients."
        confirmText="Delete All"
      />
    </div>
  );
}

function IngredientDetailDrawer({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white border-l border-gray-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {ingredient.name}
          </h2>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider mt-1 inline-block">
            {ingredient.category}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status */}
        <div className="flex">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
              ingredient.isActive
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            {ingredient.isActive ? 'Active Ingredient' : 'Archived'}
          </span>
        </div>

        {/* Pricing & Bag Info */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100/50">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            Pricing Details
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                Price per kg
              </p>
              <p className="text-xl font-bold text-gray-900 font-mono">
                ₦{ingredient.defaultPrice?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                Bag Weight
              </p>
              <p className="text-xl font-bold text-gray-900">
                {ingredient.bagWeight ? `${ingredient.bagWeight} kg` : 'Loose'}
              </p>
            </div>
          </div>
          {ingredient.bagWeight && (
            <div className="mt-4 pt-4 border-t border-gray-200/50">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                Price per Full Bag
              </p>
              <p className="text-2xl font-bold text-primary font-mono">
                ₦
                {(
                  ingredient.defaultPrice * ingredient.bagWeight
                ).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Nutrients */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            Nutrient Composition (%)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(ingredient.nutrients || {}).map(([key, value]) => (
              <div
                key={key}
                className="bg-white border border-gray-100 p-3 rounded-xl text-center shadow-sm hover:border-primary/20 transition-colors"
              >
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mb-1">
                  {key}
                </p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {typeof value === 'number' ? value.toFixed(1) : value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Special Properties */}
        {(ingredient.specificGravity || ingredient.isAutoCalculated) && (
          <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">
              Special Properties
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {ingredient.specificGravity && (
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                    Specific Gravity
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {ingredient.specificGravity}
                  </p>
                  <p className="text-[10px] text-blue-400 italic font-medium leading-tight">
                    Formula: Liters × {ingredient.specificGravity} = kg
                  </p>
                </div>
              )}
              {ingredient.isAutoCalculated && (
                <div className="space-y-1">
                  <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
                    Auto-Calc Ratio
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {ingredient.autoCalcRatio
                      ? `${(ingredient.autoCalcRatio * 1000).toFixed(0)}g/kg`
                      : 'Yes'}
                  </p>
                  <p className="text-[10px] text-blue-400 italic font-medium leading-tight">
                    Qty calculated from batch weight
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Constraints */}
        {(ingredient.constraints?.max_inclusion ||
          ingredient.constraints?.min_inclusion) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Inclusion Constraints
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {ingredient.constraints.min_inclusion !== undefined && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                    Min Inclusion
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {ingredient.constraints.min_inclusion}%
                  </p>
                </div>
              )}
              {ingredient.constraints.max_inclusion !== undefined && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                    Max Inclusion
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {ingredient.constraints.max_inclusion}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100/50">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">
              Ingredient ID
            </span>
            <span className="font-mono text-[10px] text-gray-400 text-center break-all uppercase">
              {ingredient._id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IngredientModal({
  ingredient,
  categoryOptions,
  onClose,
  onSubmit,
  isLoading,
}: {
  ingredient: Ingredient | null;
  categoryOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSubmit: (data: Partial<Ingredient>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: ingredient?.name || '',
    category: ingredient?.category || categoryOptions[0]?.value || '',
    defaultPrice: ingredient?.defaultPrice || 0,
    bagWeight: ingredient?.bagWeight || null,
    specificGravity: ingredient?.specificGravity || null,
    isAutoCalculated: ingredient?.isAutoCalculated || false,
    autoCalcRatio: ingredient?.autoCalcRatio || null,
    isActive: ingredient?.isActive ?? true,
    nutrients: ingredient?.nutrients || {
      protein: 0,
      fat: 0,
      carbohydrate: 0,
      energy: 0,
      fiber: 0,
      ash: 0,
      lysine: 0,
      methionine: 0,
      calcium: 0,
      phosphorous: 0,
      phosphorusBioavailability: 1.0,
    },
    constraints: ingredient?.constraints || {},
    tags: ingredient?.tags || [],
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {ingredient ? 'Edit Ingredient' : 'Add Ingredient'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="" disabled>
                  Select category
                </option>
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price (₦/kg)
              </label>
              <input
                type="number"
                value={form.defaultPrice}
                onChange={(e) =>
                  setForm({ ...form, defaultPrice: Number(e.target.value) })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Bag Weight (kg)
              </label>
              <input
                type="number"
                value={form.bagWeight || ''}
                placeholder="Leave empty if sold loose"
                onChange={(e) =>
                  setForm({
                    ...form,
                    bagWeight: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>

          {/* Tags & Phosphorus Bioavailability */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Scientific Markers & Tags
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phosphorus Bioavailability (0.0 - 1.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.nutrients.phosphorusBioavailability}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nutrients: {
                        ...form.nutrients,
                        phosphorusBioavailability: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Plant sources: 0.3 | Animal/DCP: 1.0
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={form.tags.join(', ')}
                  placeholder="ANIMAL_PROTEIN, DCP, etc."
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for grouped constraints (e.g., ANIMAL_PROTEIN)
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Nutrient Composition (%)
            </h3>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
              {Object.entries(form.nutrients)
                .filter(([key]) => key !== 'phosphorusBioavailability')
                .map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">
                      {key}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nutrients: {
                            ...form.nutrients,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-gray-700"
            >
              Active
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
              {ingredient ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
