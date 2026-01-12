'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { keepPreviousData } from '@tanstack/react-query';

interface Transaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'pending' | 'success' | 'failed';
  balanceAfter: number;
  paystackReference?: string;
  createdAt: string;
  userId: { _id: string; name: string; email: string };
}

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingTransaction, setViewingTransaction] =
    useState<Transaction | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin-transactions', page, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      const { data } = await api.get(
        `/admin/transactions?${params.toString()}`
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const summary = data?.summary || { credits: 0, debits: 0 };
  const netRevenue = summary.credits - summary.debits;

  return (
    <div className="flex relative">
      <div
        className={`flex-1 space-y-6 transition-all ${
          viewingTransaction ? 'lg:mr-[400px]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Transactions
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              All platform financial transactions
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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Total Credits
              </p>
            </div>
            <p className="text-2xl font-bold text-green-600 truncate">
              ₦{summary.credits?.toLocaleString()}
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-500" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Total Debits
              </p>
            </div>
            <p className="text-2xl font-bold text-red-600 truncate">
              ₦{summary.debits?.toLocaleString()}
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              Net Revenue
            </p>
            <p
              className={`text-2xl font-bold truncate ${
                netRevenue >= 0 ? 'text-primary' : 'text-red-600'
              }`}
            >
              ₦{netRevenue?.toLocaleString()}
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              Count
            </p>
            <p className="text-2xl font-bold text-gray-900 truncate">
              {data?.meta?.total || 0}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:w-[140px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Types</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:w-[140px] px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="hidden sm:block flex-1" />
          <div className="text-sm text-gray-500">
            Showing {data?.data?.length || 0} of {data?.meta?.total || 0}
          </div>
        </div>

        {/* Desktop Table View */}
        <div
          className={`hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden transition-opacity duration-200 ${
            isPlaceholderData ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px] md:min-w-0">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Balance After</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data?.map((t: Transaction) => (
                  <tr
                    key={t._id}
                    className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      viewingTransaction?._id === t._id ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => setViewingTransaction(t)}
                  >
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium ${
                          t.type === 'credit'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {t.type === 'credit' ? (
                          <ArrowDownCircle size={14} />
                        ) : (
                          <ArrowUpCircle size={14} />
                        )}
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">
                          {t.userId?.name || 'Unknown'}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {t.userId?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-mono font-medium ${
                          t.type === 'credit'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {t.type === 'credit' ? '+' : '-'}₦
                        {t.amount?.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      ₦{t.balanceAfter?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          t.status === 'success'
                            ? 'bg-primary/10 text-primary'
                            : t.status === 'pending'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {data?.data?.map((t: Transaction) => (
            <div
              key={t._id}
              onClick={() => setViewingTransaction(t)}
              className={`bg-white p-4 rounded-xl border transition-all active:scale-[0.98] ${
                viewingTransaction?._id === t._id
                  ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === 'credit'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {t.type === 'credit' ? (
                      <ArrowDownCircle size={20} />
                    ) : (
                      <ArrowUpCircle size={20} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {t.userId?.name || 'Unknown'}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {t.description}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    t.status === 'success'
                      ? 'bg-primary/10 text-primary'
                      : t.status === 'pending'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Amount
                  </p>
                  <p
                    className={`text-sm font-mono font-bold ${
                      t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {t.type === 'credit' ? '+' : '-'}₦
                    {t.amount?.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">
                    Date
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {data?.data?.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No transactions found</p>
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
      {viewingTransaction && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-in fade-in"
            onClick={() => setViewingTransaction(null)}
          />
          <TransactionDetailDrawer
            transaction={viewingTransaction}
            onClose={() => setViewingTransaction(null)}
          />
        </>
      )}
    </div>
  );
}

function TransactionDetailDrawer({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const t = transaction;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white border-l border-gray-200 shadow-xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Transaction Details</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Amount */}
        <div
          className={`text-center p-6 sm:p-8 rounded-2xl border ${
            t.type === 'credit'
              ? 'bg-green-50/50 border-green-100'
              : 'bg-red-50/50 border-red-100'
          }`}
        >
          <p
            className={`text-2xl sm:text-3xl font-bold font-mono break-all ${
              t.type === 'credit' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {t.type === 'credit' ? '+' : '-'}₦{t.amount?.toLocaleString()}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                t.type === 'credit'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {t.type}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.status}
            </span>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {t.userId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {t.userId?.name}
            </p>
            <p className="text-sm text-gray-500 truncate">{t.userId?.email}</p>
          </div>
        </div>

        {/* Details List */}
        <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 space-y-1">
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200/50 gap-1 sm:gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
              Description
            </span>
            <span className="text-sm text-gray-900 font-medium sm:text-right wrap-break-word">
              {t.description}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200/50 gap-1 sm:gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Status
            </span>
            <span
              className={`text-sm font-bold sm:text-right ${
                t.status === 'success'
                  ? 'text-primary'
                  : t.status === 'pending'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {t.status.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200/50 gap-1 sm:gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Balance After
            </span>
            <span className="text-sm text-gray-900 font-mono font-bold sm:text-right">
              ₦{t.balanceAfter?.toLocaleString()}
            </span>
          </div>
          {t.paystackReference && (
            <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200/50 gap-1 sm:gap-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">
                Paystack Ref
              </span>
              <span className="text-xs text-gray-900 font-mono break-all sm:text-right">
                {t.paystackReference}
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-200/50 gap-1 sm:gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Date
            </span>
            <span className="text-sm text-gray-700 sm:text-right">
              {new Date(t.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1 sm:gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Transaction ID
            </span>
            <span className="text-[10px] text-gray-400 font-mono break-all sm:text-right uppercase">
              {t._id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
