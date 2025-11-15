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
  Target,
  Fish,
  Activity,
} from 'lucide-react';

interface Nutrient {
  min: number;
  max: number;
}

interface FeedStandard {
  _id: string;
  name: string;
  fishType: 'Catfish' | 'Tilapia' | 'Both';
  stage: 'Starter' | 'Grower' | 'Finisher';
  description?: string;
  targetNutrients: {
    protein: Nutrient;
    fat: Nutrient;
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

export default function StandardsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [fishTypeFilter, setFishTypeFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<FeedStandard | null>(
    null
  );
  const [viewingStandard, setViewingStandard] = useState<FeedStandard | null>(
    null
  );

  const { data, isLoading } = useQuery({
    queryKey: ['standards', search, fishTypeFilter, stageFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fishTypeFilter) params.append('fishType', fishTypeFilter);
      if (stageFilter) params.append('stage', stageFilter);
      const { data } = await api.get(`/standards?${params.toString()}`);
      return data.standards as FeedStandard[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<FeedStandard>) =>
      api.post('/admin/standards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeedStandard> }) =>
      api.put(`/admin/standards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] });
      setIsModalOpen(false);
      setEditingStandard(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/standards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards'] }),
  });

  // Stats
  const stats = {
    total: data?.length || 0,
    catfish: data?.filter((s) => s.fishType === 'Catfish').length || 0,
    tilapia: data?.filter((s) => s.fishType === 'Tilapia').length || 0,
    active: data?.filter((s) => s.isActive).length || 0,
  };

  // Filter by search
  const filteredData = data?.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex">
      <div
        className={`flex-1 space-y-6 transition-all ${
          viewingStandard ? 'mr-[450px]' : ''
        }`}
      >
        <div className="flex items-center justify-between">
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
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus size={18} />
            <span>Add Standard</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Total Standards</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Catfish</p>
            <p className="text-2xl font-bold text-gray-900">{stats.catfish}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Tilapia</p>
            <p className="text-2xl font-bold text-gray-900">{stats.tilapia}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search standards..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={fishTypeFilter}
            onChange={(e) => setFishTypeFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">All Fish Types</option>
            <option value="Catfish">Catfish</option>
            <option value="Tilapia">Tilapia</option>
            <option value="Both">Both</option>
          </select>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="">All Stages</option>
            <option value="Starter">Starter</option>
            <option value="Grower">Grower</option>
            <option value="Finisher">Finisher</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Fish Type</th>
                <th className="px-6 py-4">Stage</th>
                <th className="px-6 py-4">Protein Range</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData?.map((standard) => (
                <tr
                  key={standard._id}
                  className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                    viewingStandard?._id === standard._id ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => setViewingStandard(standard)}
                >
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
                      <Fish size={12} />
                      {standard.fishType}
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
                        onClick={() => {
                          if (confirm('Delete this standard?'))
                            deleteMutation.mutate(standard._id);
                        }}
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

      {/* Right Drawer */}
      {viewingStandard && (
        <StandardDetailDrawer
          standard={viewingStandard}
          onClose={() => setViewingStandard(null)}
        />
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
    <div className="fixed right-0 top-0 h-screen w-[450px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-40">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{standard.name}</h2>
            <p className="text-sm text-gray-500">
              {standard.fishType} • {standard.stage}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status badges */}
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              standard.isActive
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {standard.isActive ? 'Active' : 'Inactive'}
          </span>
          {standard.isDefault && (
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700">
              ★ Default Standard
            </span>
          )}
        </div>

        {/* Description */}
        {standard.description && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-700">{standard.description}</p>
          </div>
        )}

        {/* Target Nutrients */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Target Nutrient Ranges (%)
          </h3>
          <div className="space-y-2">
            {Object.entries(standard.targetNutrients || {}).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">
                      {value?.min ?? 0}%
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-sm text-gray-600">
                      {value?.max ?? 0}%
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Created</span>
            <span>{new Date(standard.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>ID</span>
            <span className="font-mono text-xs">{standard._id}</span>
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
    fishType: standard?.fishType || 'Catfish',
    stage: standard?.stage || 'Grower',
    description: standard?.description || '',
    isActive: standard?.isActive ?? true,
    isDefault: standard?.isDefault ?? false,
    targetNutrients: standard?.targetNutrients || defaultNutrients,
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
          <div className="grid grid-cols-3 gap-4">
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
                Fish Type
              </label>
              <select
                value={form.fishType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fishType: e.target.value as FeedStandard['fishType'],
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="Catfish">Catfish</option>
                <option value="Tilapia">Tilapia</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Stage
              </label>
              <select
                value={form.stage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stage: e.target.value as FeedStandard['stage'],
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              >
                <option value="Starter">Starter</option>
                <option value="Grower">Grower</option>
                <option value="Finisher">Finisher</option>
              </select>
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
            <div className="grid grid-cols-4 gap-3">
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
