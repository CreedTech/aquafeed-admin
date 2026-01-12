'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Loader2,
  Search,
  Ban,
  CheckCircle,
  Shield,
  Edit2,
  X,
  Wallet,
  FlaskConical,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { keepPreviousData } from '@tanstack/react-query';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'farmer' | 'admin' | 'consultant';
  isActive: boolean;
  walletBalance: number;
  hasFullAccess: boolean;
  freeTrialUsed: boolean;
  formulaCount: number;
  createdAt: string;
}

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
  priceAtMoment: number;
  nutrientsAtMoment: Nutrient;
}

interface Formulation {
  _id: string;
  batchName: string;
  targetWeightKg: number;
  totalCost: number;
  costPerKg: number;
  complianceColor: string;
  qualityMatchPercentage: number;
  isUnlocked: boolean;
  isDemo: boolean;
  createdAt: string;
  actualNutrients: Nutrient;
  ingredientsUsed: IngredientUsed[];
  standardUsed: { name: string; fishType: string; stage: string };
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'block' | 'unblock' | null>(
    null
  );

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['users', debouncedSearch, roleFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (roleFilter) params.append('role', roleFilter);
      params.append('page', page.toString());
      params.append('limit', '10');
      const { data } = await api.get(`/admin/users?${params.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/users/${id}/block`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      api.patch(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    },
  });

