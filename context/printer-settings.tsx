"use client";

import {
  fetchAppSettings,
  updateAppSettings,
} from "@/lib/settings/client";
import type { AppSettings } from "@/lib/settings/types";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

interface PrinterSettingsContextValue {
  printerHost: string | undefined;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  saveError: Error | null;
  updatePrinterHost: (printerHost: string) => Promise<void>;
}

const PrinterSettingsContext = createContext<
  PrinterSettingsContextValue | undefined
>(undefined);

export function PrinterSettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: updateAppSettings,
    onSuccess: (settings: AppSettings) => {
      queryClient.setQueryData(["app-settings"], settings);
    },
  });

  const updatePrinterHost = useCallback(
    async (printerHost: string) => {
      await saveMutation.mutateAsync({ printerHost });
    },
    [saveMutation],
  );

  const value = useMemo<PrinterSettingsContextValue>(
    () => ({
      printerHost: settingsQuery.data?.printerHost,
      isLoading: settingsQuery.isLoading,
      isSaving: saveMutation.isPending,
      error: settingsQuery.error,
      saveError: saveMutation.error,
      updatePrinterHost,
    }),
    [
      settingsQuery.data?.printerHost,
      settingsQuery.isLoading,
      settingsQuery.error,
      saveMutation.isPending,
      saveMutation.error,
      updatePrinterHost,
    ],
  );

  return (
    <PrinterSettingsContext.Provider value={value}>
      {children}
    </PrinterSettingsContext.Provider>
  );
}

export function usePrinterSettings() {
  const context = useContext(PrinterSettingsContext);

  if (!context) {
    throw new Error("usePrinterSettings must be used within PrinterSettingsProvider");
  }

  return context;
}
