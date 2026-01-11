'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Loader2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Database,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Nutrient {
  protein: number;
  fat: number;
  fiber: number;
  ash: number;
  lysine: number;
  methionine: number;
  calcium: number;
  phosphorous: number;
}

interface Ingredient {
  _id: string;
  name: string;
  category: string;
  defaultPrice: number;
  bagWeight: number | null;
  specificGravity: number | null; // For liquids like Palm Oil (0.91)
  isAutoCalculated: boolean; // True for Vitamin C
  autoCalcRatio: number | null; // e.g., 0.0004 for 400mg/kg
  isActive: boolean;
  nutrients: Nutrient;
  constraints: { max_inclusion?: number; min_inclusion?: number };
}

const CATEGORIES = ['CARBOHYDRATE', 'PROTEIN', 'FIBER', 'MINERALS', 'OTHER'];

export default function IngredientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [viewingIngredient, setViewingIngredient] = useState<Ingredient | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients', search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      const { data } = await api.get(`/ingredients?${params.toString()}`);
      return data.ingredients as Ingredient[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Ingredient>) =>
      api.post('/admin/ingredients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ingredient> }) =>
      api.put(`/admin/ingredients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setIsModalOpen(false);
      setEditingIngredient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/ingredients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setDeletingId(null);
      if (viewingIngredient?._id === deletingId) {
        setViewingIngredient(null);
      }
    },
  });

  // Group by category for stats
  const categoryStats = CATEGORIES.map((cat) => ({
    name: cat,
    count: data?.filter((i) => i.category === cat).length || 0,
    active: data?.filter((i) => i.category === cat && i.isActive).length || 0,
  }));

  if (isLoading) {
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
              key={cat.name}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat.name ? '' : cat.name)
              }
              className={`p-4 rounded-xl border text-left transition-all ${
                categoryFilter === cat.name
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-primary/30'
              }`}
            >
              <p className="text-xs text-gray-500">{cat.name}</p>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-500">
            {data?.length || 0} ingredients
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px] md:min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price (₦/kg)</th>
                  <th className="px-6 py-4">Bag Weight</th>
                  <th className="px-6 py-4">Protein</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.map((ingredient) => (
                  <tr
                    key={ingredient._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      viewingIngredient?._id === ingredient._id
                        ? 'bg-primary/5'
                        : ''
                    }`}
                    onClick={() => setViewingIngredient(ingredient)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Database size={16} />
                        </div>
                        <span className="font-medium text-gray-900">
                          {ingredient.name}
                        </span>
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {data?.map((ingredient: Ingredient) => (
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
                    onClick={() => {
                      if (confirm('Delete this ingredient?'))
                        deleteMutation.mutate(ingredient._id);
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No ingredients found</p>
            </div>
          )}
        </div>
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
  onClose,
  onSubmit,
  isLoading,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
  onSubmit: (data: Partial<Ingredient>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: ingredient?.name || '',
    category: ingredient?.category || 'PROTEIN',
    defaultPrice: ingredient?.defaultPrice || 0,
    bagWeight: ingredient?.bagWeight || null,
    specificGravity: ingredient?.specificGravity || null,
    isAutoCalculated: ingredient?.isAutoCalculated || false,
    autoCalcRatio: ingredient?.autoCalcRatio || null,
    isActive: ingredient?.isActive ?? true,
    nutrients: ingredient?.nutrients || {
      protein: 0,
      fat: 0,
      fiber: 0,
      ash: 0,
      lysine: 0,
      methionine: 0,
      calcium: 0,
      phosphorous: 0,
    },
    constraints: ingredient?.constraints || {},
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
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
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

          {/* Special Properties */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Special Properties
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Specific Gravity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.specificGravity || ''}
                  placeholder="e.g., 0.91 for Palm Oil"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specificGravity: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For liquids (liters→kg)
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <input
                    type="checkbox"
                    checked={form.isAutoCalculated}
                    onChange={(e) =>
                      setForm({ ...form, isAutoCalculated: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Auto-Calculated
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Quantity computed automatically
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Auto-Calc Ratio
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.autoCalcRatio || ''}
                  placeholder="e.g., 0.0004 for 400mg/kg"
                  disabled={!form.isAutoCalculated}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      autoCalcRatio: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Qty = BatchWeight × Ratio
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Nutrient Composition (%)
            </h3>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
              {Object.entries(form.nutrients).map(([key, value]) => (
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
