'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  Settings,
  ChevronLeft,
  Menu,
  Database,
  CreditCard,
  Target,
  Tags,
  Fish,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Users', href: '/users' },
  { icon: Tags, label: 'Categories', href: '/categories' },
  { icon: Database, label: 'Ingredients', href: '/ingredients' },
  { icon: Target, label: 'Standards', href: '/standards' },
  { icon: LayoutDashboard, label: 'Templates', href: '/templates' },
  { icon: FlaskConical, label: 'Formulations', href: '/formulations' },
  { icon: Fish, label: 'Farms', href: '/farms' },
  { icon: CreditCard, label: 'Transactions', href: '/transactions' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 md:relative h-screen bg-[#1E1F21] text-gray-400 flex flex-col transition-all duration-300 border-r border-gray-800',
        isCollapsed ? 'md:w-[60px]' : 'md:w-[240px]',
        isOpen
          ? 'w-[240px] translate-x-0'
          : 'w-[240px] -translate-x-full md:translate-x-0',
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-gray-800 shrink-0">
        <div
          className={cn(
            'flex items-center gap-2 overflow-hidden',
            isCollapsed && 'md:justify-center',
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span
            className={cn(
              'font-bold text-gray-100 truncate',
              isCollapsed && 'md:hidden',
            )}
          >
            AquaFeed Admin
          </span>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="ml-auto p-1 md:hidden text-gray-400 hover:text-gray-100"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-gray-800 text-gray-400 hover:text-gray-100',
                isCollapsed && 'md:justify-center md:px-2',
              )}
            >
              <item.icon size={20} />
              <span className={cn(isCollapsed && 'md:hidden')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Collapse Toggle - only visible on desktop */}
      <div className="hidden md:block p-2 border-t border-gray-800 shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 text-gray-400 transition-colors',
            isCollapsed && 'justify-center',
          )}
        >
          {isCollapsed ? (
            <Menu size={20} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
