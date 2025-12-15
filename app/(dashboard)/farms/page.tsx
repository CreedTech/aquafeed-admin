'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
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
  const [viewingFarm, setViewingFarm] = useState<FarmProfile | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-farms', page, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      const { data } = await api.get(`/admin/farms?${params.toString()}`);
      return data;
    },
  });

  const farms = data?.data || [];

  // Filter locally by search on name or location
  const getLocationString = (loc: string | FarmLocation): string => {
    if (typeof loc === 'object' && loc !== null) {
      return `${loc.lga || ''} ${loc.state || ''} ${loc.address || ''}`;
    }
    return String(loc || '');
  };

  const filteredFarms = farms.filter(
    (f: FarmProfile) =>
      !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      getLocationString(f.location)
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      f.userId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const stats = {
    total: data?.meta?.total || 0,
    totalPonds: farms.reduce(
      (sum: number, f: FarmProfile) => sum + (f.ponds?.length || 0),
      0
    ),
    totalFish: farms.reduce(
      (sum: number, f: FarmProfile) =>
        sum +
        f.ponds?.reduce((s: number, p: Pond) => s + (p.fishCount || 0), 0),
      0
    ),
    catfishPonds: farms
      .flatMap((f: FarmProfile) => f.ponds || [])
      .filter((p: Pond) => p.fishType === 'Catfish').length,
  };

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
          viewingFarm ? 'mr-[450px]' : ''
        }`}
      >
        <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-4 gap-4">
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
              placeholder="Search by farm name, location, or owner..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
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
                  farm.ponds?.reduce((sum, p) => sum + (p.fishCount || 0), 0) ||
                  0;
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
        <FarmDetailDrawer
          farm={viewingFarm}
          onClose={() => setViewingFarm(null)}
        />
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
    <div className="fixed right-0 top-0 h-screen w-[450px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-40">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{farm.name}</h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <MapPin size={14} />
              {typeof farm.location === 'object' && farm.location !== null
                ? `${(farm.location as FarmLocation).lga || ''}, ${
                    (farm.location as FarmLocation).state || ''
                  }`
                : String(farm.location || '')}
            </div>
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
        {/* Owner */}
        <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {farm.userId?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{farm.userId?.name}</p>
            <p className="text-sm text-gray-500">{farm.userId?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-gray-900">
              {farm.ponds?.length || 0}
            </p>
            <p className="text-xs text-gray-500">Ponds</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-gray-900">
              {totalFish.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Fish</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-gray-900">{totalArea}</p>
            <p className="text-xs text-gray-500">m² Total</p>
          </div>
        </div>

        {/* Ponds */}
        {farm.ponds && farm.ponds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Ponds ({farm.ponds.length})
            </h3>
            <div className="space-y-2">
              {farm.ponds.map((pond, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      Pond #{pond.pondNumber}
                    </span>
                    <span className="text-sm text-gray-500">
                      {pond.sizeInMeters} m²
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Fish Count</p>
                      <p className="font-medium">
                        {pond.fishCount?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fish Type</p>
                      <p className="font-medium">{pond.fishType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Stage</p>
                      <p className="font-medium">{pond.stage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Created</span>
            <span>{new Date(farm.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Updated</span>
            <span>{new Date(farm.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Farm ID</span>
            <span className="font-mono text-xs">{farm._id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
