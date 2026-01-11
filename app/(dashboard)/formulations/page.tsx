'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Loader2,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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

interface IngredientUsed {
  ingredientId: { _id: string; name: string };
  name: string;
  qtyKg: number;
  bags: number;
  priceAtMoment: number;
  nutrientsAtMoment: Nutrient;
}

interface Alternative {
  suggestion: string;
  savings: number;
}

interface Formulation {
  _id: string;
  batchName: string;
  targetWeightKg: number;
  totalCost: number;
  costPerKg: number;
  complianceColor: 'Red' | 'Blue' | 'Green';
  qualityMatchPercentage: number;
  isDemo: boolean;
  isUnlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
  actualNutrients: Nutrient;
  ingredientsUsed: IngredientUsed[];
  alternatives: Alternative[];
  userId: { _id: string; name: string; email: string };
  farmId?: { _id: string; name: string };
  standardUsed: { _id: string; name: string; fishType: string; stage: string };
}

export default function FormulationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [viewingFormulation, setViewingFormulation] =
    useState<Formulation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [
      'admin-formulations',
      page,
      search,
      statusFilter,
      complianceFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      const { data } = await api.get(
        `/admin/formulations?${params.toString()}`
      );
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/formulations/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-formulations'] }),
  });

  // Filter locally for status and compliance since backend might not support all filters
  let filteredData = data?.data || [];
  if (statusFilter) {
    if (statusFilter === 'unlocked')
      filteredData = filteredData.filter((f: Formulation) => f.isUnlocked);
    else if (statusFilter === 'demo')
      filteredData = filteredData.filter((f: Formulation) => f.isDemo);
    else if (statusFilter === 'locked')
      filteredData = filteredData.filter(
        (f: Formulation) => !f.isUnlocked && !f.isDemo
      );
  }
  if (complianceFilter) {
    filteredData = filteredData.filter(
      (f: Formulation) => f.complianceColor === complianceFilter
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Stats from current data
  const stats = {
    total: data?.meta?.total || 0,
    unlocked: data?.data?.filter((f: Formulation) => f.isUnlocked).length || 0,
    demo: data?.data?.filter((f: Formulation) => f.isDemo).length || 0,
    greenCompliance:
      data?.data?.filter((f: Formulation) => f.complianceColor === 'Green')
        .length || 0,
  };

  return (
    <div className="flex relative">
      {/* Main Content */}
      <div
        className={`flex-1 space-y-6 transition-all ${
          viewingFormulation ? 'lg:mr-[520px]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Formulations
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              All feed formulations created by users
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full w-fit">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Total:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Total
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Unlocked
            </p>
            <p className="text-2xl font-bold text-primary">{stats.unlocked}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Demo
            </p>
            <p className="text-2xl font-bold text-gray-600">{stats.demo}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Green Quality
            </p>
            <p className="text-2xl font-bold text-green-600">
              {stats.greenCompliance}
            </p>
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
              placeholder="Search by batch name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Status</option>
              <option value="unlocked">Unlocked</option>
              <option value="demo">Demo</option>
              <option value="locked">Locked</option>
            </select>
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="flex-1 sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Quality</option>
              <option value="Green">🟢 Green</option>
              <option value="Blue">🔵 Blue</option>
              <option value="Red">🔴 Red</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[1000px] lg:min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Batch</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Standard</th>
                  <th className="px-6 py-4">Weight</th>
                  <th className="px-6 py-4">Cost</th>
                  <th className="px-6 py-4">Quality</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((f: Formulation) => (
                  <tr
                    key={f._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      viewingFormulation?._id === f._id ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => setViewingFormulation(f)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <FileText size={16} />
                        </div>
                        <span className="font-medium text-gray-900">
                          {f.batchName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">
                          {f.userId?.name || 'Unknown'}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {f.userId?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{f.standardUsed?.name}</p>
                        <p className="text-gray-500 text-xs">
                          {f.standardUsed?.fishType} • {f.standardUsed?.stage}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {f.targetWeightKg?.toLocaleString()} kg
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono text-gray-900">
                          ₦{f.totalCost?.toLocaleString()}
                        </p>
                        <p className="text-gray-500 text-xs">
                          ₦{f.costPerKg?.toFixed(2)}/kg
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            f.complianceColor === 'Green'
                              ? 'bg-green-500'
                              : f.complianceColor === 'Blue'
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <span className="text-gray-700">
                          {f.qualityMatchPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                          f.isUnlocked
                            ? 'bg-primary/10 text-primary'
                            : f.isDemo
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {f.isUnlocked ? (
                          <>
                            <CheckCircle size={12} /> Unlocked
                          </>
                        ) : f.isDemo ? (
                          'Demo'
                        ) : (
                          <>
                            <AlertCircle size={12} /> Locked
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          if (confirm('Delete this formulation?'))
                            deleteMutation.mutate(f._id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {filteredData.map((f: Formulation) => (
            <div
              key={f._id}
              onClick={() => setViewingFormulation(f)}
              className={`bg-white p-4 rounded-xl border transition-all active:scale-[0.98] ${
                viewingFormulation?._id === f._id
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {f.batchName}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {f.standardUsed?.name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      f.isUnlocked
                        ? 'bg-primary/10 text-primary'
                        : f.isDemo
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {f.isUnlocked ? 'Unlocked' : f.isDemo ? 'Demo' : 'Locked'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        f.complianceColor === 'Green'
                          ? 'bg-green-500'
                          : f.complianceColor === 'Blue'
                          ? 'bg-blue-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-gray-600">
                      {f.qualityMatchPercentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Total Cost
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-900">
                    ₦{f.totalCost?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Weight
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {f.targetWeightKg?.toLocaleString()} kg
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    User
                  </p>
                  <p className="text-xs text-gray-600 truncate font-medium">
                    {f.userId?.name || 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this formulation?'))
                      deleteMutation.mutate(f._id);
                  }}
                  className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No formulations found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data?.meta && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {data.meta.page} of {data.meta.pages} ({data.meta.total}{' '}
              total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))}
                disabled={page >= data.meta.pages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Drawer */}
      {viewingFormulation && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-in fade-in"
            onClick={() => setViewingFormulation(null)}
          />
          <FormulationDetailDrawer
            formulation={viewingFormulation}
            onClose={() => setViewingFormulation(null)}
          />
        </>
      )}
    </div>
  );
}

function FormulationDetailDrawer({
  formulation,
  onClose,
}: {
  formulation: Formulation;
  onClose: () => void;
}) {
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const f = formulation;

  const ingredientsToShow = showAllIngredients
    ? f.ingredientsUsed
    : f.ingredientsUsed?.slice(0, 5);

  return (
    <div className="fixed right-0 top-0 h-screen w-full sm:w-[520px] bg-white border-l border-gray-200 shadow-xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {f.batchName}
          </h2>
          <p className="text-sm text-gray-500 truncate">
            {f.standardUsed?.name} • {f.standardUsed?.fishType}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status & Quality Badge */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              f.isUnlocked
                ? 'bg-primary/10 text-primary'
                : f.isDemo
                ? 'bg-gray-100 text-gray-600'
                : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            {f.isUnlocked ? (
              <>
                <CheckCircle size={14} /> Unlocked
              </>
            ) : f.isDemo ? (
              'Demo'
            ) : (
              <>
                <AlertCircle size={14} /> Locked
              </>
            )}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
              f.complianceColor === 'Green'
                ? 'bg-green-50 text-green-700'
                : f.complianceColor === 'Blue'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {f.qualityMatchPercentage}% Match
          </span>
        </div>

        {/* Cost Summary */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Cost Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">
                Total Cost
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
                ₦{f.totalCost?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">
                Cost per kg
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
                ₦{f.costPerKg?.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">
                Target Weight
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {f.targetWeightKg?.toLocaleString()} kg
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {f.userId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {f.userId?.name}
            </p>
            <p className="text-sm text-gray-500 truncate">{f.userId?.email}</p>
          </div>
          {f.farmId && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                Farm
              </p>
              <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                {f.farmId.name}
              </p>
            </div>
          )}
        </div>

        {/* Actual Nutrients */}
        {f.actualNutrients && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Nutrient Composition (%)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(f.actualNutrients).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-gray-50 p-3 rounded-xl text-center border border-gray-100 hover:border-primary/20 transition-colors"
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-tight truncate mb-1">
                    {key}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {typeof value === 'number' ? value.toFixed(1) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        {f.ingredientsUsed && f.ingredientsUsed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Ingredients ({f.ingredientsUsed.length})
              </h3>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[450px]">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">
                        Ingredient
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        Qty (kg)
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        Bags
                      </th>
                      <th className="px-4 py-2.5 text-right font-semibold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ingredientsToShow?.map((ing, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {ing.name || ing.ingredientId?.name}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-medium text-gray-700">
                          {ing.qtyKg?.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-gray-600">
                          {ing.bags}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-primary">
                          ₦{(ing.qtyKg * ing.priceAtMoment)?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {f.ingredientsUsed.length > 5 && (
                <button
                  onClick={() => setShowAllIngredients(!showAllIngredients)}
                  className="w-full py-2.5 text-sm font-medium text-primary hover:bg-primary/5 flex items-center justify-center gap-1 border-t border-gray-100 transition-colors"
                >
                  {showAllIngredients ? (
                    <>
                      <ChevronUp size={14} /> Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> Show All (
                      {f.ingredientsUsed.length})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Alternatives / Recommendations */}
        {f.alternatives && f.alternatives.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Alternative Suggestions
            </h3>
            <div className="space-y-2">
              {f.alternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">
                    {alt.suggestion}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    Save ₦{alt.savings?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-gray-500 mt-auto">
          <div className="flex justify-between">
            <span>Created</span>
            <span className="text-gray-900">
              {new Date(f.createdAt).toLocaleString()}
            </span>
          </div>
          {f.unlockedAt && (
            <div className="flex justify-between">
              <span>Unlocked At</span>
              <span className="text-gray-900">
                {new Date(f.unlockedAt).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>ID</span>
            <span className="font-mono text-[10px] break-all text-right">
              {f._id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
