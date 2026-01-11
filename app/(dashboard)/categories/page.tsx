'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  X,
  Tag,
  Fish,
  Activity,
  Database,
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
  type: 'ingredient' | 'fish_type' | 'stage';
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const TYPE_CONFIG = {
  ingredient: {
    label: 'Ingredient Types',
    icon: Database,
    color: 'bg-blue-50 text-blue-700',
  },
  fish_type: {
    label: 'Fish Types',
    icon: Fish,
    color: 'bg-green-50 text-green-700',
  },
  stage: {
    label: 'Feed Stages',
    icon: Activity,
    color: 'bg-purple-50 text-purple-700',
  },
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', typeFilter],
    queryFn: async () => {
      const params = typeFilter ? `?type=${typeFilter}` : '';
      const { data } = await api.get(`/admin/categories${params}`);
      return data.categories as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Category>) =>
      api.post('/admin/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      api.put(`/admin/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsModalOpen(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  // Group by type
  const groupedCategories = {
    ingredient: data?.filter((c) => c.type === 'ingredient') || [],
    fish_type: data?.filter((c) => c.type === 'fish_type') || [],
    stage: data?.filter((c) => c.type === 'stage') || [],
  };

  if (isLoading) {
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
            Categories
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage ingredient types, fish types, and feed stages
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTypeFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            !typeFilter
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All ({data?.length || 0})
        </button>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              typeFilter === type
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <config.icon size={16} />
            {config.label} (
            {groupedCategories[type as keyof typeof groupedCategories].length})
          </button>
        ))}
      </div>

      {/* Category Groups */}
      {(!typeFilter ? Object.keys(TYPE_CONFIG) : [typeFilter]).map((type) => {
        const categories =
          groupedCategories[type as keyof typeof groupedCategories];
        const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
        if (categories.length === 0) return null;

        return (
          <div
            key={type}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
              <config.icon size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">{config.label}</h3>
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">
                {categories.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Tag size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-sm text-gray-500">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                        category.isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex items-center gap-1">
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
                        onClick={() => {
                          if (confirm('Delete this category?'))
                            deleteMutation.mutate(category._id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Modal */}
      {isModalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCategory(null);
          }}
          onSubmit={(data) => {
            if (editingCategory)
              updateMutation.mutate({ id: editingCategory._id, data });
            else createMutation.mutate(data);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSubmit,
  isLoading,
}: {
  category: Category | null;
  onClose: () => void;
  onSubmit: (data: Partial<Category>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: category?.name || '',
    type: category?.type || 'ingredient',
    description: category?.description || '',
    isActive: category?.isActive ?? true,
    sortOrder: category?.sortOrder || 0,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {category ? 'Edit Category' : 'Add Category'}
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
          className="p-6 space-y-4"
        >
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
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as Category['type'] })
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            >
              <option value="ingredient">Ingredient Type</option>
              <option value="fish_type">Fish Type</option>
              <option value="stage">Feed Stage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
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
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
