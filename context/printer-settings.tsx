"use client";

import {
  fetchAppSettings,
  updateAppSettings,
} from "@/lib/settings/client";
import type {
  AppSettings,
  UpdateAppSettingsRequest,
} from "@/lib/settings/types";
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
  printerName: string | undefined;
  motorStepSizes: number[] | undefined;
  buildVolume: AppSettings["buildVolume"] | undefined;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  saveError: Error | null;
  updateSettings: (updates: UpdateAppSettingsRequest) => Promise<void>;
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

  const updateSettings = useCallback(
    async (updates: UpdateAppSettingsRequest) => {
      await saveMutation.mutateAsync(updates);
    },
    [saveMutation],
  );

  const value = useMemo<PrinterSettingsContextValue>(
    () => ({
      printerHost: settingsQuery.data?.printerHost,
      printerName: settingsQuery.data?.printerName,
      motorStepSizes: settingsQuery.data?.motorStepSizes,
      buildVolume: settingsQuery.data?.buildVolume,
      isLoading: settingsQuery.isLoading,
      isSaving: saveMutation.isPending,
      error: settingsQuery.error,
      saveError: saveMutation.error,
      updateSettings,
    }),
    [
      settingsQuery.data?.printerHost,
      settingsQuery.data?.printerName,
      settingsQuery.data?.motorStepSizes,
      settingsQuery.data?.buildVolume,
      settingsQuery.isLoading,
      settingsQuery.error,
      saveMutation.isPending,
      saveMutation.error,
      updateSettings,
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
