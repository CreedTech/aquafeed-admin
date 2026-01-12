'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { keepPreviousData } from '@tanstack/react-query';
import { Loader2, Search, X, MapPin, Fish, Droplets } from 'lucide-react';

interface Pond {
  pondNumber: number;
  sizeInMeters: number;
  fishCount: number;
  fishType: string;
  stage: string;
}

interface FarmLocation {
  state?: string;
  lga?: string;
  address?: string;
}

interface FarmProfile {
  _id: string;
  userId: { _id: string; name: string; email: string };
  name: string;
  location: string | FarmLocation;
  ponds: Pond[];
  createdAt: string;
  updatedAt: string;
}

export default function FarmsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [viewingFarm, setViewingFarm] = useState<FarmProfile | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin-farms', page, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (debouncedSearch) params.append('search', debouncedSearch);
      const { data } = await api.get(`/admin/farms?${params.toString()}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Data is now filtered on the server
  const filteredFarms = data?.data || [];

  // Stats
  const stats = {
    total: data?.meta?.total || 0,
    totalPonds: filteredFarms.reduce(
      (sum: number, f: FarmProfile) => sum + (f.ponds?.length || 0),
      0
    ),
    totalFish: filteredFarms.reduce(
      (sum: number, f: FarmProfile) =>
        sum +
        f.ponds?.reduce((s: number, p: Pond) => s + (p.fishCount || 0), 0),
      0
    ),
    catfishPonds: filteredFarms
      .flatMap((f: FarmProfile) => f.ponds || [])
      .filter((p: Pond) => p.fishType === 'Catfish').length,
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
      <div
        className={`flex-1 space-y-6 transition-all ${
          viewingFarm ? 'lg:mr-[420px]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Farm Profiles
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              View all farm profiles, ponds, and fish inventory
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-primary" />
              <p className="text-sm text-gray-500">Total Farms</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={16} className="text-blue-500" />
              <p className="text-sm text-gray-500">Total Ponds</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalPonds}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Fish size={16} className="text-primary" />
              <p className="text-sm text-gray-500">Total Fish</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalFish?.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-2">Catfish Ponds</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.catfishPonds}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by farm name, location, or owner..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
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
                  <th className="px-6 py-4">Farm</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Ponds</th>
                  <th className="px-6 py-4">Total Fish</th>
                  <th className="px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFarms.map((farm: FarmProfile) => {
                  const totalFish =
                    farm.ponds?.reduce(
                      (sum, p) => sum + (p.fishCount || 0),
                      0
                    ) || 0;
                  return (
                    <tr
                      key={farm._id}
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${
                        viewingFarm?._id === farm._id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => setViewingFarm(farm)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Fish size={16} />
                          </div>
                          <span className="font-medium text-gray-900">
                            {farm.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900">
                            {farm.userId?.name || 'Unknown'}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {farm.userId?.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin size={14} />
                          {typeof farm.location === 'object' &&
                          farm.location !== null
                            ? `${(farm.location as FarmLocation).lga || ''}, ${
                                (farm.location as FarmLocation).state || ''
                              }`
                            : String(farm.location || '')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                          <Droplets size={12} />
                          {farm.ponds?.length || 0} ponds
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {totalFish.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(farm.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4">
          {filteredFarms.map((farm: FarmProfile) => {
            const totalFish =
              farm.ponds?.reduce((sum, p) => sum + (p.fishCount || 0), 0) || 0;
            return (
              <div
                key={farm._id}
                onClick={() => setViewingFarm(farm)}
                className={`bg-white p-4 rounded-xl border transition-all active:scale-[0.98] ${
                  viewingFarm?._id === farm._id
                    ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                      <Fish size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {farm.name}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {farm.userId?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                    <Droplets size={10} />
                    {farm.ponds?.length || 0} Ponds
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3 overflow-hidden">
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">
                    {typeof farm.location === 'object' && farm.location !== null
                      ? `${(farm.location as FarmLocation).lga || ''}, ${
                          (farm.location as FarmLocation).state || ''
                        }`
                      : String(farm.location || '')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-t border-gray-50">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">
                      Total Fish
                    </p>
                    <p className="text-sm font-mono font-bold text-gray-900">
                      {totalFish.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">
                      Created
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(farm.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredFarms.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No farms found</p>
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
      {viewingFarm && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden animate-in fade-in"
            onClick={() => setViewingFarm(null)}
          />
          <FarmDetailDrawer
            farm={viewingFarm}
            onClose={() => setViewingFarm(null)}
          />
        </>
      )}
    </div>
  );
}

function FarmDetailDrawer({
  farm,
  onClose,
}: {
  farm: FarmProfile;
  onClose: () => void;
}) {
  const totalFish =
    farm.ponds?.reduce((sum, p) => sum + (p.fishCount || 0), 0) || 0;
  const totalArea =
    farm.ponds?.reduce((sum, p) => sum + (p.sizeInMeters || 0), 0) || 0;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white border-l border-gray-200 shadow-xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {farm.name}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">
              {typeof farm.location === 'object' && farm.location !== null
                ? `${(farm.location as FarmLocation).lga || ''}, ${
                    (farm.location as FarmLocation).state || ''
                  }`
                : String(farm.location || '')}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Owner */}
        <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {farm.userId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {farm.userId?.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {farm.userId?.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100/50">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
              Ponds
            </p>
            <p className="text-xl font-bold text-gray-900">
              {farm.ponds?.length || 0}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100/50">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
              Fish
            </p>
            <p className="text-xl font-bold text-gray-900 truncate">
              {totalFish.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100/50 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
              m² Total
            </p>
            <p className="text-xl font-bold text-gray-900">{totalArea}</p>
          </div>
        </div>

        {/* Ponds */}
        {farm.ponds && farm.ponds.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Ponds ({farm.ponds.length})
            </h3>
            <div className="space-y-3">
              {farm.ponds.map((pond, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                    <span className="font-bold text-gray-900">
                      Pond #{pond.pondNumber}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-xs font-medium">
                      {pond.sizeInMeters} m²
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mb-0.5">
                        Fish Count
                      </p>
                      <p className="text-sm font-semibold text-gray-900 font-mono">
                        {pond.fishCount?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mb-0.5">
                        Fish Type
                      </p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {pond.fishType}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter mb-0.5">
                        Stage
                      </p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {pond.stage}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-bold uppercase tracking-wider">
              Created
            </span>
            <span className="text-gray-700 font-medium">
              {new Date(farm.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-bold uppercase tracking-wider">
              Last Updated
            </span>
            <span className="text-gray-700 font-medium">
              {new Date(farm.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">
              Farm ID
            </span>
            <span className="font-mono text-[10px] text-gray-400 text-center break-all">
              {farm._id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
