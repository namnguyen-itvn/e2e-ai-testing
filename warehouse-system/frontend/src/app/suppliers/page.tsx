import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SuppliersPage() {
  return (
    <DashboardLayout title="Suppliers">
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400" data-testid="suppliers-coming-soon">
        <p className="text-sm">Suppliers module — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
