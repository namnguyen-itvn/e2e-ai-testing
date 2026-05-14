import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function UsersPage() {
  return (
    <DashboardLayout title="Users">
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400" data-testid="users-coming-soon">
        <p className="text-sm">Users management — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