  const bulkBlockMutation = useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      api.post('/admin/users/bulk-block', { ids, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedIds(new Set());
      setBulkAction(null);
    },
  });

  const handleSelectAll = () => {
    const users = data?.data || [];
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u: User) => u._id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
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
      {/* Main Content */}
      <div
        className={`flex-1 space-y-6 transition-all ${
          viewingUser ? 'lg:mr-[480px]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              User Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage users, roles, and access permissions
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full w-fit">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Total:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {data?.meta?.total || 0}
            </span>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-[160px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Roles</option>
            <option value="farmer">Farmer</option>
            <option value="admin">Admin</option>
            <option value="consultant">Consultant</option>
          </select>
        </div>

        {/* Desktop Table View */}
        <div
          className={`hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity duration-200 ${
            isPlaceholderData ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px] lg:min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={
                          data?.data?.length > 0 &&
                          selectedIds.size === data?.data?.length
                        }
                        onChange={handleSelectAll}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Wallet</th>
                  <th className="px-6 py-4">Formulas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((user: User) => (
                  <tr
                    key={user._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      viewingUser?._id === user._id ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => setViewingUser(user)}
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedIds.has(user._id)}
                          onChange={() => handleSelectOne(user._id)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {user.role === 'admin' && <Shield size={12} />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Wallet size={14} />
                        <span className="font-mono">
                          ₦{user.walletBalance?.toLocaleString() || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.formulaCount || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            user.isActive ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        />
                        <span className="text-gray-700">
                          {user.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() =>
                            toggleBlockMutation.mutate({
                              id: user._id,
                              isActive: !user.isActive,
                            })
                          }
                          disabled={toggleBlockMutation.isPending}
                          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-gray-500 hover:text-red-600'
                              : 'text-gray-500 hover:text-primary'
                          }`}
                        >
                          {user.isActive ? (
                            <Ban size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
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
          {data?.data?.map((user: User) => (
            <div
              key={user._id}
              onClick={() => setViewingUser(user)}
              className={`bg-white p-4 rounded-xl border transition-all active:scale-[0.98] ${
                viewingUser?._id === user._id
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Wallet
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-700">
                    ₦{user.walletBalance?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Formulas
                  </p>
                  <p className="text-sm font-bold text-gray-700">
                    {user.formulaCount || 0}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      user.isActive ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-600">
                    {user.isActive ? 'Active' : 'Blocked'}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setEditingUser(user)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() =>
                      toggleBlockMutation.mutate({
                        id: user._id,
                        isActive: !user.isActive,
                      })
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    {user.isActive ? (
                      <Ban size={16} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {data?.data?.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No users found</p>
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

        {/* Edit Modal */}
        {editingUser && (
          <UserEditModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSubmit={(data) =>
              updateUserMutation.mutate({ id: editingUser._id, data })
            }
            isLoading={updateUserMutation.isPending}
          />
        )}
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          {
            label: 'Block Selected',
            icon: <Ban size={16} />,
            variant: 'danger',
            onClick: () => setBulkAction('block'),
          },
          {
            label: 'Unblock Selected',
            icon: <CheckCircle size={16} />,
            variant: 'default',
            onClick: () => setBulkAction('unblock'),
          },
        ]}
      />

      {/* Bulk Block/Unblock Visual Confirm */}
      <ConfirmModal
        isOpen={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={() =>
          bulkBlockMutation.mutate({
            ids: Array.from(selectedIds),
            isActive: bulkAction === 'unblock',
          })
        }
        isLoading={bulkBlockMutation.isPending}
        title={`${bulkAction === 'block' ? 'Block' : 'Unblock'} ${
          selectedIds.size
        } Users?`}
        message={`Are you sure you want to ${
          bulkAction === 'block' ? 'block' : 'unblock'
        } these users? ${
          bulkAction === 'block'
            ? 'Blocked users cannot access the platform.'
            : 'They will regain access immediately.'
        }`}
        confirmText={bulkAction === 'block' ? 'Block Users' : 'Unblock Users'}
      />

      {/* User Details Side Panel */}
      {viewingUser && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-in fade-in"
            onClick={() => setViewingUser(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-gray-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setViewingUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <UserDetailDrawerContent user={viewingUser} />
          </div>
        </>
      )}
    </div>
  );
}

// Renamed UserDetailDrawer to UserDetailDrawerContent to be used within the new drawer structure
function UserDetailDrawerContent({ user }: { user: User }) {
  const [expandedFormulation, setExpandedFormulation] = useState<string | null>(
    null
  );

  const { data: formulations, isLoading: formulationsLoading } = useQuery({
    queryKey: ['user-formulations-full', user._id],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/formulations?userId=${user._id}&limit=10`
      );
      return data.data as Formulation[];
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['user-transactions', user._id],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/transactions?userId=${user._id}&limit=10`
      );
      return data.data as Transaction[];
    },
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* User Profile */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
            <p className="text-gray-500">{user.email}</p>
            {user.phone && (
              <p className="text-gray-400 text-sm">{user.phone}</p>
            )}
            <div className="flex gap-2 mt-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  user.role === 'admin'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {user.role}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  user.isActive
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {user.isActive ? 'Active' : 'Blocked'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Wallet Balance</p>
            <p className="text-xl font-bold text-gray-900 truncate">
              ₦{user.walletBalance?.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Total Formulas</p>
            <p className="text-xl font-bold text-gray-900">
              {user.formulaCount || 0}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Access Level</p>
            <p className="text-lg font-bold text-gray-900">
              {user.hasFullAccess ? 'Premium' : 'Free'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Joined</p>
            <p className="text-lg font-bold text-gray-900 truncate">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Formulations */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FlaskConical size={16} /> Formulations ({formulations?.length || 0}
            )
          </h4>
          {formulationsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : formulations?.length ? (
            <div className="space-y-2">
              {formulations.map((f) => (
                <div
                  key={f._id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFormulation(
                        expandedFormulation === f._id ? null : f._id
                      )
                    }
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          f.complianceColor === 'Green'
                            ? 'bg-green-500'
                            : f.complianceColor === 'Blue'
                            ? 'bg-blue-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <div className="text-left">
                        <p className="font-medium text-gray-900 text-sm">
                          {f.batchName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {f.standardUsed?.name} • {f.targetWeightKg}kg
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-900">
                        ₦{f.totalCost?.toLocaleString()}
                      </span>
                      {expandedFormulation === f._id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </button>

                  {expandedFormulation === f._id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                            Cost/kg
                          </p>
                          <p className="text-sm font-mono font-bold text-gray-900">
                            ₦{f.costPerKg?.toFixed(2)}
                          </p>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                            Quality
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {f.qualityMatchPercentage}%
                          </p>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm col-span-2 xs:col-span-1">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                            Status
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {f.isUnlocked
                              ? 'Unlocked'
                              : f.isDemo
                              ? 'Demo'
                              : 'Locked'}
                          </p>
                        </div>
                      </div>

                      {/* Actual Nutrients */}
                      {f.actualNutrients && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-700">
                            Nutrient Composition (%)
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(f.actualNutrients).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center justify-center transition-colors hover:border-primary/20"
                                >
                                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight truncate w-full text-center mb-1">
                                    {key}
                                  </p>
                                  <p className="text-xs font-mono font-bold text-gray-900">
                                    {typeof value === 'number'
                                      ? value.toFixed(1)
                                      : value}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Ingredients */}
                      {f.ingredientsUsed && f.ingredientsUsed.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">
                            Ingredients ({f.ingredientsUsed.length})
                          </p>
                          <div className="space-y-1.5">
                            {f.ingredientsUsed.map((ing, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col xs:flex-row xs:items-center justify-between text-xs bg-white p-2.5 rounded border border-gray-100 gap-1"
                              >
                                <span className="text-gray-900 font-medium">
                                  {ing.name || ing.ingredientId?.name}
                                </span>
                                <div className="flex items-center justify-between xs:justify-end gap-4 text-gray-500 border-t xs:border-t-0 pt-1 xs:pt-0 mt-1 xs:mt-0">
                                  <span className="bg-gray-50 px-1.5 py-0.5 rounded">
                                    {ing.qtyKg?.toFixed(2)} kg
                                  </span>
                                  <span className="font-mono text-primary font-medium">
                                    ₦{ing.priceAtMoment?.toLocaleString()}/kg
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-400">
                        Created: {new Date(f.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">No formulations yet</p>
          )}
        </div>

        {/* Transactions */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard size={16} /> Transactions ({transactions?.length || 0})
          </h4>
          {transactionsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : transactions?.length ? (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div
                  key={t._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <p className="text-gray-700">{t.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`font-mono font-medium ${
                      t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {t.type === 'credit' ? '+' : '-'}₦
                    {t.amount?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UserEditModal({
  user,
  onClose,
  onSubmit,
  isLoading,
}: {
  user: User;
  onClose: () => void;
  onSubmit: (data: Partial<User>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: user.name,
    role: user.role,
    walletBalance: user.walletBalance,
    hasFullAccess: user.hasFullAccess,
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
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
          className="p-6 space-y-4 overflow-y-auto"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as User['role'] })
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            >
              <option value="farmer">Farmer</option>
              <option value="consultant">Consultant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Wallet Balance (₦)
            </label>
            <input
              type="number"
              value={form.walletBalance}
              onChange={(e) =>
                setForm({ ...form, walletBalance: Number(e.target.value) })
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hasFullAccess"
              checked={form.hasFullAccess}
              onChange={(e) =>
                setForm({ ...form, hasFullAccess: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label
              htmlFor="hasFullAccess"
              className="text-sm font-medium text-gray-700"
            >
              Full Access (Paid User)
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
              {isLoading && <Loader2 className="animate-spin" size={16} />}Save
              Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
