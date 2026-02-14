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
  LayoutDashboard,
  Save,
  Activity,
} from 'lucide-react';

// --- Types ---

interface TemplateItem {
  ingredientId: string;
  ratio: number;
}

interface FeedTemplate {
  _id: string;
  name: string;
  feedCategory: 'Catfish' | 'Poultry';
  poultryType?: 'Broiler' | 'Layer';
  stage: string;
  description?: string;
  totalWeight: number;
  items: TemplateItem[];
  isActive: boolean;
  createdAt: string;
}

interface Ingredient {
  _id: string;
  name: string;
}

interface Category {
  _id: string;
  name: string;
  displayName: string;
  type: string;
}

// --- Main Page ---

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeedTemplate | null>(
    null,
  );
  const [viewingTemplate, setViewingTemplate] = useState<FeedTemplate | null>(
    null,
  );

  // Queries
  const { data: templates, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['templates', search, categoryFilter],
    queryFn: async () => {
      const { data } = await api.get('/admin/templates');
      return data.templates as FeedTemplate[];
    },
  });

  const { data: ingredients } = useQuery({
    queryKey: ['ingredients-minimal'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ingredients');
      return data.ingredients as Ingredient[];
    },
  });

  const { data: species } = useQuery({
    queryKey: ['categories', 'fish_type'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories?type=fish_type');
      return data.categories as Category[];
    },
  });

  const { data: stages } = useQuery({
    queryKey: ['categories', 'stage'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories?type=stage');
      return data.categories as Category[];
    },
  });

  const { data: poultryTypes } = useQuery({
    queryKey: ['categories', 'other'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories?type=other');
      return data.categories as Category[];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<FeedTemplate>) =>
      api.post('/admin/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeedTemplate> }) =>
      api.put(`/admin/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      if (viewingTemplate?._id === id) setViewingTemplate(null);
    },
  });

  // Handlers
  const handleEdit = (template: FeedTemplate) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  // Filtering
  const filteredTemplates = templates?.filter((t) => {
    const matchesSearch =
      !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !categoryFilter || t.feedCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const stats = {
    total: templates?.length || 0,
    catfish: templates?.filter((t) => t.feedCategory === 'Catfish').length || 0,
    poultry: templates?.filter((t) => t.feedCategory === 'Poultry').length || 0,
    active: templates?.filter((t) => t.isActive).length || 0,
  };

  if (isTemplatesLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex relative">
      <div
        className={`flex-1 space-y-6 transition-all ${viewingTemplate ? 'lg:mr-[450px]' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Quick Mix Templates
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage pre-defined formulation recipes for mobile app users
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Add Template</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Templates
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Catfish
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.catfish}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Poultry
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.poultry}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Active
            </p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 sm:w-40 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Categories</option>
              <option value="Catfish">Catfish</option>
              <option value="Poultry">Poultry</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Ingredients</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTemplates?.map((template) => (
                  <tr
                    key={template._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${viewingTemplate?._id === template._id ? 'bg-primary/5' : ''}`}
                    onClick={() => setViewingTemplate(template)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                          <LayoutDashboard size={16} />
                        </div>
                        <span className="font-bold text-gray-900">
                          {template.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          template.feedCategory === 'Poultry'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {template.feedCategory}{' '}
                        {template.poultryType
                          ? `(${template.poultryType})`
                          : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
                        <Activity size={12} />
                        {template.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 italic">
                      {template.items?.length || 0} components
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          template.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {template.isActive ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this template?'))
                              deleteMutation.mutate(template._id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
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

        {/* Mobile View */}
        <div className="sm:hidden space-y-4">
          {filteredTemplates?.map((template) => (
            <div
              key={template._id}
              onClick={() => setViewingTemplate(template)}
              className={`bg-white p-4 rounded-xl border transition-all ${
                viewingTemplate?._id === template._id
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <LayoutDashboard size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{template.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {template.stage}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    template.isActive
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {template.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                    template.feedCategory === 'Poultry'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {template.feedCategory}
                </span>
                <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-black uppercase">
                  {template.items?.length || 0} items
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Side Drawer */}
      {viewingTemplate && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setViewingTemplate(null)}
          />
          <TemplateDetailDrawer
            template={viewingTemplate}
            ingredients={ingredients || []}
            onClose={() => setViewingTemplate(null)}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <TemplateModal
          template={editingTemplate}
          ingredients={ingredients || []}
          species={species || []}
          stages={stages || []}
          poultryTypes={poultryTypes || []}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTemplate(null);
          }}
          onSubmit={(data) => {
            if (editingTemplate)
              updateMutation.mutate({ id: editingTemplate._id, data });
            else createMutation.mutate(data);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

// --- Detail Drawer ---

function TemplateDetailDrawer({
  template,
  ingredients,
  onClose,
}: {
  template: FeedTemplate;
  ingredients: Ingredient[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {template.name}
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 mt-1">
            <span className="text-primary">{template.feedCategory}</span>
            <span>/</span>
            <span>{template.stage}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Baseline Description
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-primary/20 pl-4">
            {template.description ||
              'No description provided for this formulation.'}
          </p>
        </div>

        {/* Recipe */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Ingredient Ratios
            </h3>
            <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold">
              100.00% TOTAL
            </span>
          </div>
          <div className="space-y-2">
            {template.items?.map((item, idx) => {
              const ingName =
                ingredients.find((i) => i._id === item.ingredientId)?.name ||
                'Unknown Component';
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <span className="text-sm font-bold text-gray-700">
                    {ingName}
                  </span>
                  <span className="text-sm font-mono font-black text-primary">
                    {item.ratio}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 rounded-xl p-5 space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
            <span className="text-gray-400">Creation Date</span>
            <span className="text-gray-900">
              {new Date(template.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="pt-3 border-t border-gray-200">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest text-center mb-1">
              Internal Reference
            </p>
            <p className="text-[10px] font-mono text-gray-400 text-center break-all">
              {template._id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Modal ---

function TemplateModal({
  template,
  ingredients,
  species,
  stages,
  poultryTypes,
  onClose,
  onSubmit,
  isLoading,
}: {
  template: FeedTemplate | null;
  ingredients: Ingredient[];
  species: Category[];
  stages: Category[];
  poultryTypes: Category[];
  onClose: () => void;
  onSubmit: (data: Partial<FeedTemplate>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<Partial<FeedTemplate>>({
    name: template?.name || '',
    feedCategory: template?.feedCategory || 'Catfish',
    poultryType:
      template?.poultryType ||
      (poultryTypes[0]?.name as 'Broiler' | 'Layer') ||
      'Broiler',
    stage: template?.stage || 'Starter',
    description: template?.description || '',
    items: template?.items || [{ ingredientId: '', ratio: 0 }],
    isActive: template?.isActive ?? true,
    totalWeight: 100,
  });

  const totalPercentage =
    form.items?.reduce((acc, item) => acc + item.ratio, 0) || 0;

  const updateItem = (
    idx: number,
    field: keyof TemplateItem,
    value: string | number,
  ) => {
    const newItems = [...(form.items || [])];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {template ? 'Edit Template' : 'Add Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <form
          className="p-6 overflow-y-auto space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (totalPercentage !== 100)
              return alert('Total ratio must be 100%');
            onSubmit(form);
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Template Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase">
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
                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {species.length > 0 ? (
                  species.map((s) => (
                    <option key={s._id} value={s.displayName}>
                      {s.displayName}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Catfish">Catfish</option>
                    <option value="Poultry">Poultry</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.feedCategory === 'Poultry' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  {poultryTypes.length > 0 ? (
                    poultryTypes.map((p) => (
                      <option key={p._id} value={p.displayName}>
                        {p.displayName}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Broiler">Broiler</option>
                      <option value="Layer">Layer</option>
                    </>
                  )}
                </select>
              </div>
            )}
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Growth Stage
              </label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {stages.length > 0 ? (
                  stages.map((s) => (
                    <option key={s._id} value={s.displayName}>
                      {s.displayName}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Starter">Starter</option>
                    <option value="Grower">Grower</option>
                    <option value="Finisher">Finisher</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-900 rounded-xl text-white">
              <span className="text-[10px] font-black uppercase tracking-widest">
                Recipe Formulation
              </span>
              <span
                className={`text-sm font-black ${totalPercentage === 100 ? 'text-primary' : 'text-red-400'}`}
              >
                {totalPercentage}% / 100%
              </span>
            </div>
            <div className="space-y-3">
              {form.items?.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <select
                    value={item.ingredientId}
                    onChange={(e) =>
                      updateItem(idx, 'ingredientId', e.target.value)
                    }
                    required
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold"
                  >
                    <option value="">Select Ingredient...</option>
                    {ingredients.map((ing) => (
                      <option key={ing._id} value={ing._id}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                  <div className="w-24 relative">
                    <input
                      type="number"
                      step="0.01"
                      value={item.ratio}
                      onChange={(e) =>
                        updateItem(idx, 'ratio', Number(e.target.value))
                      }
                      required
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-black text-right pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                      %
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        items: form.items?.filter((_, i) => i !== idx),
                      })
                    }
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    items: [
                      ...(form.items || []),
                      { ingredientId: '', ratio: 0 },
                    ],
                  })
                }
                className="w-full py-3 border-2 border-dashed border-gray-100 rounded-lg text-xs font-bold text-gray-400 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Ingredient
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/20"
              />
              <span className="text-sm font-bold text-gray-700">
                Set as Active
              </span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || totalPercentage !== 100}
                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                <Save size={16} />
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
