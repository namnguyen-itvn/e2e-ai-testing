/**
 * FILE: src/components/layout/DashboardLayout.tsx
 * PURPOSE: Layout wrapper cho tất cả trang trong dashboard.
 *
 * GIẢI THÍCH:
 * - Kết hợp Sidebar + Navbar + main content area.
 * - children là nội dung từng trang cụ thể.
 * - Tách layout ra file riêng giúp dễ thay đổi cấu trúc sau này.
 */

'use client';

import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" data-testid="dashboard-layout">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto p-6" data-testid="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
