/**
 * FILE: src/components/layout/Sidebar.tsx
 * PURPOSE: Sidebar navigation với active state, collapse, icons.
 *
 * GIẢI THÍCH:
 * - Dùng Zustand để toggle collapsed state.
 * - usePathname() từ Next.js để detect active route.
 * - data-testid cho mỗi menu item để Playwright test navigation.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Box,
  ChevronLeft,
  ClipboardList,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { ROUTES } from '@/constants';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  testId: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: BarChart3, testId: 'nav-dashboard' },
  { label: 'Products', href: ROUTES.PRODUCTS, icon: Box, testId: 'nav-products' },
  { label: 'Inventory', href: ROUTES.INVENTORY, icon: Package, testId: 'nav-inventory' },
  { label: 'Orders', href: ROUTES.ORDERS, icon: ShoppingCart, testId: 'nav-orders' },
  { label: 'Suppliers', href: ROUTES.SUPPLIERS, icon: Truck, testId: 'nav-suppliers' },
  { label: 'Audit Logs', href: ROUTES.AUDIT_LOGS, icon: ScrollText, testId: 'nav-audit-logs' },
  { label: 'Users', href: ROUTES.USERS, icon: Users, testId: 'nav-users' },
  { label: 'Settings', href: ROUTES.SETTINGS, icon: Settings, testId: 'nav-settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'relative flex flex-col bg-gray-900 text-gray-100 transition-all duration-300 ease-in-out',
        isSidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-gray-700 px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-600">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <span className="text-sm font-semibold whitespace-nowrap">
              WMS
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" data-testid="sidebar-nav">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // Highlight active route (exact match for dashboard, prefix match for others)
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-testid={item.testId}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle button */}
      <button
        onClick={toggleSidebar}
        data-testid="btn-toggle-sidebar"
        className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 z-10"
      >
        <ChevronLeft
          className={cn(
            'h-3 w-3 transition-transform duration-300',
            isSidebarCollapsed && 'rotate-180'
          )}
        />
      </button>
    </aside>
  );
}
