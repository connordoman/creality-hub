"use client";

import type { PrinterCommandMutationConfig } from "@/lib/creality/printer-commands";
import type { PrinterCommand, PrinterTelemetry } from "@/lib/creality/types";
import { useMutation } from "@tanstack/react-query";

const DEFAULT_CONFIRMATION_TIMEOUT_MS = 15_000;

export interface PrinterCommandContext {
  sendCommand: (command: PrinterCommand) => void;
  sendSetParams: (params: Record<string, unknown>) => void;
  getTelemetry: () => PrinterTelemetry;
  subscribeTelemetry: (
    listener: (telemetry: PrinterTelemetry) => void,
  ) => () => void;
  applyOptimisticPatch: (patch: Partial<PrinterTelemetry>) => void;
  clearOptimisticPatch: () => void;
}

function waitForCommandConfirmation<TVariables>(
  context: PrinterCommandContext,
  config: PrinterCommandMutationConfig<TVariables>,
  variables: TVariables,
): Promise<void> {
  const timeoutMs =
    config.confirmationTimeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    if (config.isConfirmed(context.getTelemetry(), variables)) {
      resolve();
      return;
    }

    let unsubscribe = () => {};

    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out waiting for ${config.mutationKey} confirmation`));
    }, timeoutMs);

    unsubscribe = context.subscribeTelemetry((telemetry) => {
      if (!config.isConfirmed(telemetry, variables)) {
        return;
      }

      clearTimeout(timeoutId);
      unsubscribe();
      resolve();
    });
  });
}

export function usePrinterCommandMutation<TVariables = void>(
  context: PrinterCommandContext,
  config: PrinterCommandMutationConfig<TVariables>,
) {
  return useMutation({
    mutationKey: ["printer-command", config.mutationKey],
    mutationFn: async (variables: TVariables) => {
      context.sendCommand(config.getCommand(variables));
      await waitForCommandConfirmation(context, config, variables);
    },
    onMutate: (variables) => {
      const patch = config.getOptimisticTelemetry(
        variables,
        context.getTelemetry(),
      );
      context.applyOptimisticPatch(patch);
    },
    onError: () => {
      context.clearOptimisticPatch();
    },
  });
}

/** Target value for a command while its mutation is pending. */
export function getPrinterCommandPendingValue<TVariables>(
  isPending: boolean,
  variables: TVariables | undefined,
): TVariables | undefined {
  return isPending ? variables : undefined;
}
