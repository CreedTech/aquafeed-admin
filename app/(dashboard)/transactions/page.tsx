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

  const { data, isLoading } = useQuery({
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
  });

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Transactions
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              All platform financial transactions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-500" />
              <p className="text-sm text-gray-500">Total Credits</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ₦{summary.credits?.toLocaleString()}
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-500" />
              <p className="text-sm text-gray-500">Total Debits</p>
            </div>
            <p className="text-2xl font-bold text-red-600">
              ₦{summary.debits?.toLocaleString()}
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Net Revenue</p>
            <p
              className={`text-2xl font-bold ${
                netRevenue >= 0 ? 'text-primary' : 'text-red-600'
              }`}
            >
              ₦{netRevenue?.toLocaleString()}
            </p>
          </div>
          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">
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

        {/* Table Container */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
        <TransactionDetailDrawer
          transaction={viewingTransaction}
          onClose={() => setViewingTransaction(null)}
        />
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
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white border-l border-gray-200 shadow-xl z-50 animate-in slide-in-from-right duration-300">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Transaction Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount */}
        <div
          className={`text-center p-6 rounded-xl ${
            t.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <p
            className={`text-3xl font-bold font-mono ${
              t.type === 'credit' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {t.type === 'credit' ? '+' : '-'}₦{t.amount?.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {t.type === 'credit' ? 'Credit' : 'Debit'} • {t.status}
          </p>
        </div>

        {/* User */}
        <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {t.userId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{t.userId?.name}</p>
            <p className="text-sm text-gray-500">{t.userId?.email}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Description</span>
            <span className="text-gray-900 font-medium text-right max-w-[200px]">
              {t.description}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Status</span>
            <span
              className={`font-medium ${
                t.status === 'success'
                  ? 'text-primary'
                  : t.status === 'pending'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
            </span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Balance After</span>
            <span className="text-gray-900 font-mono">
              ₦{t.balanceAfter?.toLocaleString()}
            </span>
          </div>
          {t.paystackReference && (
            <div className="flex justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">Paystack Ref</span>
              <span className="text-gray-900 font-mono text-xs">
                {t.paystackReference}
              </span>
            </div>
          )}
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Date</span>
            <span className="text-gray-900">
              {new Date(t.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-gray-500">Transaction ID</span>
            <span className="text-gray-400 font-mono text-xs">{t._id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
