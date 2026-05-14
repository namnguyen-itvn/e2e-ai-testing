/**
 * FILE: src/app/providers.tsx
 * PURPOSE: Tập trung tất cả React providers vào 1 chỗ.
 *
 * GIẢI THÍCH:
 * - QueryClientProvider: cần thiết để React Query hoạt động.
 * - Sonner Toaster: notification toasts.
 * - Tách ra file riêng để layout.tsx sạch hơn.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  // useState để QueryClient không bị recreate mỗi lần re-render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data coi như fresh trong 60 giây → không refetch liên tục
            staleTime: 60 * 1000,
            // Retry 1 lần nếu request fail
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
