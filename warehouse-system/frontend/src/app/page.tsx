/**
 * FILE: src/app/page.tsx
 * PURPOSE: Dashboard overview page — trang chính của WMS.
 */

'use client';

import { AlertTriangle, BarChart3, Package, ShoppingCart } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const MOCK_STATS = {
  totalProducts: 248,
  lowStockProducts: 12,
  ordersToday: 34,
  totalWarehouses: 3,
};

const MOCK_MOVEMENTS = [
  { id: '1', product: 'Office Chair', type: 'in', qty: 50, date: '2026-05-14 09:15' },
  { id: '2', product: 'Laptop Stand', type: 'out', qty: 10, date: '2026-05-14 10:30' },
  { id: '3', product: 'USB Hub', type: 'in', qty: 100, date: '2026-05-14 11:00' },
  { id: '4', product: 'Monitor', type: 'out', qty: 5, date: '2026-05-14 13:45' },
  { id: '5', product: 'Keyboard', type: 'adjust', qty: -3, date: '2026-05-14 14:20' },
];

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard">
      {/* KPI Cards */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="kpi-section"
      >
        <KpiCard
          title="Total Products"
          value={MOCK_STATS.totalProducts}
          icon={Package}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          data-testid="kpi-total-products"
        />
        <KpiCard
          title="Low Stock Products"
          value={MOCK_STATS.lowStockProducts}
          icon={AlertTriangle}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-50"
          data-testid="kpi-low-stock"
        />
        <KpiCard
          title="Orders Today"
          value={MOCK_STATS.ordersToday}
          icon={ShoppingCart}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          data-testid="kpi-orders-today"
        />
        <KpiCard
          title="Total Warehouses"
          value={MOCK_STATS.totalWarehouses}
          icon={BarChart3}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          data-testid="kpi-total-warehouses"
        />
      </section>

      {/* Recent Stock Movements */}
      <section className="mt-6" data-testid="section-recent-movements">
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm" data-testid="table-stock-movements">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_MOVEMENTS.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{m.product}</td>
                    <td className="px-5 py-3">
                      <span className={
                        m.type === 'in' ? 'rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700'
                        : m.type === 'out' ? 'rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700'
                        : 'rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700'
                      }>
                        {m.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{m.qty}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{m.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}
