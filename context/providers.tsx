"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { PrinterSettingsProvider } from "@/context/printer-settings";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PrinterSettingsProvider>
          <ServiceWorkerRegistration />
          {children}
          <InstallPrompt />
        </PrinterSettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
