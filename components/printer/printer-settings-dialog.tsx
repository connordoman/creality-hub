"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { usePrinterSettings } from "@/context/printer-settings";
import { isValidPrinterHost } from "@/lib/settings/validation";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";

export function PrinterSettingsDialog() {
  const {
    printerHost,
    isSaving,
    saveError,
    updatePrinterHost,
  } = usePrinterSettings();
  const [open, setOpen] = useState(false);
  const [draftHost, setDraftHost] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraftHost(printerHost ?? "");
      setValidationError(null);
    }
  };

  const handleSave = async () => {
    if (!isValidPrinterHost(draftHost)) {
      setValidationError("Enter a valid IPv4 address or hostname");
      return;
    }

    setValidationError(null);

    try {
      await updatePrinterHost(draftHost.trim());
      setOpen(false);
    } catch {
      // saveError is surfaced below
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <SettingsIcon data-icon="inline-start" />
            Printer
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Printer settings</DialogTitle>
          <DialogDescription>
            Saved on the server and shared across all devices. Update this when
            the printer gets a new IP address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="printer-host">Printer IP or hostname</FieldLabel>
            <input
              id="printer-host"
              name="printer-host"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={draftHost}
              disabled={isSaving}
              placeholder="10.0.0.184"
              className="h-8 w-full border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50"
              onChange={(event) => setDraftHost(event.target.value)}
            />
          </Field>

          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
          {saveError ? (
            <p className="text-sm text-destructive">{saveError.message}</p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isSaving} />}>
            Cancel
          </DialogClose>
          <Button disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
