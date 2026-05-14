import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings">
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400" data-testid="settings-coming-soon">
        <p className="text-sm">Settings — coming soon</p>
      </div>
    </DashboardLayout>
  );
}
