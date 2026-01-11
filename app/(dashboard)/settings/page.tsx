'use client';

import { useAuthStore } from '@/stores/authStore';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your admin account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {user?.name || 'Admin'}
            </p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-1">
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        <p className="text-gray-500 text-sm">
          This admin panel uses OTP-based authentication. Your session will
          expire after 30 days of inactivity.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          System Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Version</p>
            <p className="font-medium text-gray-900">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-500">Environment</p>
            <p className="font-medium text-gray-900">Development</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-gray-500">API Endpoint</p>
            <p className="font-mono text-gray-900 text-xs break-all">
              localhost:5000/api/v1
            </p>
          </div>
          <div>
            <p className="text-gray-500">Database</p>
            <p className="font-medium text-gray-900">MongoDB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
