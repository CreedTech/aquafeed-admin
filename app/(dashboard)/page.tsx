'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/services/api';
import {
  Users,
  FlaskConical,
  Database,
  TrendingUp,
  Loader2,
  Calendar,
  Fish,
  ArrowRight,
  Tag,
  Target,
  Wallet,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface SystemStats {
  users: number;
  activeFarms: number;
  platformRevenue: number;
  ingredients: number;
  formulations: number;
}

interface ChartData {
  revenueByMonth: { name: string; value: number }[];
  formulationsByStatus: { name: string; value: number; color: string }[];
  formulationsPerDay: { name: string; value: number }[];
  userSignups: { name: string; value: number }[];
}

interface RecentUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  walletBalance: number;
  role: string;
}

interface RecentFormulation {
  _id: string;
  batchName: string;
  totalCost: number;
  complianceColor: string;
  createdAt: string;
  targetWeightKg: number;
  userId: { name: string };
}

interface RecentTransaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  userId: { name: string };
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get<SystemStats>('/admin/stats');
      return data;
    },
  });

  const { data: chartData, isLoading: chartsLoading } = useQuery({
    queryKey: ['admin-chart-data'],
    queryFn: async () => {
      const { data } = await api.get<ChartData>('/admin/chart-data');
      return data;
    },
    retry: 1,
    staleTime: 60000,
  });

  const { data: recentUsers } = useQuery({
    queryKey: ['recent-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users?limit=5');
      return data.data as RecentUser[];
    },
  });

  const { data: recentFormulations } = useQuery({
    queryKey: ['recent-formulations'],
    queryFn: async () => {
      const { data } = await api.get('/admin/formulations?limit=5');
      return data.data as RecentFormulation[];
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data } = await api.get('/admin/transactions?limit=5');
      return data.data as RecentTransaction[];
    },
  });

  const { data: standardsData } = useQuery({
    queryKey: ['standards-count'],
    queryFn: async () => {
      const { data } = await api.get('/standards');
      return data.standards?.length || 0;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-count'],
    queryFn: async () => {
      const { data } = await api.get('/admin/categories');
      return data.categories?.length || 0;
    },
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const s = stats || {
    users: 0,
    activeFarms: 0,
    platformRevenue: 0,
    ingredients: 0,
    formulations: 0,
  };
  const charts = chartData || {
    revenueByMonth: [],
    formulationsByStatus: [],
    formulationsPerDay: [],
    userSignups: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back! Here's your platform overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200">
          <Calendar size={16} />
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          {
            label: 'Users',
            value: s.users,
            icon: Users,
            href: '/users',
            color: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Farms',
            value: s.activeFarms,
            icon: Fish,
            href: '/farms',
            color: 'text-green-600 bg-green-50',
          },
          {
            label: 'Ingredients',
            value: s.ingredients,
            icon: Database,
            href: '/ingredients',
            color: 'text-orange-600 bg-orange-50',
          },
          {
            label: 'Formulations',
            value: s.formulations,
            icon: FlaskConical,
            href: '/formulations',
            color: 'text-purple-600 bg-purple-50',
          },
          {
            label: 'Standards',
            value: standardsData || 0,
            icon: Target,
            href: '/standards',
            color: 'text-pink-600 bg-pink-50',
          },
          {
            label: 'Categories',
            value: categoriesData || 0,
            icon: Tag,
            href: '/categories',
            color: 'text-cyan-600 bg-cyan-50',
          },
          {
            label: 'Revenue',
            value: `₦${(s.platformRevenue / 1000).toFixed(0)}k`,
            icon: TrendingUp,
            href: '/transactions',
            color: 'text-primary bg-primary/10',
          },
        ].map((stat) => (
          <Link
            href={stat.href}
            key={stat.label}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div
              className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mb-3`}
            >
              <stat.icon size={18} />
            </div>
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 tracking-tight">
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <div className="h-[200px]">
            {chartsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : charts.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueByMonth}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#0EA27E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0EA27E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0EA27E"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No revenue data yet
              </div>
            )}
          </div>
        </div>

        {/* Formulation Status Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Formulation Status
          </h3>
          <div className="h-[140px]">
            {chartsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : charts.formulationsByStatus.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.formulationsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.formulationsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No formulations yet
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {charts.formulationsByStatus.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 text-xs"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Weekly Activity + User Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Formulations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Weekly Formulations</h3>
            <span className="text-xs text-gray-500">Last 7 days</span>
          </div>
          <div className="h-[140px]">
            {chartsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : charts.formulationsPerDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.formulationsPerDay}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="#0EA27E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No formulations this week
              </div>
            )}
          </div>
        </div>

        {/* User Signups */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">User Signups</h3>
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          <div className="h-[140px]">
            {chartsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : charts.userSignups.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.userSignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="#6366F120"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No signups yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Users</h3>
            <Link
              href="/users"
              className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers?.slice(0, 5).map((user) => (
              <div key={user._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-400">{user.role}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Formulations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Formulations</h3>
            <Link
              href="/formulations"
              className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentFormulations?.slice(0, 5).map((f) => (
              <div key={f._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      f.complianceColor === 'Green'
                        ? 'bg-green-500'
                        : f.complianceColor === 'Blue'
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {f.batchName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {f.targetWeightKg}kg • {f.userId?.name}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-gray-600">
                  ₦{(f.totalCost / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
            <Link
              href="/transactions"
              className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions?.slice(0, 5).map((t) => (
              <div key={t._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      t.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <Wallet
                      size={14}
                      className={
                        t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }
                    />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900 truncate max-w-[120px]">
                      {t.description}
                    </p>
                    <p className="text-xs text-gray-400">{t.userId?.name}</p>
                  </div>
                </div>
                <span
                  className={`font-mono text-xs font-medium ${
                    t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.type === 'credit' ? '+' : '-'}₦
                  {(t.amount / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
